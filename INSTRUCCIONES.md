# 🎱 Bingo Institucional — I.E. Sor María Juliana

App web autónoma (funciona **sin internet**) para un bingo de **75 balotas (B-I-N-G-O)** con capacidad para **1000 tablas**. Tiene dos módulos: **Generador de tablas** y **Visor / Balotera digital**.

## ▶️ Cómo abrir
Doble clic en **`index.html`** (se abre en el navegador). No requiere instalación ni conexión.

> Recomendado: Google Chrome o Microsoft Edge.

## 📤 Compartir la app (¡importante!)
La carpeta tiene varios archivos enlazados (`css/`, `js/`, `assets/`). Si compartes solo `index.html` o se rompe la estructura de carpetas, **se verá descuadrada**.

➡️ **Para compartir, usa el archivo único:** **`Bingo SMJ - App (1 archivo).html`**
Lleva el diseño, el código y el escudo **incrustados adentro**. Es UN solo archivo: se abre con doble clic en cualquier computador (Windows o Mac) y funciona aunque se mueva o se envíe por WhatsApp/Drive/correo.

> Solo necesita internet para las fuentes "bonitas"; sin conexión se ve igual con la tipografía del sistema.
> Si editas la app y quieres regenerar ese archivo único, ejecuta: `python3 bundle.py`

---

## 🖨️ Generador de tablas
1. Entra a **Generador de tablas**.
2. Edita el **encabezado**: nombre del evento, fecha/lugar y lema. La vista previa se actualiza al instante.
3. Elige el **rango de folios** a imprimir (ej. `1` a `1000`, o por lotes como `1`–`200`).
4. Pulsa **🖨️ Imprimir / Guardar PDF**.
   - En el diálogo del navegador: para PDF elige **«Guardar como PDF»** como destino.
   - Para fotocopia económica, imprime en **blanco y negro** (el diseño ya está optimizado para B/N).
   - Tamaño: **Carta**, sin escalado. Salen **4 cartones por hoja** (cuarto de carta) → recórtalos.
5. **«Imprimir 1 hoja de muestra»** saca solo 4 cartones de prueba para revisar antes del tiraje completo.

**Cada tabla es única** y lleva su **folio** (0001–1000). El sistema verifica automáticamente que las 1000 sean distintas.

> 📦 **Ya hay un PDF listo:** `Bingo SMJ - 1000 tablas.pdf` (250 páginas, 4 tablas por hoja carta, B/N). Para **regenerarlo** tras cambiar el evento o el lema, vuelve a usar el botón **🖨️ Imprimir / Guardar PDF** y elige «Guardar como PDF».

> ⚠️ **Opciones avanzadas → Serie:** define los números de cada folio. **No cambies la serie después de imprimir**, o las tablas dejarían de coincidir con el visor. Usa «Crear serie nueva» solo si quieres empezar de cero (anula las tablas ya impresas).

---

## 🎯 Visor / Balotera digital (para proyectar)
- **🎱 Sacar balota** (o la **barra espaciadora**): lanza la siguiente balota con animación y la canta por **voz**.
- **▶ Auto**: saca balotas solo, con el intervalo en segundos que definas.
- **🔊 Voz**: activa/desactiva el anuncio hablado.
- **Tablero de salidos**: marca en vivo todos los números cantados (1–75).
- **🔄 Nueva partida**: reinicia las balotas (el patrón se conserva).

### ✏️ Configurar el patrón ganador
1. Pulsa **«Configurar patrón»**.
2. **Toca las casillas** de la matriz 5×5 para "dibujar" la figura que dará premio (el centro ★ es libre).
3. O usa un **predefinido**: cartón lleno, línea, columna, diagonal, X, cruz, marco, 4 esquinas…
4. **Guardar patrón**. Puedes cambiarlo entre rondas.

### 🔎 Verificar un ganador
1. Cuando alguien cante "¡Bingo!", escribe su **número de folio** en **Verificar tabla** y pulsa **Verificar**.
2. El sistema regenera ese cartón, marca los números ya cantados y dice si **completa el patrón activo** (o qué números le faltan).

---

## 📁 Estructura del proyecto
```
BINGO/
├── index.html          ← abrir este archivo
├── css/styles.css
├── js/
│   ├── core.js         ← generación determinista de cartones
│   ├── generador.js
│   ├── visor.js
│   └── app.js
└── assets/
    ├── escudo.png      ← escudo SMJ (fondo blanco, para impresión)
    └── escudo-vino.png ← escudo SMJ (fondo vino tinto)
```

**Identidad:** Vino Tinto institucional `#800020` + Oro `#d97706` · Escudo I.E. Sor María Juliana.
