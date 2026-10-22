"""Genera el modelo 3D de un producto a partir de su foto, con TripoSR (IA abierta, corre sin
tarjeta gráfica). El modelo queda en tienda-bebes/modelos/<producto>.ia.glb y
excel_a_productos.py lo agrega a la ficha ("Ver en 3D"), marcado como generado con IA.

Uso:
    python fotos_a_3d.py RUTA_TRIPOSR RUTA_PESOS id-producto [id-producto …]

RUTA_TRIPOSR: copia de https://github.com/VAST-AI-Research/TripoSR (con torchmcubes cambiado
por scikit-image si no se puede compilar). RUTA_PESOS: carpeta con config.yaml y model.ckpt de
https://huggingface.co/stabilityai/TripoSR. Necesita torch, transformers, rembg, trimesh,
scikit-image y fast-simplification.

Usa la foto del primer color que tenga foto (suelen ser las de fondo blanco, que son las que
mejor funcionan). La parte de atrás del producto la estima la IA: revisa cada modelo antes de
publicarlo.
"""
import json
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
import torch
import trimesh
from PIL import Image

CARPETA = Path(__file__).resolve().parent.parent
# Alto típico (cm) por tipo de producto, para cuando no hay medidas reales. Así en "Verlo en tu
# casa" el producto aparece de un tamaño creíble; la tienda avisa que es aproximado.
ALTO_TIPICO = [
    (r"SILLA (PARA )?CARRO|SILLA CARRO", 65),
    (r"CARRO|MOTO|CUATRIMOTO|VEHICULO|JEEP|AUTOMOVIL", 55),
    (r"TRICI", 60),
    (r"BICI", 65),
    (r"PATINETA|SCOOTER", 70),
    (r"COCHE", 105),
    (r"CORRAL|CUNA|COLECHO", 80),
    (r"COMEDOR", 100),
    (r"MECEDORA|ROCKER|COLUMPIO", 65),
    (r"CAMINADOR|ANDADERA|ANDADOR", 55),
    (r"BANERA", 25),
    (r"BACIN", 35),
    (r"GIMNASIO", 45),
    (r"MONTABLE|CABALLITO", 50),
    (r"PANALERA", 40),
]
RESOLUCION = 256  # detalle de la malla
MAX_CARAS = 40000  # para que el archivo pese poco en el celular


def productos():
    txt = (CARPETA / "productos.js").read_text(encoding="utf-8")
    cuerpo = txt.split("window.PRODUCTOS = [", 1)[1].rsplit("];", 1)[0].strip().rstrip(",")
    return {p["id"]: p for p in json.loads(f"[{cuerpo}]")}


def medidas_de(p):
    """(alto, ancho, largo en cm —los dos últimos pueden ser None—, ¿son reales?): medidas.json
    o, si no hay, un alto típico por tipo de producto."""
    import re
    import unicodedata

    medidas = json.loads((CARPETA / "herramientas" / "medidas.json").read_text(encoding="utf-8"))
    if p["id"] in medidas:
        m = medidas[p["id"]]
        return m["alto"], m.get("ancho"), m.get("largo"), True
    titulo = "".join(c for c in unicodedata.normalize("NFD", p["nombre"].upper()) if unicodedata.category(c) != "Mn")
    return next((alto for patron, alto in ALTO_TIPICO if re.search(patron, titulo)), 50), None, None, False


def exportar_glb(malla, destino):
    """GLB con material y normales: la realidad aumentada de Google (Scene Viewer) se cierra con
    modelos que solo traen colores por vértice."""
    import struct

    # Fuera triángulos de área cero y vértices sueltos: dejan normales de largo 0, que son un error.
    malla.update_faces(malla.nondegenerate_faces())
    malla.remove_unreferenced_vertices()
    normales = malla.vertex_normals.copy()
    largo = np.linalg.norm(normales, axis=1)
    normales[largo < 1e-6] = [0, 1, 0]
    malla.vertex_normals = normales / np.linalg.norm(normales, axis=1, keepdims=True)
    datos = trimesh.exchange.gltf.export_glb(trimesh.Scene(malla), include_normals=True)
    # Se agrega un material mate (los colores siguen saliendo de los vértices) y el tipo de cada
    # bloque de datos, que algunos visores exigen. El GLB es: cabecera de 12 bytes + JSON + binario.
    largo_json = struct.unpack("<I", datos[12:16])[0]
    gltf = json.loads(datos[20 : 20 + largo_json])
    binario = datos[20 + largo_json :]
    gltf["materials"] = [
        {"name": "producto", "doubleSided": True,
         "pbrMetallicRoughness": {"baseColorFactor": [1, 1, 1, 1], "metallicFactor": 0, "roughnessFactor": 0.85}}
    ]
    for malla_gltf in gltf["meshes"]:
        for primitiva in malla_gltf["primitives"]:
            primitiva["material"] = 0
            for acc in primitiva["attributes"].values():
                gltf["bufferViews"][gltf["accessors"][acc]["bufferView"]]["target"] = 34962  # vértices
            if "indices" in primitiva:
                gltf["bufferViews"][gltf["accessors"][primitiva["indices"]]["bufferView"]]["target"] = 34963
    texto = json.dumps(gltf, separators=(",", ":")).encode()
    texto += b" " * (-len(texto) % 4)
    cuerpo = struct.pack("<I4s", len(texto), b"JSON") + texto + binario
    destino.write_bytes(struct.pack("<4sII", b"glTF", 2, 12 + len(cuerpo)) + cuerpo)


