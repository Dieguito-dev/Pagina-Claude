"""Convierte el Excel de catálogo del cliente en productos.js.

Uso:
    python3 tienda-bebes/herramientas/excel_a_productos.py ruta/al/catalogo.xlsx

Lee la hoja "plantilla_atributos_productos" (columnas SKU*, Titulo*, Categoria*, Precio*,
Stock*, DescripcionBreve*, Color). Las filas con el mismo título se juntan en un solo
producto con sus colores. Escribe tienda-bebes/productos.js y una lista de lo que hay
que corregir en el Excel en tienda-bebes/pendientes-catalogo.md.
"""
import json
import re
import sys
import unicodedata
from collections import Counter, OrderedDict
from pathlib import Path

import openpyxl

HOJA = "plantilla_atributos_productos"
CARPETA = Path(__file__).resolve().parent.parent
# Filas de ejemplo que trae la plantilla (no son productos reales).
EJEMPLOS = {"BW-2025", "BW-0002"}

# id, nombre, emoji, edad típica en meses (desde, hasta) para que el asistente recomiende.
CATEGORIAS = [
    ("promos", "Promos", "🏷️", None),
    ("alimentacion", "Alimentación", "🍼", (0, 36)),
    ("baneras", "Bañeras", "🛁", (0, 24)),
    ("bano", "Baño", "🧴", (0, 48)),
    ("bicicletas", "Bicicletas", "🚲", (24, 96)),
    ("caminadores", "Caminadores", "👣", (6, 18)),
    ("coches", "Coches", "🚼", (0, 48)),
    ("coche-mellicero", "Coche mellicero", "👶", (0, 36)),
    ("comedores", "Comedores", "🥣", (6, 48)),
    ("corrales", "Corrales para bebé", "🧸", (0, 36)),
    ("cuidado-personal", "Cuidado personal", "🧼", (0, 36)),
    ("estimulacion", "Estimulación", "🧩", (0, 24)),
    ("lactancia", "Lactancia", "🤱", (-9, 12)),
    ("mecedoras", "Mecedoras", "🌙", (0, 24)),
    ("montables", "Montables", "🐴", (12, 72)),
    ("paseador", "Paseador", "🌳", (6, 48)),
    ("panalera", "Pañalera", "👜", (-9, 36)),
    ("sillas-carro", "Sillas para carro", "🚗", (0, 72)),
    ("triciclos", "Triciclos", "🛺", (12, 60)),
    ("juguetes", "Juguetes", "🪀", (6, 72)),
    ("carros-electricos", "Carros eléctricos", "🏎️", (24, 96)),
    ("otros", "Otros", "⭐", None),
]
EDAD = {c[0]: c[3] for c in CATEGORIAS}

# Cómo viene escrita la categoría en el Excel (sin tildes, en mayúscula) -> id.
ALIAS = {
    "ALIMENTACION": "alimentacion",
    "BANERAS": "baneras",
    "BANO": "bano",
    "BICICLETAS": "bicicletas",
    "CAMINADORES": "caminadores",
    "CARROS ELECTRICOS": "carros-electricos",
    "CUIDADO PERSONAL": "cuidado-personal",
    "CIUDADO PERSONAL": "cuidado-personal",
    "COCHE MELLICERO": "coche-mellicero",
    "COCHES": "coches",
    "COMEDORES": "comedores",
    "CORRALES PARA BEBE": "corrales",
    "ESTIMULACION": "estimulacion",
    "JUGUETES": "juguetes",
    "LACTANCIA": "lactancia",
    "MECEDORA": "mecedoras",
    "MECEDORAS": "mecedoras",
    "MONTABLES": "montables",
    "OTROS": "otros",
    "PASEADOR": "paseador",
    "PASEADORES": "paseador",
    "PASEDORES": "paseador",
    "PANALERA": "panalera",
    "PANALERAS": "panalera",
    "PROMOS": "promos",
    "SILLAS PARA CARRO": "sillas-carro",
    "TRICICLOS": "triciclos",
}


