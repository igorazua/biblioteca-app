"""
Genera las fuentes estáticas (TTF) de la app nativa a partir del archivo variable oficial de Archivo.

Origen: Google Fonts, `ofl/archivo/Archivo[wdth,wght].ttf` (licencia OFL 1.1; el texto va en
apps/native/assets/fonts/OFL.txt). Si no se pasa ruta, el script lo descarga de la URL oficial.

Destino: apps/native/assets/fonts/. Cada archivo lleva el nombre lógico de tokens.fontFiles
(packages/tokens/src/index.ts) también en su tabla name, para que fontFamily coincida.

Uso (desde la raíz del worktree):
  python packages/tokens/scripts/make-fonts.py [ruta/Archivo[wdth,wght].ttf]

Requiere fonttools.
"""

import os
import sys
import tempfile
import urllib.request

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
OUT = os.path.join(REPO, "apps", "native", "assets", "fonts")

BASE = "https://raw.githubusercontent.com/google/fonts/main/ofl/archivo/"
VARIABLE_URL = BASE + "Archivo%5Bwdth%2Cwght%5D.ttf"
LICENSE_URL = BASE + "OFL.txt"

# (nombre lógico, coordenadas de los ejes)
JOBS = [
    ("Archivo-Condensed-ExtraBold", {"wdth": 62, "wght": 800}),  # titulares, números de ranking, sellos
    ("Archivo-Regular", {"wdth": 100, "wght": 400}),  # texto
    ("Archivo-SemiBold", {"wdth": 100, "wght": 600}),  # botones, títulos de obra
]


def set_names(font, family):
    """Pone el nombre lógico en las entradas de familia, nombre completo y PostScript, y quita las de subfamilia tipográfica."""
    name = font["name"]
    for name_id in (1, 4, 6, 16, 17):
        name.removeNames(nameID=name_id)
    ps = family.replace(" ", "")
    for name_id, value in ((1, family), (4, family), (6, ps)):
        name.setName(value, name_id, 3, 1, 0x409)
        name.setName(value, name_id, 1, 0, 0)


def main():
    os.makedirs(OUT, exist_ok=True)
    src = sys.argv[1] if len(sys.argv) > 1 else None
    if not src:
        src = os.path.join(tempfile.mkdtemp(), "Archivo-variable.ttf")
        urllib.request.urlretrieve(VARIABLE_URL, src)
    lic = os.path.join(OUT, "OFL.txt")
    if not os.path.isfile(lic):
        urllib.request.urlretrieve(LICENSE_URL, lic)
    for logical, axes in JOBS:
        font = TTFont(src)
        static = instancer.instantiateVariableFont(font, axes, inplace=False, updateFontNames=False)
        set_names(static, logical)
        static.flavor = None
        out = os.path.join(OUT, f"{logical}.ttf")
        static.save(out)
        print(f"{logical}.ttf  {axes}  {os.path.getsize(out)} bytes")


if __name__ == "__main__":
    main()
