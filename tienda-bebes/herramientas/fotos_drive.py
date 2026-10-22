"""Baja las fotos de la carpeta de Drive del cliente y las une con los productos.

Uso (después de excel_a_productos.py):
    python3 tienda-bebes/herramientas/fotos_drive.py ID_DE_LA_CARPETA [carpeta_cache]
    python3 tienda-bebes/herramientas/excel_a_productos.py ruta/al/catalogo.xlsx

La carpeta de Drive debe estar compartida como "cualquier persona con el enlace".
Se espera esta organización:  CATEGORIA / NOMBRE DEL PRODUCTO / fotos…
y, opcionalmente, una subcarpeta o foto con el SKU (BW-…) para la foto de cada color.

Las fotos quedan en tienda-bebes/img/p/<producto>/ en WebP (grande y miniatura -p) y la
lista en tienda-bebes/herramientas/fotos.json, que excel_a_productos.py usa al generar
productos.js. Lo que no se pudo emparejar se agrega a pendientes-catalogo.md.

Para ver el producto en 3D, dentro de la carpeta del producto en Drive:
  - una subcarpeta "360" con las fotos tomadas alrededor del producto, en orden (giro de 360°);
  - y/o un archivo .glb con el modelo 3D escaneado (por ejemplo, exportado de Polycam o Luma AI).
"""
import html
import io
import json
import re
import sys
import time
import unicodedata
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageOps

CARPETA = Path(__file__).resolve().parent.parent
SALIDA = CARPETA / "img" / "p"
MAX_GALERIA = 6  # fotos por producto, además de la de cada color
MAX_GIRO = 72  # cuadros del giro de 360°; si hay más, se toman repartidos
GIRO = 900  # px del lado mayor de cada cuadro del giro
MAX_MODELO_MB = 20
GRANDE, MINI = 1000, 400  # px del lado mayor
IMAGEN = (".jpeg", ".jpg", ".png", ".webp", "")  # algunas fotos vienen sin extensión
SKU = re.compile(r"BW-\d+", re.I)


def norm(s):
    s = "".join(c for c in unicodedata.normalize("NFD", s.upper()) if unicodedata.category(c) != "Mn")
    return re.sub(r"[^A-Z0-9]+", " ", s).strip()


def pedir(url, intentos=4):
    for i in range(intentos):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            return urllib.request.urlopen(req, timeout=60).read()
        except Exception:
            if i == intentos - 1:
                raise
            time.sleep(2**i)


def listar(fid, ruta=()):
    pagina = pedir(f"https://drive.google.com/embeddedfolderview?id={fid}").decode("utf-8")
    entradas = re.findall(
        r'<div class="flip-entry" id="entry-([^"]+)".*?<a href="([^"]+)".*?<div class="flip-entry-title">(.*?)</div>', pagina, re.S
    )
    archivos = []
    for id_, href, nombre in entradas:
        nombre = html.unescape(nombre)
        if "/folders/" in href:
            archivos += listar(id_, ruta + (nombre,))
        else:
            archivos.append({"id": id_, "ruta": ruta, "nombre": nombre})
    return archivos


def productos_actuales():
    txt = (CARPETA / "productos.js").read_text(encoding="utf-8")
    cuerpo = txt.split("window.PRODUCTOS = [", 1)[1].rsplit("];", 1)[0].strip().rstrip(",")
    return json.loads(f"[{cuerpo}]")


def orden_natural(nombre):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", nombre)]


def es_giro(a):
    return any(norm(parte) in ("360", "GIRO", "GIRO 360") for parte in a["ruta"][2:])