# Edad típica (meses) por tipo de producto, según palabras del título. Va antes que la de la categoría.
EDAD_POR_TIPO = [
    (r"\b(SILLA (PARA )?CARRO|SILLA CARRO|PORTABEBE)", (0, 48)),
    (r"\b(CARRO|MOTO|CUATRIMOTO|VEHICULO|JEEP|AUTOMOVIL)\b", (36, 96)),
    (r"\bPATINETA|SCOOTER\b", (36, 96)),
    (r"\bBICI", (30, 96)),
    (r"\bTRICI|TRCICLO", (12, 60)),
    (r"\b(MONTABLE|CABALLITO|BALANCIN|PUSH CAR|GO CAR)\b", (12, 48)),
    (r"\b(CAMINADOR|ANDADERA|ANDADOR|PASEADOR EMPUJADOR)", (6, 18)),
    (r"\b(GIMNASIO|MOVIL MUSICAL|TAPETE|ALFOMBRA)", (0, 12)),
    (r"\b(SONAJERO|MORDEDOR|CHUPO|TETINA)", (0, 12)),
    (r"\b(EXTRACTOR|ESTRACTOR|EXTRACTRO|RECOLECTORA|COJIN DE LACT|LACTANCIA|PEZONERA)", (-9, 12)),
    (r"\b(ESTERILIZ|ESTERIZ|CALENTADOR)", (-9, 12)),
    (r"\b(BIBERON|TETERO)", (0, 18)),
    (r"\b(COMEDOR|SILLA DE COMER|PROCESADOR|VAJILLA|VASO|PLATO)", (6, 36)),
    (r"\b(BACIN|REDUCTOR|ESCALERA)", (18, 48)),
    (r"\b(BANERA|BANO|DUCHA|TERMOMETRO)", (0, 18)),
    (r"\b(MECEDORA|ROCKER|COLUMPIO)", (0, 12)),
    (r"\b(CORRAL|CUNA|COLECHO|MOISES|NIDO)", (0, 24)),
    (r"\bCOCHE", (0, 36)),
    (r"\b(COCINA|OLLA|DOCTOR|CASTILLO|MUNECA|PISTA|LICUADORA|REGISTRADORA|DINOSAURIO|TABLET)", (36, 96)),
    (r"\b(PANALERA|PANITOS|COBIJA|FORRO|MOSQUITERO)", (-9, 36)),
]


def edad_de(titulo, desc, cat):
    """Rango de edad en meses: lo que diga la descripción, si no el tipo de producto, si no la categoría."""
    t = sin_tildes(titulo).upper()
    rango = next((list(r) for patron, r in EDAD_POR_TIPO if re.search(patron, t)), None)
    rango = rango or (list(EDAD[cat]) if EDAD.get(cat) else None)
    d = sin_tildes(desc).lower()
    a_meses = lambda n, u: int(float(n.replace(",", ".")) * (12 if u.startswith("a") else 1))
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:a|-|hasta)\s*(\d+(?:[.,]\d+)?)\s*(mes|ano)", d)
    if m:
        return [a_meses(m.group(1), m.group(3)), a_meses(m.group(2), m.group(3))]
    desde = re.search(r"desde (?:los |el )?(\d+)\s*(mes|ano)", d)
    hasta = re.search(r"hasta (?:los )?(\d+)\s*(mes|ano)", d)
    if "recien nacid" in d or desde or hasta:
        rango = rango or [0, 36]
        if "recien nacid" in d:
            rango[0] = 0
        if desde:
            rango[0] = a_meses(desde.group(1), desde.group(2))
        if hasta:
            rango[1] = a_meses(hasta.group(1), hasta.group(2))
        if rango[1] < rango[0]:
            rango[1] = rango[0] + 12
    return rango


def sin_tildes(s):
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def espacios(s):
    return re.sub(r"\s+", " ", str(s or "")).strip()


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", sin_tildes(s).lower()).strip("-")


def limpiar_descripcion(s):
    if not s:
        return ""
    s = str(s).replace("\r\n", "\n").replace("\r", "\n")
    # Quita íconos de uso privado que no se ven en ningún celular.
    s = "".join(c for c in s if not (0xE000 <= ord(c) <= 0xF8FF or ord(c) >= 0xF0000))
    lineas = [l.strip() for l in s.split("\n")]
    # Quita la frase que deja ChatGPT al inicio ("Aquí tienes una descripción...").
    while lineas and (not lineas[0] or lineas[0].lower().startswith("aquí tienes")):
        lineas.pop(0)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lineas)).strip()


def color(s):
    s = espacios(s)
    return s[:1].upper() + s[1:].lower() if s else ""


def numero(v):
    if v in (None, ""):
        return None
    try:
        return int(round(float(str(v).replace(",", "").replace("$", ""))))
    except ValueError:
        return None


