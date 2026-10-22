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
import sys
import time
from pathlib import Path

import numpy as np
import torch
import trimesh
from PIL import Image

CARPETA = Path(__file__).resolve().parent.parent
RESOLUCION = 256  # detalle de la malla
MAX_CARAS = 40000  # para que el archivo pese poco en el celular


def productos():
    txt = (CARPETA / "productos.js").read_text(encoding="utf-8")
    cuerpo = txt.split("window.PRODUCTOS = [", 1)[1].rsplit("];", 1)[0].strip().rstrip(",")
    return {p["id"]: p for p in json.loads(f"[{cuerpo}]")}


def foto_de(p):
    for v in p["variantes"]:
        if v.get("foto"):
            return CARPETA / v["foto"]
    if p.get("fotos"):
        return CARPETA / p["fotos"][0]
    return None


def main(ruta_triposr, ruta_pesos, ids):
    sys.path.insert(0, str(Path(ruta_triposr).resolve()))
    import rembg
    from tsr.system import TSR
    from tsr.utils import remove_background, resize_foreground

    torch.set_num_threads(max(1, torch.get_num_threads()))
    modelo = TSR.from_pretrained(ruta_pesos, config_name="config.yaml", weight_name="model.ckpt")
    modelo.renderer.set_chunk_size(8192)
    modelo.to("cpu")
    sesion = rembg.new_session()
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
        malla.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [0, 1, 0]))
        malla.fix_normals()
        if len(malla.faces) > MAX_CARAS:
            colores = malla.visual.vertex_colors
            reducida = malla.simplify_quadric_decimation(face_count=MAX_CARAS)
            # La simplificación pierde los colores: se le pasan los del vértice más cercano.
            _, cercano = trimesh.proximity.ProximityQuery(malla).vertex(reducida.vertices)
            reducida.visual.vertex_colors = colores[cercano]
            malla = reducida
        destino = salida / f"{pid}.ia.glb"
        malla.export(destino)
        print(f"{pid}: {len(malla.faces)} caras, {destino.stat().st_size // 1024} KB, {time.time() - inicio:.0f} s")


if __name__ == "__main__":
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2], sys.argv[3:])
