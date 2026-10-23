"""Genera el modelo 3D de un producto a partir de su foto con Hunyuan3D-2.1 (IA abierta de
Tencent), usando la demo gratuita de Hugging Face, que corre en sus tarjetas gráficas.

Uso:
    HF_TOKEN=… python fotos_a_3d.py id-producto [id-producto …]

Necesita gradio_client y trimesh (pip install gradio_client trimesh), acceso a huggingface.co
y *.hf.space, y un token de Hugging Face (huggingface.co/settings/tokens, tipo "Read") en la
variable HF_TOKEN: sin token la cuota de tarjeta gráfica es mínima. Cada modelo gasta unos
2 minutos de esa cuota diaria.

El modelo (con textura) queda en tienda-bebes/modelos/<producto>.ia.glb, a tamaño real y
apoyado en el piso para "Ver en tu espacio": con las medidas de herramientas/medidas.json o,
si no hay, con un alto típico por tipo de producto. excel_a_productos.py lo agrega a la ficha.

Usa la foto del primer color que tenga foto (suelen ser de fondo blanco, las que mejor
funcionan). La parte de atrás la estima la IA: revisa cada modelo antes de publicarlo.
"""
import base64
import json
import os
import re
import struct
import sys
import time
import unicodedata
from pathlib import Path

import numpy as np
import trimesh

CARPETA = Path(__file__).resolve().parent.parent
ESPACIO = "tencent/Hunyuan3D-2.1"
# Alto típico (cm) por tipo de producto, para cuando no hay medidas reales. Así en "Ver en tu
# espacio" el producto aparece de un tamaño creíble; la tienda avisa que es aproximado.
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


def productos():
    txt = (CARPETA / "productos.js").read_text(encoding="utf-8")
    cuerpo = txt.split("window.PRODUCTOS = [", 1)[1].rsplit("];", 1)[0].strip().rstrip(",")
    return {p["id"]: p for p in json.loads(f"[{cuerpo}]")}


def medidas_de(p):
    """(alto, ancho, largo en cm —los dos últimos pueden ser None—, ¿son reales?): medidas.json
    o, si no hay, un alto típico por tipo de producto."""
    medidas = json.loads((CARPETA / "herramientas" / "medidas.json").read_text(encoding="utf-8"))
    if p["id"] in medidas:
        m = medidas[p["id"]]
        return m["alto"], m.get("ancho"), m.get("largo"), True
    titulo = "".join(c for c in unicodedata.normalize("NFD", p["nombre"].upper()) if unicodedata.category(c) != "Mn")
    return next((alto for patron, alto in ALTO_TIPICO if re.search(patron, titulo)), 50), None, None, False


def foto_de(p):
    for v in p["variantes"]:
        if v.get("foto"):
            return CARPETA / v["foto"]
    if p.get("fotos"):
        return CARPETA / p["fotos"][0]
    return None


def a_tamano_real(glb, destino, alto, ancho=None, largo=None):
    """Escala el modelo a centímetros reales (los visores usan metros) y lo apoya en el piso, sin
    tocar la malla ni la textura: se agrega un nodo raíz con la escala y el desplazamiento."""
    malla = trimesh.load(glb, force="mesh")
    (x0, y0, z0), (x1, y1, z1) = malla.bounds
    k = alto / 100 / (y1 - y0)
    escala = [k, k, k]
    # Con ancho y largo reales se ajusta la huella en el piso (x = ancho, de frente; z = largo).
    if ancho and largo:
        escala = [ancho / 100 / (x1 - x0), k, largo / 100 / (z1 - z0)]
    mover = [-(x0 + x1) / 2 * escala[0], -y0 * escala[1], -(z0 + z1) / 2 * escala[2]]

    datos = Path(glb).read_bytes()
    largo_json = struct.unpack("<I", datos[12:16])[0]
    gltf = json.loads(datos[20 : 20 + largo_json])
    binario = bytearray(datos[28 + largo_json :])  # tras el JSON: largo, tipo "BIN" y los datos
    # Hunyuan deja la textura como texto (data URI) y marcada PNG aunque es JPG; la realidad
    # aumentada de Google puede cerrarse con eso. Se pasa a los datos binarios, con su tipo real.
    for imagen in gltf.get("images", []):
        if imagen.get("uri", "").startswith("data:"):
            crudo = base64.b64decode(imagen.pop("uri").split(",", 1)[1])
            binario += b"\0" * (-len(binario) % 4)
            gltf.setdefault("bufferViews", []).append({"buffer": 0, "byteOffset": len(binario), "byteLength": len(crudo)})
            binario += crudo
            imagen["bufferView"] = len(gltf["bufferViews"]) - 1
            imagen["mimeType"] = "image/jpeg" if crudo[:3] == b"\xff\xd8\xff" else "image/png"
    binario += b"\0" * (-len(binario) % 4)
    gltf["buffers"][0]["byteLength"] = len(binario)
    # Detalles que el validador de glTF marca: alphaCutoff solo vale con alphaMode MASK, y cada
    # bloque de vértices o índices debe decir qué es.
    for material in gltf.get("materials", []):
        if material.get("alphaMode") != "MASK":
            material.pop("alphaCutoff", None)
    for malla_gltf in gltf.get("meshes", []):
        for primitiva in malla_gltf["primitives"]:
            for acc in primitiva["attributes"].values():
                gltf["bufferViews"][gltf["accessors"][acc]["bufferView"]]["target"] = 34962
            if "indices" in primitiva:
                gltf["bufferViews"][gltf["accessors"][primitiva["indices"]]["bufferView"]]["target"] = 34963
    resto = struct.pack("<I4s", len(binario), b"BIN\0") + bytes(binario)
    escena = gltf["scenes"][gltf.get("scene", 0)]
    gltf["nodes"].append({"name": "tamano-real", "children": escena["nodes"], "scale": escala, "translation": mover})
    escena["nodes"] = [len(gltf["nodes"]) - 1]
    texto = json.dumps(gltf, separators=(",", ":")).encode()
    texto += b" " * (-len(texto) % 4)
    cuerpo = struct.pack("<I4s", len(texto), b"JSON") + texto + resto
    Path(destino).write_bytes(struct.pack("<4sII", b"glTF", 2, 12 + len(cuerpo)) + cuerpo)