def categoria_de(texto, titulo):
    t = espacios(sin_tildes(str(texto or "")).upper())
    if t in ALIAS:
        return ALIAS[t], None
    if re.search(r"\b(MOTO|CARRO|CUATRIMOTO|VEHICULO)\b.*ELECTRIC|ELECTRIC.*\b(MOTO|CARRO)\b", sin_tildes(titulo).upper()):
        return "carros-electricos", t or "(vacía)"
    return "otros", t or "(vacía)"


def main(ruta):
    wb = openpyxl.load_workbook(ruta, data_only=True, read_only=True)
    filas = list(wb[HOJA].iter_rows(values_only=True))
    ancho = max(len(f) for f in filas)
    filas = [tuple(f) + (None,) * (ancho - len(f)) for f in filas]  # las filas cortas vienen sin celdas al final
    cab = [espacios(c) for c in filas[0]]
    col = {nombre: cab.index(nombre) for nombre in ("SKU*", "Titulo*", "Categoria*", "Precio*", "Stock*", "DescripcionBreve*", "Color")}

    pend = {"sin_precio": [], "sin_stock": [], "sin_descripcion": [], "categoria": [], "precio_raro": [], "sku_repetido": [], "varias_categorias": []}
    grupos = OrderedDict()
    vistos = set()
    for f in filas[1:]:
        sku = espacios(f[col["SKU*"]])
        if not sku.startswith("BW") or sku in EJEMPLOS:
            continue
        if sku in vistos:
            pend["sku_repetido"].append(f"{sku} · {espacios(f[col['Titulo*']])}")
            continue
        vistos.add(sku)
        titulo = espacios(f[col["Titulo*"]]).upper()
        # "COCHE PASEADOR DONA GRIS" con color GRIS es el mismo producto que "COCHE PASEADOR DONA ROSADO".
        c = espacios(f[col["Color"]]).upper()
        if c and sin_tildes(titulo).endswith(" " + sin_tildes(c)):
            titulo = titulo[: -len(c)].strip()
        grupos.setdefault(titulo, []).append(f)

    archivo_fotos = CARPETA / "herramientas" / "fotos.json"
    fotos = json.loads(archivo_fotos.read_text(encoding="utf-8")) if archivo_fotos.exists() else {}

    productos = []
    usados = set()
    for titulo, fs in grupos.items():
        cats = Counter()
        for f in fs:
            cat, raro = categoria_de(f[col["Categoria*"]], titulo)
            cats[cat] += 1
            if raro:
                pend["categoria"].append(f"{titulo} ({espacios(f[col['SKU*']])}): «{raro}» → {dict((c[0], c[1]) for c in CATEGORIAS)[cat]}")
        cat = cats.most_common(1)[0][0]
        if len(cats) > 1:
            pend["varias_categorias"].append(f"{titulo}: {', '.join(cats)} → se usó {cat}")

        variantes = [
            {
                "sku": espacios(f[col["SKU*"]]),
                "color": color(f[col["Color"]]),
                "precio": numero(f[col["Precio*"]]),
                "stock": numero(f[col["Stock*"]]),
            }
            for f in fs
        ]
        precios = [v["precio"] for v in variantes if v["precio"] is not None]
        precio = min(precios) if precios else None
        if precios and max(precios) >= 3 * min(precios):
            detalle = ", ".join(f"{v['sku']} ${v['precio']:,}" for v in variantes if v["precio"] is not None)
            pend["precio_raro"].append(f"{titulo}: {detalle}".replace(",", ".").replace(". BW", ", BW"))
        for v in variantes:
            if v["precio"] is None:
                pend["sin_precio"].append(f"{titulo} ({v['sku']}{', ' + v['color'] if v['color'] else ''})")
            if v["stock"] is None:
                pend["sin_stock"].append(f"{titulo} ({v['sku']}{', ' + v['color'] if v['color'] else ''})")
            # Solo se guarda el precio del color si es distinto al del producto.
            if v["precio"] == precio:
                del v["precio"]

        desc = next((limpiar_descripcion(f[col["DescripcionBreve*"]]) for f in fs if f[col["DescripcionBreve*"]]), "")
        if not desc:
            pend["sin_descripcion"].append(titulo)

        pid = slug(titulo) or slug(variantes[0]["sku"])
        while pid in usados:
            pid += "-2"
        usados.add(pid)
        p = {"id": pid, "nombre": titulo, "categoria": cat, "precio": precio}
        edad = edad_de(titulo, desc, cat)
        if edad:
            p["edad"] = edad
        p["descripcion"] = desc
        if fotos.get("producto", {}).get(pid):
            p["fotos"] = fotos["producto"][pid]
        if fotos.get("giro", {}).get(pid):
            p["giro"] = fotos["giro"][pid]
        # Modelo 3D: el escaneado que subieron a Drive o, si no hay, el generado con IA (fotos_a_3d.py).
        if fotos.get("modelo", {}).get(pid):
            p["modelo"] = fotos["modelo"][pid]
        elif (CARPETA / "modelos" / f"{pid}.ia.glb").exists():
            p["modelo"] = f"modelos/{pid}.ia.glb"
            p["modeloIA"] = True
            info = CARPETA / "modelos" / f"{pid}.ia.json"
            if info.exists() and not json.loads(info.read_text(encoding="utf-8")).get("medida_real"):
                p["medidaAproximada"] = True
        for v in variantes:
            if v["sku"] in fotos.get("sku", {}):
                v["foto"] = fotos["sku"][v["sku"]]
        p["variantes"] = variantes
        productos.append(p)

    escribir_js(productos)
    tiene_foto = lambda p: p.get("fotos") or any(v.get("foto") for v in p["variantes"])
    pend["sin_foto"] = [p["nombre"] for p in productos if estado(p) == "disponible" and not tiene_foto(p)]
    pend["fotos_sueltas"] = fotos.get("no_emparejadas", []) + [f"{s} (no está en el Excel)" for s in fotos.get("skus_sin_producto", [])] + fotos.get("errores", [])
    escribir_pendientes(pend, productos)
    estados = Counter(estado(p) for p in productos)
    print(f"{sum(1 for p in productos if tiene_foto(p))} con foto. {len(productos)} productos ({sum(len(p['variantes']) for p in productos)} referencias): "
          f"{estados['disponible']} disponibles, {estados['agotado']} agotados, {estados['consultar']} para consultar")


