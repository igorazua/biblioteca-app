"""
Genera las fuentes estáticas (TTF) de la app nativa a partir de los archivos variables de la PWA.

Origen (paquetes @fontsource-variable de app/node_modules):
  - Fraunces: fraunces-latin-full-normal.woff2 (ejes opsz, wght, SOFT, WONK)
              fraunces-latin-full-italic.woff2 (mismos ejes; cursivas Fraunces72-400-italic y -500-italic)
  - Inter:    inter-latin-wght-normal.woff2    (eje wght)

Destino: apps/native/assets/fonts/. Cada archivo lleva el nombre lógico de tokens.fontFiles
(packages/tokens/src/index.ts) también en su tabla name, para que fontFamily coincida.

Uso (desde la raíz del worktree):
  python packages/tokens/scripts/make-fonts.py

Requiere fonttools y brotli (los WOFF2 se descomprimen con brotli).
"""

import os
import sys

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
OUT = os.path.join(REPO, "apps", "native", "assets", "fonts")

SOURCE_DIRS = [
    os.path.join(REPO, "app", "node_modules", "@fontsource-variable"),
    os.path.join(REPO, "..", "app", "node_modules", "@fontsource-variable"),
]

FRAUNCES = os.path.join("fraunces", "files", "fraunces-latin-full-normal.woff2")
FRAUNCES_ITALIC = os.path.join("fraunces", "files", "fraunces-latin-full-italic.woff2")
INTER = os.path.join("inter", "files", "inter-latin-wght-normal.woff2")

# (nombre lógico, archivo de origen, coordenadas del eje)
# Fraunces: SOFT y WONK fijados a su valor por defecto (0 y 1); opsz y wght según la web (.serif usa opsz 72, rank-num 144).
JOBS = [
    ("Fraunces72-400", FRAUNCES, {"opsz": 72, "wght": 400, "SOFT": 0, "WONK": 1}),
    ("Fraunces72-500", FRAUNCES, {"opsz": 72, "wght": 500, "SOFT": 0, "WONK": 1}),
    ("Fraunces72-600", FRAUNCES, {"opsz": 72, "wght": 600, "SOFT": 0, "WONK": 1}),
    ("Fraunces72-700", FRAUNCES, {"opsz": 72, "wght": 700, "SOFT": 0, "WONK": 1}),
    ("Fraunces144-800", FRAUNCES, {"opsz": 144, "wght": 800, "SOFT": 0, "WONK": 1}),
    # Cursivas: mismos ejes que la normal (la PWA usa la cursiva variable con esos valores).
    ("Fraunces72-400-italic", FRAUNCES_ITALIC, {"opsz": 72, "wght": 400, "SOFT": 0, "WONK": 1}),
    ("Fraunces72-500-italic", FRAUNCES_ITALIC, {"opsz": 72, "wght": 500, "SOFT": 0, "WONK": 1}),
    ("Inter-400", INTER, {"wght": 400}),
    ("Inter-500", INTER, {"wght": 500}),
    ("Inter-600", INTER, {"wght": 600}),
    ("Inter-700", INTER, {"wght": 700}),
    ("Inter-900", INTER, {"wght": 900}),
]


def find_source(rel):
    for base in SOURCE_DIRS:
        path = os.path.join(base, rel)
        if os.path.isfile(path):
            return path
    sys.exit(f"No encuentro {rel} en {SOURCE_DIRS}")


def set_names(font, family):
    """Pone el nombre lógico en las entradas de familia, nombre completo y PostScript, y quita las de subfamilia tipográfica."""
    name = font["name"]
    for name_id in (1, 4, 6):
        name.removeNames(nameID=name_id)
    for name_id in (16, 17):
        name.removeNames(nameID=name_id)
    ps = family.replace(" ", "")
    for name_id, value in ((1, family), (4, family), (6, ps)):
        name.setName(value, name_id, 3, 1, 0x409)
        name.setName(value, name_id, 1, 0, 0)


def build(logical, rel, axes):
    src = find_source(rel)
    font = TTFont(src)
    static = instancer.instantiateVariableFont(font, axes, inplace=False, updateFontNames=False)
    set_names(static, logical)
    static.flavor = None
    out = os.path.join(OUT, f"{logical}.ttf")
    static.save(out)
    print(f"{logical}.ttf  <- {os.path.basename(src)}  {axes}")
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    for logical, rel, axes in JOBS:
        build(logical, rel, axes)


if __name__ == "__main__":
    main()
