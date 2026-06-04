#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Empaqueta toda la app (HTML + CSS + JS + escudo) en UN SOLO archivo .html
autocontenido, para compartir sin carpetas. Reejecutar tras editar la app:
    python3 bundle.py
"""
import base64
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
SALIDA = ROOT / "Bingo SMJ - App (1 archivo).html"


def leer(p):
    return (ROOT / p).read_text(encoding="utf-8")


def main():
    css = leer("css/styles.css")
    core = leer("js/core.js")
    gen = leer("js/generador.js")
    visor = leer("js/visor.js")
    app = leer("js/app.js")

    img = (ROOT / "assets/escudo-min.png").read_bytes()
    datauri = "data:image/png;base64," + base64.b64encode(img).decode("ascii")

    html = leer("index.html")

    # 1) CSS en línea
    html = html.replace(
        '<link rel="stylesheet" href="css/styles.css">',
        "<style>\n" + css + "\n</style>",
    )

    # 2) Favicon: lo asigna el JS
    html = html.replace(
        '<link rel="icon" href="assets/escudo.png">',
        '<link rel="icon" id="favIcon">',
    )

    # 3) <img src="assets/escudo.png"> -> sin src; el JS le pone el escudo
    html = html.replace('src="assets/escudo.png"', "data-esc")

    # 4) En generador.js, usar la constante ESCUDO
    gen = gen.replace('src="assets/escudo.png"', "src=\"' + ESCUDO + '\"")
    gen = gen.replace("'assets/escudo.png'", "ESCUDO")

    # 5) Reemplazar los 4 <script src> por todo el JS en línea (const + módulos + setter)
    const_js = 'var ESCUDO = "' + datauri + '";'
    setter_js = (
        "document.querySelectorAll('img[data-esc]').forEach(function(e){e.src=ESCUDO;});"
        " var __f=document.getElementById('favIcon'); if(__f) __f.href=ESCUDO;"
    )
    scripts = (
        "<script>\n" + const_js + "\n</script>\n"
        "<script>\n" + core + "\n</script>\n"
        "<script>\n" + gen + "\n</script>\n"
        "<script>\n" + visor + "\n</script>\n"
        "<script>\n" + app + "\n</script>\n"
        "<script>\n" + setter_js + "\n</script>"
    )
    bloque = (
        '  <script src="js/core.js"></script>\n'
        '  <script src="js/generador.js"></script>\n'
        '  <script src="js/visor.js"></script>\n'
        '  <script src="js/app.js"></script>'
    )
    assert bloque in html, "No se encontró el bloque de <script>; revisa index.html"
    html = html.replace(bloque, scripts)

    # Verificación: no deben quedar referencias (atributos) a archivos externos locales
    for ref in ['href="css/styles.css"', 'src="js/core.js"', 'src="js/app.js"',
                'src="assets/escudo.png"', 'href="assets/escudo.png"']:
        assert ref not in html, "Quedó una referencia externa: " + ref

    SALIDA.write_text(html, encoding="utf-8")
    print("OK ->", SALIDA.name)
    print("Tamaño: %.0f KB" % (len(html.encode("utf-8")) / 1024))


if __name__ == "__main__":
    main()