def estado(p):
    if p["precio"] is None:
        return "consultar"
    if any((v["stock"] or 0) > 0 for v in p["variantes"]):
        return "disponible"
    if all(v["stock"] == 0 for v in p["variantes"]):
        return "agotado"
    return "consultar"


def escribir_js(productos):
    cats = ",\n".join(
        "  " + json.dumps({"id": c[0], "nombre": c[1], "emoji": c[2]}, ensure_ascii=False) for c in CATEGORIAS
    )
    prods = ",\n".join("  " + json.dumps(p, ensure_ascii=False) for p in productos)
    (CARPETA / "productos.js").write_text(
        "// Catálogo de la tienda. NO lo edites a mano: se genera desde el Excel del cliente con\n"
        "//   python3 tienda-bebes/herramientas/excel_a_productos.py catalogo.xlsx\n"
        "//\n"
        "// Cada producto junta las filas del Excel con el mismo título; cada fila es una variante\n"
        "// (color) con su SKU y su stock. precio null = \"Consultar precio\"; stock null = sin dato.\n"
        "// edad: [desde, hasta] en meses según la categoría (-9 = embarazo); la usa el asistente.\n"
        f"window.CATEGORIAS = [\n{cats},\n];\n\n"
        f"window.PRODUCTOS = [\n{prods},\n];\n",
        encoding="utf-8",
    )


def escribir_pendientes(pend, productos):
    titulos = {
        "precio_raro": "Precios que parecen mal escritos (¿un cero de más o de menos?)",
        "sin_precio": "Referencias sin precio (salen como «Consultar precio»)",
        "sin_stock": "Referencias sin stock (no se pueden comprar en línea; salen como «Consultar»)",
        "categoria": "Categorías vacías o mal escritas (se corrigieron así)",
        "varias_categorias": "Mismo producto con categorías distintas",
        "sku_repetido": "SKU repetidos (se usó solo la primera fila)",
        "sin_descripcion": "Productos sin descripción",
        "sin_foto": "Productos disponibles sin foto en Drive",
        "fotos_sueltas": "Fotos de Drive que no se pudieron unir a un producto",
    }
    partes = [
        "# Pendientes del catálogo",
        "",
        "Lista generada desde el Excel del cliente. Corrigiendo esto en el Excel y volviendo a correr",
        "`herramientas/excel_a_productos.py`, la tienda queda al día.",
        "",
    ]
    for clave, titulo in titulos.items():
        lista = pend[clave]
        partes.append(f"## {titulo} ({len(lista)})\n")
        partes += [f"- {x}" for x in lista] or ["- Nada 🎉"]
        partes.append("")
    (CARPETA / "pendientes-catalogo.md").write_text("\n".join(partes), encoding="utf-8")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
