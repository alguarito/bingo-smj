/* ============================================================
   BINGO SMJ — Generador de tablas (js/generador.js)
   Formulario editable + vista previa + auditoría + impresión.
   ============================================================ */

const GEN = (function () {
  'use strict';

  const CFG_KEY = 'smj_bingo_cfg';
  let cfg = {
    evento: 'Gran Bingo Institucional',
    fecha: '',
    lema: '¡Mucha suerte a todos!',
    desde: 1,
    hasta: 1000,
    muestra: 1,
    previewBN: false,   // vista previa en blanco y negro (como se imprime)
  };
  let iniciado = false;

  function load() {
    try { const j = JSON.parse(localStorage.getItem(CFG_KEY)); if (j) cfg = Object.assign(cfg, j); } catch (e) {}
  }
  function save() { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {} }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function clamp(n, min, max) { n = parseInt(n, 10) || min; return Math.max(min, Math.min(max, n)); }
  function $(id) { return document.getElementById(id); }

  // --- HTML de un cartón (mismo markup en pantalla e impresión) ---
  function celdaHTML(v) {
    if (v === 'FREE') return '<div class="celda libre">★<br>LIBRE</div>';
    return '<div class="celda">' + v + '</div>';
  }
  function gridHTML(grid) {
    let h = '';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) h += celdaHTML(grid[r][c]);
    return h;
  }
  function cartonHTML(carton) {
    const f = BINGO.folioStr(carton.folio);
    return '' +
      '<div class="carton">' +
        '<div class="carton-head">' +
          '<img class="esc" src="assets/escudo.png" alt="Escudo SMJ">' +
          '<div class="ct">' +
            '<div class="inst">Institución Educativa Sor María Juliana</div>' +
            '<div class="ev">' + esc(cfg.evento) + '</div>' +
            (cfg.fecha ? '<div class="fe">' + esc(cfg.fecha) + '</div>' : '') +
          '</div>' +
          '<div class="folio"><small>FOLIO</small><b>' + f + '</b></div>' +
        '</div>' +
        '<div class="bingo-letras"><span>B</span><span>I</span><span>N</span><span>G</span><span>O</span></div>' +
        '<div class="grid5">' + gridHTML(carton.grid) + '</div>' +
        '<div class="carton-foot"><span class="lema">' + esc(cfg.lema) + '</span><span>N° ' + f + '</span></div>' +
      '</div>';
  }

  // --- Vista previa ---
  function refrescarPreview() {
    cfg.muestra = clamp(cfg.muestra, 1, BINGO.TOTAL_TABLAS);
    if ($('g-muestra')) $('g-muestra').value = cfg.muestra;
    const desde = cfg.muestra;
    const hasta = Math.min(desde + 3, BINGO.TOTAL_TABLAS);
    let cartones = '';
    for (let f = desde; f <= hasta; f++) cartones += cartonHTML(BINGO.generarCarton(f));
    $('gen-preview').innerHTML = '<div class="hoja-preview' + (cfg.previewBN ? ' bn' : '') + '">' + cartones + '</div>';
    if ($('g-muestra-label')) $('g-muestra-label').textContent = 'Hoja: folios ' + BINGO.folioStr(desde) + ' – ' + BINGO.folioStr(hasta);
    if ($('g-color')) $('g-color').classList.toggle('activo', !cfg.previewBN);
    if ($('g-bn')) $('g-bn').classList.toggle('activo', cfg.previewBN);
  }

  // --- Auditoría de unicidad ---
  function auditar() {
    const cols = BINGO.auditarUnicidad(BINGO.getSeed());
    const el = $('g-audit');
    if (!el) return;
    if (cols === 0) {
      el.className = 'estado-aud ok';
      el.textContent = '✓ ' + BINGO.TOTAL_TABLAS + ' tablas únicas verificadas (serie: ' + BINGO.getSeed() + ')';
    } else {
      el.className = 'estado-aud warn';
      el.textContent = '⚠ ' + cols + ' colisión(es). Cambia la serie para corregir.';
    }
  }

  // --- Impresión ---
  function imprimir(soloMuestra) {
    let desde, hasta;
    if (soloMuestra) {
      desde = cfg.muestra; hasta = Math.min(cfg.muestra + 3, BINGO.TOTAL_TABLAS); // una hoja de ejemplo
    } else {
      desde = clamp(cfg.desde, 1, BINGO.TOTAL_TABLAS);
      hasta = clamp(cfg.hasta, desde, BINGO.TOTAL_TABLAS);
    }
    const total = hasta - desde + 1;
    if (total > 250 && !confirm('Vas a preparar ' + total + ' tablas (' + Math.ceil(total / 4) +
        ' páginas). Puede tardar unos segundos. ¿Continuar?')) return;

    const area = $('area-impresion');
    let html = '';
    let enHoja = 0;
    for (let f = desde; f <= hasta; f++) {
      if (enHoja === 0) html += '<div class="hoja">';
      html += cartonHTML(BINGO.generarCarton(f));
      enHoja++;
      if (enHoja === 4) { html += '</div>'; enHoja = 0; }
    }
    if (enHoja !== 0) html += '</div>';
    area.innerHTML = html;
    // pequeño respiro para pintar antes de abrir el diálogo de impresión
    setTimeout(function () { window.print(); }, 120);
  }

  // --- Inicialización (se llama al entrar a la vista) ---
  function init() {
    load();
    // precargar escudo para que la impresión no salga sin logo
    const pre = new Image(); pre.src = 'assets/escudo.png';

    $('g-evento').value = cfg.evento;
    $('g-fecha').value = cfg.fecha;
    $('g-lema').value = cfg.lema;
    $('g-desde').value = cfg.desde;
    $('g-hasta').value = cfg.hasta;
    $('g-muestra').value = cfg.muestra;
    $('g-seed').value = BINGO.getSeed();

    if (!iniciado) {
      // texto editable -> actualizar preview en vivo
      ['g-evento', 'g-fecha', 'g-lema'].forEach(function (id) {
        $(id).addEventListener('input', function () {
          cfg.evento = $('g-evento').value;
          cfg.fecha = $('g-fecha').value;
          cfg.lema = $('g-lema').value;
          save(); refrescarPreview();
        });
      });
      $('g-desde').addEventListener('change', function () { cfg.desde = clamp(this.value, 1, BINGO.TOTAL_TABLAS); this.value = cfg.desde; save(); });
      $('g-hasta').addEventListener('change', function () { cfg.hasta = clamp(this.value, 1, BINGO.TOTAL_TABLAS); this.value = cfg.hasta; save(); });
      $('g-muestra').addEventListener('change', function () { cfg.muestra = clamp(this.value, 1, BINGO.TOTAL_TABLAS); save(); refrescarPreview(); });
      $('g-muestra-prev').addEventListener('click', function () { cfg.muestra = clamp(cfg.muestra - 4, 1, BINGO.TOTAL_TABLAS); save(); refrescarPreview(); });
      $('g-muestra-next').addEventListener('click', function () { cfg.muestra = clamp(cfg.muestra + 4, 1, BINGO.TOTAL_TABLAS); save(); refrescarPreview(); });
      $('g-color').addEventListener('click', function () { cfg.previewBN = false; save(); refrescarPreview(); });
      $('g-bn').addEventListener('click', function () { cfg.previewBN = true; save(); refrescarPreview(); });

      $('g-imprimir').addEventListener('click', function () { imprimir(false); });
      $('g-imprimir-muestra').addEventListener('click', function () { imprimir(true); });

      $('g-seed').addEventListener('change', function () {
        const v = this.value.trim() || BINGO.DEFAULT_SEED;
        BINGO.setSeed(v); this.value = v; auditar(); refrescarPreview();
      });
      $('g-nueva-serie').addEventListener('click', function () {
        if (!confirm('Crear una SERIE NUEVA cambiará todos los cartones. Las tablas YA IMPRESAS dejarán de ser válidas. ¿Continuar?')) return;
        const nueva = 'SMJ-' + Date.now().toString(36).toUpperCase();
        BINGO.setSeed(nueva); $('g-seed').value = nueva; auditar(); refrescarPreview();
      });
      iniciado = true;
    }

    refrescarPreview();
    auditar();
  }

  return { init: init };
})();