def emparejar(archivos, productos):
    """Devuelve {id_producto: {"galeria": [archivo…], "sku": {SKU: archivo}, "giro": [archivo…], "modelo": archivo}}
    y lo que sobró."""
    sku_a_prod = {v["sku"]: p["id"] for p in productos for v in p["variantes"]}
    titulo_a_prod = {norm(p["nombre"]): p for p in productos}
    fotos = [a for a in archivos if Path(a["nombre"]).suffix.lower() in IMAGEN and len(a["ruta"]) >= 2]
    sku_de = lambda a: (SKU.search("/".join(a["ruta"]) + "/" + a["nombre"]) or [None])[0]

    # Carpeta de producto (CATEGORIA/PRODUCTO) -> productos de los SKU que tiene adentro.
    por_carpeta = defaultdict(set)
    for a in fotos:
        s = sku_de(a)
        if s and s.upper() in sku_a_prod:
            por_carpeta[a["ruta"][:2]].add(sku_a_prod[s.upper()])

    def producto_de_carpeta(c):
        if "TEST" in norm(c[1]).split():
            return None
        ids = por_carpeta.get(c)
        if ids:
            return next(iter(ids)) if len(ids) == 1 else None  # mezcla varios productos: solo fotos por SKU
        t = norm(c[1])
        if t in titulo_a_prod:
            return titulo_a_prod[t]["id"]
        for p in productos:  # "PRODUCTO COLOR"
            base = norm(p["nombre"])
            if t.startswith(base + " ") and any(norm(v["color"]) == t[len(base):].strip() for v in p["variantes"]):
                return p["id"]
        return None

    res = defaultdict(lambda: {"galeria": [], "sku": {}, "giro": [], "modelo": None})
    sobra = defaultdict(int)
    skus_sin_producto = set()

    # 3D: subcarpeta "360" y archivos .glb dentro de la carpeta del producto.
    for a in archivos:
        if len(a["ruta"]) < 2:
            continue
        es_modelo = Path(a["nombre"]).suffix.lower() == ".glb"
        if not (es_modelo or (es_giro(a) and a in fotos)):
            continue
        pid = producto_de_carpeta(a["ruta"][:2])
        if not pid:
            sobra["/".join(a["ruta"][:2])] += 1
        elif es_modelo:
            res[pid]["modelo"] = res[pid]["modelo"] or a
        else:
            res[pid]["giro"].append(a)
    for r in res.values():
        r["giro"].sort(key=lambda a: orden_natural(a["nombre"]))
        if len(r["giro"]) > MAX_GIRO:
            paso = len(r["giro"]) / MAX_GIRO
            r["giro"] = [r["giro"][int(i * paso)] for i in range(MAX_GIRO)]

    for a in sorted((a for a in fotos if not es_giro(a)), key=lambda a: (a["ruta"], not a["nombre"].startswith("1."), a["nombre"])):
        c = a["ruta"][:2]
        s = sku_de(a)
        if s and "TEST" not in norm(c[1]).split():
            s = s.upper()
            if s in sku_a_prod:
                res[sku_a_prod[s]]["sku"].setdefault(s, a)
            else:
                skus_sin_producto.add(s)
            continue
        pid = producto_de_carpeta(c)
        if pid:
            res[pid]["galeria"].append(a)
        else:
            sobra["/".join(c)] += 1
    for r in res.values():
        r["galeria"] = r["galeria"][:MAX_GALERIA]
    return res, sobra, skus_sin_producto


def convertir(datos, destino, tamanos=((GRANDE, "", 78), (MINI, "-p", 72))):
    im = Image.open(io.BytesIO(datos))
    im = ImageOps.exif_transpose(im).convert("RGB")
    for lado, sufijo, calidad in tamanos:
        copia = im.copy()
        copia.thumbnail((lado, lado))
        copia.save(destino.with_name(destino.stem + sufijo + ".webp"), "WEBP", quality=calidad, method=6)


def huella(ruta):
    """Huella simple de la imagen para encontrar la misma foto en dos productos."""
    im = Image.open(ruta).convert("L").resize((12, 12))
    px = im.tobytes()
    media = sum(px) / len(px)
    return bytes(x > media for x in px)


def fotos_de_otro_producto(salida):
    """Fotos de galería que son la foto (por SKU) de otro producto: error en la carpeta de Drive."""
    de_sku = {}
    for s, r in salida["sku"].items():
        de_sku.setdefault(huella(CARPETA / r.replace(".webp", "-p.webp")), r.split("/")[2])
    malas = []
    for pid, rutas in salida["producto"].items():
        for r in list(rutas):
            otro = de_sku.get(huella(CARPETA / r.replace(".webp", "-p.webp")))
            if otro and otro != pid:
                rutas.remove(r)
                for f in (r, r.replace(".webp", "-p.webp")):
                    (CARPETA / f).unlink(missing_ok=True)
                malas.append(f"La carpeta de {pid} tiene una foto de {otro} (se quitó)")
    return malas


