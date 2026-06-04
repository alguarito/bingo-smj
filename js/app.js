/* ============================================================
   BINGO SMJ — Navegación (js/app.js)
   ============================================================ */

const APP = (function () {
  'use strict';

  function mostrar(vista) {
    document.querySelectorAll('.vista').forEach(function (v) { v.classList.remove('activa'); });
    const el = document.getElementById('vista-' + vista);
    if (el) el.classList.add('activa');
    document.querySelectorAll('.topbar nav button').forEach(function (b) {
      b.classList.toggle('activo', b.getAttribute('data-vista') === vista);
    });
    window.scrollTo(0, 0);
    if (vista === 'generador') GEN.init();
    if (vista === 'visor') VISOR.init();
  }

  function init() {
    document.addEventListener('click', function (e) {
      const b = e.target.closest('[data-vista]');
      if (b) { e.preventDefault(); mostrar(b.getAttribute('data-vista')); }
    });
    mostrar('inicio');
  }

  document.addEventListener('DOMContentLoaded', init);
  return { mostrar: mostrar };
})();
