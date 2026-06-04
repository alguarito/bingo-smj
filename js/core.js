/* ============================================================
   BINGO SMJ — Núcleo compartido (core.js)
   Generación DETERMINISTA de cartones de 75 bolas (5x5 B-I-N-G-O).
   El mismo folio + la misma semilla producen SIEMPRE el mismo cartón,
   así el cartón impreso y el que verifica el visor son idénticos.
   ============================================================ */

const BINGO = (function () {
  'use strict';

  // Columnas B-I-N-G-O y sus rangos de números
  const COLS = [
    { letter: 'B', min: 1,  max: 15, color: '#1d4ed8' }, // azul escudo
    { letter: 'I', min: 16, max: 30, color: '#a31d3d' }, // vino claro
    { letter: 'N', min: 31, max: 45, color: '#d97706' }, // oro
    { letter: 'G', min: 46, max: 60, color: '#059669' }, // verde
    { letter: 'O', min: 61, max: 75, color: '#4f46e5' }, // índigo
  ];

  const TOTAL_TABLAS = 1000;
  const SEED_KEY = 'smj_bingo_seed';
  const DEFAULT_SEED = 'SMJ-BINGO-2026';

  // --- Semilla (persistente en el navegador) ---
  function getSeed() {
    try { return localStorage.getItem(SEED_KEY) || DEFAULT_SEED; }
    catch (e) { return DEFAULT_SEED; }
  }
  function setSeed(s) {
    try { localStorage.setItem(SEED_KEY, s || DEFAULT_SEED); } catch (e) {}
  }

  // --- PRNG determinista: xmur3 (hash de texto) + mulberry32 ---
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
    };
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeRng(seedStr) {
    return mulberry32(xmur3(seedStr)());
  }

  // rango [min..max] inclusivo
  function range(min, max) {
    const a = [];
    for (let i = min; i <= max; i++) a.push(i);
    return a;
  }

  // Mezcla Fisher-Yates con un rng dado
  function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  // --- Generar un cartón por folio (determinista) ---
  // Devuelve { folio, grid } donde grid[fila][columna]; grid[2][2] === 'FREE'
  function generarCarton(folio, seedStr) {
    seedStr = seedStr || getSeed();
    const rng = makeRng(seedStr + '|' + folio);
    const grid = [[], [], [], [], []];
    for (let c = 0; c < 5; c++) {
      const col = COLS[c];
      const cuantos = (c === 2) ? 4 : 5; // la columna N solo necesita 4 (centro libre)
      const elegidos = shuffle(range(col.min, col.max), rng).slice(0, cuantos);
      elegidos.sort(function (x, y) { return x - y; }); // ascendente, más legible
      if (c === 2) {
        // Columna N: el centro es LIBRE. 4 números en filas 0,1,3,4.
        const filas = [0, 1, 3, 4];
        for (let k = 0; k < 4; k++) grid[filas[k]][c] = elegidos[k];
        grid[2][c] = 'FREE';
      } else {
        for (let r = 0; r < 5; r++) grid[r][c] = elegidos[r];
      }
    }
    return { folio: folio, grid: grid };
  }

  // Letra B/I/N/G/O para un número 1..75
  function letraDe(n) { return COLS[Math.floor((n - 1) / 15)].letter; }
  function colorDe(n) { return COLS[Math.floor((n - 1) / 15)].color; }
  // Etiqueta "B 12"
  function etiqueta(n) { return letraDe(n) + ' ' + n; }
  // Folio a 4 dígitos: 1 -> "0001"
  function folioStr(folio) { return String(folio).padStart(4, '0'); }

  // Lista de números de un cartón (sin FREE)
  function numerosDe(grid) {
    const nums = [];
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++)
        if (grid[r][c] !== 'FREE') nums.push(grid[r][c]);
    return nums;
  }

  // Auditoría de unicidad de las 1000 tablas (devuelve nº de colisiones)
  function auditarUnicidad(seedStr) {
    const vistos = new Set();
    let colisiones = 0;
    for (let f = 1; f <= TOTAL_TABLAS; f++) {
      const firma = numerosDe(generarCarton(f, seedStr).grid)
        .sort(function (a, b) { return a - b; }).join(',');
      if (vistos.has(firma)) colisiones++; else vistos.add(firma);
    }
    return colisiones;
  }

  return {
    COLS: COLS,
    TOTAL_TABLAS: TOTAL_TABLAS,
    DEFAULT_SEED: DEFAULT_SEED,
    getSeed: getSeed,
    setSeed: setSeed,
    generarCarton: generarCarton,
    letraDe: letraDe,
    colorDe: colorDe,
    etiqueta: etiqueta,
    folioStr: folioStr,
    numerosDe: numerosDe,
    auditarUnicidad: auditarUnicidad,
  };
})();