def agregar_normales(glb):
    """Hunyuan no guarda las normales (hacia dónde mira cada punto de la malla). El visor de
    realidad aumentada de Google ("Ver en tu espacio") puede cerrarse sin ellas: se calculan
    y se agregan al archivo, sin tocar nada más."""
    datos = Path(glb).read_bytes()
    largo_json = struct.unpack("<I", datos[12:16])[0]
    gltf = json.loads(datos[20 : 20 + largo_json])
    binario = bytearray(datos[28 + largo_json :])
    def leer(i, tipo, ancho):
        acc = gltf["accessors"][i]
        vista = gltf["bufferViews"][acc["bufferView"]]
        inicio = vista.get("byteOffset", 0) + acc.get("byteOffset", 0)
        cuantos = acc["count"] * {"SCALAR": 1, "VEC2": 2, "VEC3": 3}[acc["type"]]
        return np.frombuffer(binario, tipo, cuantos, inicio).reshape(-1, ancho).copy()

    cambio = False
    for malla_gltf in gltf["meshes"]:
        for primitiva in malla_gltf["primitives"]:
            if "NORMAL" in primitiva["attributes"]:
                continue
            # Con los puntos tal como están en el archivo (sin la escala del nodo raíz).
            puntos = leer(primitiva["attributes"]["POSITION"], "<f4", 3)
            tipo = {5121: "<u1", 5123: "<u2", 5125: "<u4"}[gltf["accessors"][primitiva["indices"]]["componentType"]]
            caras = leer(primitiva["indices"], tipo, 3)
            cuantos = len(puntos)
            malla = trimesh.Trimesh(puntos, caras.astype(np.int64), process=False)
            normales = np.ascontiguousarray(malla.vertex_normals, dtype="<f4")
            binario += b"\0" * (-len(binario) % 4)
            gltf["bufferViews"].append({"buffer": 0, "byteOffset": len(binario), "byteLength": normales.nbytes, "target": 34962})
            binario += normales.tobytes()
            gltf["accessors"].append({"bufferView": len(gltf["bufferViews"]) - 1, "componentType": 5126, "count": cuantos, "type": "VEC3"})
            primitiva["attributes"]["NORMAL"] = len(gltf["accessors"]) - 1
            cambio = True
    if not cambio:
        return
    binario += b"\0" * (-len(binario) % 4)
    gltf["buffers"][0]["byteLength"] = len(binario)
    texto = json.dumps(gltf, separators=(",", ":")).encode()
    texto += b" " * (-len(texto) % 4)
    cuerpo = struct.pack("<I4s", len(texto), b"JSON") + texto + struct.pack("<I4s", len(binario), b"BIN\0") + bytes(binario)
    Path(glb).write_bytes(struct.pack("<4sII", b"glTF", 2, 12 + len(cuerpo)) + cuerpo)


def main(ids):
    from gradio_client import Client, handle_file

    if not os.environ.get("HF_TOKEN"):
        print("Aviso: sin HF_TOKEN la cuota gratuita alcanza para muy poco.")
    cliente = Client(ESPACIO, verbose=False, token=os.environ.get("HF_TOKEN"))
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
        try:
            r = cliente.predict(
                image=handle_file(str(foto)), mv_image_front=None, mv_image_back=None, mv_image_left=None,
                mv_image_right=None, steps=30, guidance_scale=5.0, seed=1234, octree_resolution=256,
                check_box_rembg=True, num_chunks=8000, randomize_seed=False, api_name="/generation_all",
            )
        except Exception as e:  # cuota agotada, demo caída…
            print(f"{pid}: no se pudo generar: {e}")
            continue
        con_textura = r[1]["value"] if isinstance(r[1], dict) else r[1]
        alto, ancho, largo, real = medidas_de(p)
        destino = salida / f"{pid}.ia.glb"
        a_tamano_real(con_textura, destino, alto, ancho, largo)
        agregar_normales(destino)
        (salida / f"{pid}.ia.json").write_text(json.dumps({"alto_cm": alto, "medida_real": real, "ia": ESPACIO}), encoding="utf-8")
        print(f"{pid}: {destino.stat().st_size // 1024} KB, {time.time() - inicio:.0f} s")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])