def main(carpeta_id, cache):
    cache = Path(cache)
    cache.mkdir(parents=True, exist_ok=True)
    print("Listando Drive…")
    archivos = listar(carpeta_id)
    productos = productos_actuales()
    res, sobra, skus_sin_producto = emparejar(archivos, productos)

    trabajos = []  # (archivo, ruta destino sin extensión, tamaños o None para copiar tal cual)
    salida = {"sku": {}, "producto": {}, "giro": {}, "modelo": {}}
    for pid, r in res.items():
        for i, a in enumerate(r["giro"], 1):
            trabajos.append((a, SALIDA / pid / "giro" / f"{i:02d}", ((GIRO, "", 74),)))
        if r["giro"]:
            salida["giro"][pid] = [f"img/p/{pid}/giro/{i:02d}.webp" for i in range(1, len(r["giro"]) + 1)]
        if r["modelo"]:
            trabajos.append((r["modelo"], CARPETA / "modelos" / pid, None))
            salida["modelo"][pid] = f"modelos/{pid}.glb"
        rutas = []
        for i, a in enumerate(r["galeria"], 1):
            trabajos.append((a, SALIDA / pid / str(i), None))
            rutas.append(f"img/p/{pid}/{i}.webp")
        for s, a in r["sku"].items():
            trabajos.append((a, SALIDA / pid / s.lower(), None))
            salida["sku"][s] = f"img/p/{pid}/{s.lower()}.webp"
        salida["producto"][pid] = rutas

    def hacer(t):
        a, destino, tamanos = t
        es_modelo = destino.parent.name == "modelos"
        final = destino.with_suffix(".glb" if es_modelo else ".webp")
        if final.exists():
            return None
        crudo = cache / a["id"]
        if not crudo.exists():
            crudo.write_bytes(pedir(f"https://drive.usercontent.google.com/download?id={a['id']}&export=download"))
        destino.parent.mkdir(parents=True, exist_ok=True)
        try:
            if es_modelo:
                datos = crudo.read_bytes()
                if datos[:4] != b"glTF":
                    return f"{'/'.join(a['ruta'])}/{a['nombre']}: no es un modelo .glb válido"
                if len(datos) > MAX_MODELO_MB * 1024 * 1024:
                    return f"{'/'.join(a['ruta'])}/{a['nombre']}: pesa {len(datos) // 2**20} MB (máximo {MAX_MODELO_MB}); expórtalo más liviano"
                final.write_bytes(datos)
            elif tamanos:
                convertir(crudo.read_bytes(), destino, tamanos)
            else:
                convertir(crudo.read_bytes(), destino)
        except Exception as e:
            return f"{'/'.join(a['ruta'])}/{a['nombre']}: {e}"
        return None

    print(f"Procesando {len(trabajos)} fotos…")
    with ThreadPoolExecutor(8) as ex:
        errores = [e for e in ex.map(hacer, trabajos) if e]
    # Quita de la lista las que no se pudieron convertir.
    existe = lambda r: (CARPETA / r).exists()
    salida["sku"] = {s: r for s, r in salida["sku"].items() if existe(r)}
    salida["producto"] = {p: [r for r in rs if existe(r)] for p, rs in salida["producto"].items()}
    salida["giro"] = {p: rs for p, rs in salida["giro"].items() if all(existe(r) for r in rs)}
    salida["modelo"] = {p: r for p, r in salida["modelo"].items() if existe(r)}
    salida["no_emparejadas"] = [f"{c} ({n} fotos)" for c, n in sorted(sobra.items())]
    salida["skus_sin_producto"] = sorted(skus_sin_producto)
    salida["errores"] = errores + fotos_de_otro_producto(salida)
    (CARPETA / "herramientas" / "fotos.json").write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")
    con_foto = {p for p, rs in salida["producto"].items() if rs} | {
        p["id"] for p in productos for v in p["variantes"] if v["sku"] in salida["sku"]
    }
    print(f"{len(con_foto)} de {len(productos)} productos con foto · {len(salida['giro'])} con giro 360° · "
          f"{len(salida['modelo'])} con modelo 3D · {len(errores)} errores · "
          f"{len(sobra)} carpetas sin emparejar. Ahora corre excel_a_productos.py")


if __name__ == "__main__":
    if len(sys.argv) not in (2, 3):
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) == 3 else "/tmp/fotos-drive")
