/* ============================================================
   BINGO SMJ — Visor / Balotera digital (js/visor.js)
   Balota animada (rueda + rebote) + suspenso/timbre (Web Audio)
   + doble cantada de voz + tablero + temporizador + patrón
   configurable + verificador por folio. Estado persistente.
   ============================================================ */

const VISOR = (function () {
  'use strict';

  const EST_KEY = 'smj_bingo_estado';
  let estado = {
    salidos: [],          // números cantados, en orden
    actual: null,         // último número
    patron: new Array(25).fill(true), // por defecto: cartón lleno
    voz: true,
    sfx: true,            // efectos de sonido (suspenso + timbre)
    auto: false,
    intervalo: 5,         // segundos entre balotas (modo automático)
  };
  let timer = null;
  let rollTimer = null;     // temporizador de la animación "rueda"
  let suspenseStop = null;  // función para detener el sonido de suspenso
  let sorteando = false;    // hay un sorteo en curso
  let audioCtx = null;
  let editTmp = null;       // patrón en edición (modal)
  let iniciado = false;
  let confetiRAF = 0;

  // Íconos SVG para los interruptores
  const ICO = {
    play: '<svg class="ico-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg class="ico-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    voz: '<svg class="ico-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a4 4 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    mute: '<svg class="ico-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>',
    bell: '<svg class="ico-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 8 2.5 8h-17S6 15 6 9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>',
    bellOff: '<svg class="ico-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 9.6-4.8M18.4 12.3c.2 3.6 2.1 4.7 2.1 4.7h-13"/><path d="M4 4l16 16"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>'
  };

  function $(id) { return document.getElementById(id); }
  function clamp(n, min, max) { n = parseInt(n, 10); if (isNaN(n)) n = min; return Math.max(min, Math.min(max, n)); }
  function guardar() { try { localStorage.setItem(EST_KEY, JSON.stringify(estado)); } catch (e) {} }
  function cargar() {
    try { const j = JSON.parse(localStorage.getItem(EST_KEY)); if (j) estado = Object.assign(estado, j); } catch (e) {}
    if (!Array.isArray(estado.patron) || estado.patron.length !== 25) estado.patron = new Array(25).fill(true);
  }

  /* ---------------- Audio (Web Audio API, sin archivos) ---------------- */
  function getCtx() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { audioCtx = null; }
    return audioCtx;
  }
  // Sonido de suspenso: ruido filtrado tipo "shaker" que se mantiene hasta detenerlo
  function sonidoSuspenso() {
    try {
      const ctx = getCtx(); if (!ctx) return function () {};
      const len = Math.floor(ctx.sampleRate * 1.6);
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buffer; src.loop = true;
      const filtro = ctx.createBiquadFilter(); filtro.type = 'bandpass'; filtro.frequency.value = 1400; filtro.Q.value = 0.8;
      const gain = ctx.createGain(); gain.gain.value = 0.0001;
      gain.gain.linearRampToValueAtTime(0.10, ctx.currentTime + 0.12);
      src.connect(filtro); filtro.connect(gain); gain.connect(ctx.destination);
      src.start();
      return function stop() {
        try {
          gain.gain.cancelScheduledValues(ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
          src.stop(ctx.currentTime + 0.12);
        } catch (e) {}
      };
    } catch (e) { return function () {}; }
  }
  // Timbre alegre de revelación (dos tonos)
  function sonidoTimbre() {
    try {
      const ctx = getCtx(); if (!ctx) return;
      const t = ctx.currentTime;
      [880, 1320].forEach(function (f, i) {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i * 0.04);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.04 + i * 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
        o.connect(g); g.connect(ctx.destination);
        o.start(t + i * 0.04); o.stop(t + 0.75);
      });
    } catch (e) {}
  }

  /* ---------------- Voz ---------------- */
  function decirVoz(texto, rate) {
    try {
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = 'es-ES'; u.rate = rate || 1; u.pitch = 1;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  // Doble cantada con cadencia de bingo: "B 5 ... B, cinco"
  function hablarDoble(n) {
    if (!estado.voz) return;
    try { speechSynthesis.cancel(); } catch (e) {}
    const l = BINGO.letraDe(n);
    decirVoz(l + ' ' + n, 1.05);   // rápido
    decirVoz(l + ', ' + n, 0.8);   // lento (se pronuncia "be, cinco")
  }

  /* ---------------- Patrones ---------------- */
  function presetPatron(nombre) {
    const p = new Array(25).fill(false);
    if (nombre === 'lleno') return p.fill(true);
    if (nombre === 'limpiar') return p;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      let on = false;
      switch (nombre) {
        case 'x': on = (r === c) || (r + c === 4); break;
        case 'diagonal': on = (r === c); break;
        case 'cruz': on = (r === 2) || (c === 2); break;
        case 'marco': on = (r === 0 || r === 4 || c === 0 || c === 4); break;
        case 'esquinas': on = ((r === 0 || r === 4) && (c === 0 || c === 4)); break;
        case 'fila': on = (r === 2); break;
        case 'columna': on = (c === 2); break;
      }
      if (on) p[r * 5 + c] = true;
    }
    return p;
  }
  function iguales(a, b) { return a.length === b.length && a.every(function (v, i) { return v === b[i]; }); }
  function nombrePatron() {
    const nombres = { lleno: 'Cartón lleno', x: 'Figura X', cruz: 'Cruz', marco: 'Marco / Borde',
      esquinas: '4 esquinas', diagonal: 'Diagonal', fila: 'Línea central (fila)', columna: 'Columna central (N)' };
    for (const k in nombres) if (iguales(estado.patron, presetPatron(k))) return nombres[k];
    const m = estado.patron.filter(Boolean).length;
    return m ? 'Personalizado (' + m + ' casillas)' : 'Sin patrón';
  }
  function refrescarPatron() {
    let h = '';
    for (let i = 0; i < 25; i++) h += '<div class="' + (estado.patron[i] ? 'on' : '') + '"></div>';
    $('mini-patron').innerHTML = h;
    $('patron-nombre').textContent = nombrePatron();
  }

  /* ---------------- Balota ---------------- */
  function pintarBalota(n) {
    const b = $('balota');
    b.innerHTML = '<div class="b-letra" style="color:' + BINGO.colorDe(n) + '">' + BINGO.letraDe(n) +
      '</div><div class="b-num">' + n + '</div>';
  }
  function animarBalota(n) {
    const b = $('balota');
    b.classList.remove('vacia');
    pintarBalota(n);
    b.classList.remove('girando'); void b.offsetWidth; b.classList.add('girando');
  }
  function balotaVacia() {
    const b = $('balota');
    b.className = 'balota vacia';
    b.innerHTML = '<div class="b-num">—</div>';
  }
  function marcarTablero(n) { const el = $('tab-' + n); if (el) el.classList.add('salido'); }
  function refrescarHistorial() {
    const recientes = estado.salidos.slice(-9).reverse(); // últimas 9, más reciente primero
    let h = '';
    recientes.forEach(function (n) {
      h += '<div class="mini-bola" style="background:' + BINGO.colorDe(n) + '">' + BINGO.letraDe(n) + n + '</div>';
    });
    $('v-historial').innerHTML = h;
    $('v-contador').innerHTML = 'Balotas: <b>' + estado.salidos.length + '</b> / 75';
  }
  function habilitarSacar(on) { const b = $('v-sacar'); if (b) b.disabled = !on; }

  /* ---------------- Sorteo (con animación "rueda") ---------------- */
  function sacar(onSettle) {
    if (sorteando) return;
    const restantes = [];
    for (let n = 1; n <= 75; n++) if (estado.salidos.indexOf(n) === -1) restantes.push(n);
    if (restantes.length === 0) {
      pausarAuto();
      alert('¡Ya salieron las 75 balotas! Inicia una nueva partida.');
      return;
    }
    const n = restantes[Math.floor(Math.random() * restantes.length)];
    sorteando = true;
    habilitarSacar(false);

    const b = $('balota');
    b.classList.remove('vacia');
    b.classList.add('rodando');
    if (estado.sfx) suspenseStop = sonidoSuspenso();

    const dur = 1300;
    const startT = performance.now();
    function pintarFake() {
      const f = 1 + Math.floor(Math.random() * 75);
      pintarBalota(f);
    }
    function tick() {
      const t = (performance.now() - startT) / dur;
      if (t < 1) {
        pintarFake();
        rollTimer = setTimeout(tick, 45 + t * t * 190); // desacelera: ~45ms → ~235ms
      } else {
        rollTimer = null;
        finalizar();
      }
    }
    function finalizar() {
      if (suspenseStop) { suspenseStop(); suspenseStop = null; }
      b.classList.remove('rodando');
      animarBalota(n);                 // número final con rebote
      if (estado.sfx) sonidoTimbre();
      estado.salidos.push(n); estado.actual = n; guardar();
      marcarTablero(n); refrescarHistorial();
      hablarDoble(n);
      sorteando = false; habilitarSacar(true);
      if (typeof onSettle === 'function') onSettle();
    }
    tick();
  }

  /* ---------------- Temporizador automático ---------------- */
  function programar() {
    clearTimeout(timer);
    if (!estado.auto) return;
    timer = setTimeout(function () {
      sacar(function () { programar(); }); // reprograma tras revelar
    }, Math.max(1, estado.intervalo) * 1000);
  }
  function pausarAuto() { estado.auto = false; clearTimeout(timer); timer = null; guardar(); actualizarToggles(); }
  function toggleAuto() {
    getCtx(); // habilitar audio con este gesto
    estado.auto = !estado.auto; guardar(); actualizarToggles();
    if (estado.auto) programar(); else { clearTimeout(timer); timer = null; }
  }
  function actualizarToggles() {
    $('v-voz').classList.toggle('on', estado.voz);
    $('v-sfx').classList.toggle('on', estado.sfx);
    $('v-auto').classList.toggle('on', estado.auto);
    $('v-auto').innerHTML = (estado.auto ? ICO.pause : ICO.play) + '<span>' + (estado.auto ? 'Auto: ON' : 'Auto: OFF') + '</span>';
    $('v-voz').innerHTML = (estado.voz ? ICO.voz : ICO.mute) + '<span>' + (estado.voz ? 'Voz: ON' : 'Voz: OFF') + '</span>';
    $('v-sfx').innerHTML = (estado.sfx ? ICO.bell : ICO.bellOff) + '<span>' + (estado.sfx ? 'Efectos: ON' : 'Efectos: OFF') + '</span>';
    $('v-intervalo').value = estado.intervalo;
  }

  function nuevaPartida() {
    if (estado.salidos.length && !confirm('¿Reiniciar la partida? Se borrarán las balotas cantadas (el patrón se conserva).')) return;
    if (rollTimer) { clearTimeout(rollTimer); rollTimer = null; }
    if (suspenseStop) { suspenseStop(); suspenseStop = null; }
    sorteando = false; habilitarSacar(true);
    estado.salidos = []; estado.actual = null; pausarAuto(); guardar();
    limpiarVerificador();
    renderTodo();
  }

  /* ---------------- Verificador por folio ---------------- */
  function evaluar(carton) {
    const sal = {}; estado.salidos.forEach(function (n) { sal[n] = true; });
    let total = 0, cub = 0; const faltan = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      if (!estado.patron[r * 5 + c]) continue;
      total++;
      const v = carton.grid[r][c];
      if (v === 'FREE' || sal[v]) cub++; else faltan.push(v);
    }
    return { gano: total > 0 && cub === total, faltan: faltan, total: total, cub: cub };
  }
  function miniCartonHTML(carton) {
    const sal = {}; estado.salidos.forEach(function (n) { sal[n] = true; });
    let cels = '';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      const v = carton.grid[r][c]; const i = r * 5 + c;
      let cls = 'celda';
      if (v === 'FREE') cls += ' libre';
      else if (sal[v]) cls += ' marcada';
      if (estado.patron[i]) cls += ' patron';
      cels += '<div class="' + cls + '">' + (v === 'FREE' ? '★' : v) + '</div>';
    }
    return '<div class="bingo-letras"><span>B</span><span>I</span><span>N</span><span>G</span><span>O</span></div>' +
      '<div class="grid5">' + cels + '</div>';
  }
  function verificar() {
    const folio = clamp($('verif-folio').value, 1, BINGO.TOTAL_TABLAS);
    $('verif-folio').value = folio;
    const carton = BINGO.generarCarton(folio);
    $('verif-carton').innerHTML = miniCartonHTML(carton);
    const ev = evaluar(carton);
    const res = $('verif-resultado');
    if (ev.total === 0) { res.className = 'verif-resultado nogano'; res.textContent = '⚠ Primero configura un patrón.'; return; }
    if (ev.gano) {
      res.className = 'verif-resultado gano';
      res.innerHTML = '🎉 ¡BINGO! El folio ' + BINGO.folioStr(folio) + ' completa el patrón «' + nombrePatron() + '».';
      mostrarGanador(folio);
    } else {
      res.className = 'verif-resultado nogano';
      res.innerHTML = 'Aún no completa el patrón (' + ev.cub + '/' + ev.total + ').<br><b>Faltan:</b> ' +
        ev.faltan.map(BINGO.etiqueta).join(' · ');
    }
  }
  function limpiarVerificador() {
    const res = $('verif-resultado');
    res.className = 'verif-resultado'; res.textContent = '';
    $('verif-carton').innerHTML = '';
    $('verif-folio').value = '';
  }
  function lanzarConfeti() {
    const c = $('confeti'); if (!c || !c.getContext) return;
    const ctx = c.getContext('2d');
    c.width = window.innerWidth; c.height = window.innerHeight;
    const cols = ['#800020', '#a31d3d', '#d97706', '#fbbf24', '#1d4ed8', '#059669', '#ffffff'];
    const piezas = [];
    for (let i = 0; i < 170; i++) piezas.push({
      x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.6,
      w: 6 + Math.random() * 8, h: 9 + Math.random() * 10,
      vx: -2.2 + Math.random() * 4.4, vy: 2 + Math.random() * 4,
      rot: Math.random() * 6.28, vr: -0.22 + Math.random() * 0.44,
      col: cols[Math.floor(Math.random() * cols.length)]
    });
    let f = 0;
    cancelAnimationFrame(confetiRAF);
    (function dibujar() {
      ctx.clearRect(0, 0, c.width, c.height);
      for (let i = 0; i < piezas.length; i++) {
        const p = piezas[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.col; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      }
      f++;
      if (f < 240) confetiRAF = requestAnimationFrame(dibujar);
      else ctx.clearRect(0, 0, c.width, c.height);
    })();
  }
  function mostrarGanador(folio) {
    const g = $('ganador');
    g.querySelector('.sb').textContent = 'Folio ' + BINGO.folioStr(folio) + ' · ' + nombrePatron();
    g.classList.add('show');
    lanzarConfeti();
    if (estado.voz) decirVoz('¡Bingo!', 1);
  }

  /* ---------------- Modal editor de patrón ---------------- */
  function construirEditor() {
    let h = '';
    ['B', 'I', 'N', 'G', 'O'].forEach(function (L, i) { h += '<div class="ecab" style="background:' + BINGO.COLS[i].color + '">' + L + '</div>'; });
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      const i = r * 5 + c; const centro = (i === 12);
      h += '<div class="ecelda' + (centro ? ' centro' : '') + '" data-i="' + i + '">' + (centro ? '★' : '') + '</div>';
    }
    $('editor-patron').innerHTML = h;
  }
  function pintarEditor() {
    $('editor-patron').querySelectorAll('.ecelda').forEach(function (el) {
      const i = parseInt(el.getAttribute('data-i'), 10);
      el.classList.toggle('on', !!editTmp[i]);
    });
  }
  function abrirModal() { editTmp = estado.patron.slice(); pintarEditor(); $('modal-patron').classList.add('abierto'); }
  function cerrarModal() { $('modal-patron').classList.remove('abierto'); }
  function guardarPatron() {
    estado.patron = editTmp.slice(); guardar(); refrescarPatron(); cerrarModal();
    if ($('verif-folio').value) verificar();
  }

  /* ---------------- Render general ---------------- */
  function construirTablero() {
    let h = '';
    for (let c = 0; c < 5; c++) {
      const col = BINGO.COLS[c];
      h += '<div class="tab-col"><div class="cab" style="background:' + col.color + '">' + col.letter + '</div>';
      for (let n = col.min; n <= col.max; n++) h += '<div class="tab-num" id="tab-' + n + '">' + n + '</div>';
      h += '</div>';
    }
    $('tablero').innerHTML = h;
  }
  function renderTodo() {
    construirTablero();
    estado.salidos.forEach(function (n) { marcarTablero(n); });
    if (estado.actual) animarBalota(estado.actual); else balotaVacia();
    refrescarHistorial();
    refrescarPatron();
    actualizarToggles();
  }

  /* ---------------- Init ---------------- */
  function init() {
    cargar();
    if (!iniciado) {
      construirEditor();
      $('v-sacar').addEventListener('click', function () { getCtx(); sacar(); });
      $('v-nueva').addEventListener('click', nuevaPartida);
      $('v-auto').addEventListener('click', toggleAuto);
      $('v-voz').addEventListener('click', function () { getCtx(); estado.voz = !estado.voz; guardar(); actualizarToggles(); });
      $('v-sfx').addEventListener('click', function () { getCtx(); estado.sfx = !estado.sfx; guardar(); actualizarToggles(); });
      $('v-intervalo').addEventListener('change', function () {
        estado.intervalo = clamp(this.value, 1, 120); this.value = estado.intervalo; guardar();
        if (estado.auto) programar();
      });
      $('v-config-patron').addEventListener('click', abrirModal);
      $('v-guardar-patron').addEventListener('click', guardarPatron);
      $('v-cerrar-patron').addEventListener('click', cerrarModal);
      $('modal-patron').addEventListener('click', function (e) { if (e.target === this) cerrarModal(); });
      $('editor-patron').addEventListener('click', function (e) {
        const cel = e.target.closest('.ecelda'); if (!cel) return;
        const i = parseInt(cel.getAttribute('data-i'), 10);
        editTmp[i] = !editTmp[i]; cel.classList.toggle('on', editTmp[i]);
      });
      $('presets').addEventListener('click', function (e) {
        const b = e.target.closest('button[data-preset]'); if (!b) return;
        editTmp = presetPatron(b.getAttribute('data-preset')); pintarEditor();
      });
      $('v-verificar').addEventListener('click', verificar);
      $('v-limpiar').addEventListener('click', function () { limpiarVerificador(); $('verif-folio').focus(); });
      $('verif-folio').addEventListener('keydown', function (e) { if (e.key === 'Enter') verificar(); });
      $('ganador').addEventListener('click', function () { this.classList.remove('show'); });

      // Barra espaciadora = sacar balota (cómodo para el presentador)
      document.addEventListener('keydown', function (e) {
        const vivo = document.getElementById('vista-visor').classList.contains('activa');
        const enInput = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
        if (vivo && !enInput && (e.code === 'Space' || e.key === ' ')) { e.preventDefault(); getCtx(); sacar(); }
      });
      iniciado = true;
    }
    renderTodo();
  }

  return { init: init };
})();