def foto_de(p):
    for v in p["variantes"]:
        if v.get("foto"):
            return CARPETA / v["foto"]
    if p.get("fotos"):
        return CARPETA / p["fotos"][0]
    return None


def main(ruta_triposr, ruta_pesos, ids):
    # Cada producto en un proceso aparte: TripoSR no suelta la memoria entre uno y otro y con
    # 16 GB de RAM el segundo ya no cabe.
    if len(ids) > 1:
        for pid in ids:
            subprocess.run([sys.executable, __file__, ruta_triposr, ruta_pesos, pid], check=False)
        return
    sys.path.insert(0, str(Path(ruta_triposr).resolve()))
    import rembg
    from tsr.system import TSR
    from tsr.utils import remove_background, resize_foreground

    torch.set_num_threads(max(1, torch.get_num_threads()))
    modelo = TSR.from_pretrained(ruta_pesos, config_name="config.yaml", weight_name="model.ckpt")
    modelo.renderer.set_chunk_size(8192)
    modelo.to("cpu")
    sesion = rembg.new_session("isnet-general-use")  # recorta el fondo; más liviano que el de por defecto
    catalogo = productos()
    salida = CARPETA / "modelos"
    salida.mkdir(exist_ok=True)

    for pid in ids:
        p = catalogo.get(pid)
        foto = p and foto_de(p)
        if not foto:
            print(f"{pid}: no existe o no tiene foto")
            continue
        inicio = time.time()
        # Igual que el ejemplo de TripoSR: se quita el fondo y el producto se centra sobre gris.
        imagen = remove_background(Image.open(foto).convert("RGB"), sesion)
        imagen = resize_foreground(imagen, 0.85)
        arr = np.array(imagen).astype(np.float32) / 255.0
        arr = arr[:, :, :3] * arr[:, :, 3:4] + (1 - arr[:, :, 3:4]) * 0.5
        imagen = Image.fromarray((arr * 255.0).astype(np.uint8))

        with torch.no_grad():
            codigos = modelo([imagen], device="cpu")
        malla = modelo.extract_mesh(codigos, True, resolution=RESOLUCION)[0]

        # TripoSR deja el modelo acostado (z hacia arriba); los visores 3D usan y hacia arriba.
        malla.apply_transform(trimesh.transformations.rotation_matrix(-np.pi / 2, [1, 0, 0]))
        malla.apply_transform(trimesh.transformations.rotation_matrix(-np.pi / 2, [0, 1, 0]))  # frente hacia la cámara
        malla.fix_normals()
        # Tamaño real (en metros, la unidad de los visores 3D) y apoyado en el piso.
        alto, ancho, largo, real = medidas_de(p)
        malla.apply_scale(alto / 100 / malla.extents[1])
        # Con ancho y largo reales se ajusta la huella en el piso (x = ancho, de frente; z = largo).
        if ancho and largo:
            malla.apply_transform(np.diag([ancho / 100 / malla.extents[0], 1, largo / 100 / malla.extents[2], 1]))
        malla.apply_translation([-malla.bounds.mean(axis=0)[0], -malla.bounds[0][1], -malla.bounds.mean(axis=0)[2]])
        if len(malla.faces) > MAX_CARAS:
            colores = malla.visual.vertex_colors
            reducida = malla.simplify_quadric_decimation(face_count=MAX_CARAS)
            # La simplificación pierde los colores: se le pasan los del vértice más cercano.
            _, cercano = trimesh.proximity.ProximityQuery(malla).vertex(reducida.vertices)
            reducida.visual.vertex_colors = colores[cercano]
            malla = reducida
        destino = salida / f"{pid}.ia.glb"
        exportar_glb(malla, destino)
        (salida / f"{pid}.ia.json").write_text(json.dumps({"alto_cm": alto, "medida_real": real}), encoding="utf-8")
        print(f"{pid}: {len(malla.faces)} caras, {destino.stat().st_size // 1024} KB, {time.time() - inicio:.0f} s")


if __name__ == "__main__":
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2], sys.argv[3:])
