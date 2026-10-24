import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..', '..')
const SEED_FILE = join(ROOT, 'app', 'src', 'data', 'seed.json')
const OUT_FILE = join(ROOT, 'audit-gallery.html')
const PUBLIC_OUT = join(ROOT, 'app', 'public', 'audit.html')

const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'))

const items = seed.items.map(i => ({
  id: i.id,
  type: i.type,
  title: i.title,
  year: i.year,
  posterUrl: i.posterUrl || '',
  imageSrc: i.imageSrc || '',
  creator: i.creator || i.author || i.director || '',
  wikidataId: i.wikidataId || ''
}))

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auditoría Visual de Carátulas — Biblioteca</title>
  <style>
    :root {
      --bg: #0f1117;
      --surface: #181c24;
      --surface-border: #272d3b;
      --text: #e6edf3;
      --text-muted: #8b949e;
      --accent: #3b82f6;
      --danger: #ef4444;
      --warning: #f59e0b;
      --success: #10b981;
      --scale: 1;
      --fixed-cols: 8;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding-bottom: 80px;
      user-select: none;
      overflow-x: auto;
    }

    /* Top Sticky Header */
    header {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
      background: rgba(15, 17, 23, 0.96);
      backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--surface-border);
      padding: 12px 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 1000px;
    }

    .top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .title-area h1 {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    }

    .title-area span.badge {
      font-size: 11px;
      background: var(--surface-border);
      color: var(--text-muted);
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 500;
    }

    .controls-group {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: nowrap;
    }

    /* Zoom de foto */
    .zoom-slider-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--surface);
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid var(--surface-border);
      font-size: 12px;
      white-space: nowrap;
    }

    .zoom-slider-wrap input[type="range"] {
      width: 140px;
      cursor: pointer;
      accent-color: var(--accent);
    }

    .btn-zoom {
      background: transparent;
      border: 1px solid var(--surface-border);
      color: var(--text);
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .btn-zoom:hover { background: var(--surface-border); }

    .search-input {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      color: var(--text);
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 13px;
      width: 200px;
      outline: none;
    }
    .search-input:focus { border-color: var(--accent); }

    /* Actions */
    .actions-bar {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn {
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: none;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .btn-primary { background: var(--accent); color: white; }
    .btn-primary:hover { opacity: 0.9; }
    .btn-danger { background: #3b181b; color: #ff858d; border: 1px solid #77242c; }
    .btn-danger:hover { background: #4e1c22; }
    .btn-secondary { background: var(--surface); color: var(--text); border: 1px solid var(--surface-border); }
    .btn-secondary:hover { background: var(--surface-border); }

    /* Filter Tabs */
    .tabs-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .shelf-tabs {
      display: flex;
      gap: 4px;
      background: var(--surface);
      padding: 4px;
      border-radius: 8px;
      border: 1px solid var(--surface-border);
    }

    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    .tab-btn:hover { color: var(--text); }
    .tab-btn.active {
      background: #252b38;
      color: #fff;
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }

    .filter-toggles {
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: 13px;
    }

    .chip-toggle {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 12px;
      cursor: pointer;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .chip-toggle.active {
      border-color: var(--warning);
      color: var(--warning);
      background: rgba(245, 158, 11, 0.1);
    }

    /* Selector de columnas fijas */
    .cols-selector {
      display: flex;
      align-items: center;
      gap: 4px;
      background: var(--surface);
      border: 1px solid var(--surface-border);
      padding: 2px 6px;
      border-radius: 8px;
      font-size: 12px;
    }
    .col-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 2px 6px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
    }
    .col-btn.active { background: #252b38; color: #fff; }

    /* Zoom Canvas Area: Mantiene la cuadrícula intacta y escala como una foto */
    .viewport-outer {
      padding: 20px 24px;
      overflow: visible;
      transform-origin: top left;
      transition: transform 0.05s ease-out;
    }

    .stats-info {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1800px;
    }

    /* Grid Fijo: no cambia de columnas al hacer zoom, zoom escala la vista */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(var(--fixed-cols), 1fr);
      gap: 16px;
      max-width: 1800px;
    }

    /* Item Card */
    .item-card {
      background: var(--surface);
      border: 2px solid transparent;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .item-card:hover {
      box-shadow: 0 6px 18px rgba(0,0,0,0.5);
      border-color: #3b82f6;
    }

    .item-card.status-bad {
      border-color: var(--danger) !important;
      background: #251214;
    }
    .item-card.status-improve {
      border-color: var(--warning) !important;
      background: #251c0e;
    }

    .poster-wrap {
      width: 100%;
      aspect-ratio: 2 / 3;
      background: #12151c;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .boardgame-card .poster-wrap {
      aspect-ratio: 1 / 1;
      background: #0d1017;
    }

    .poster-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .boardgame-card .poster-img {
      object-fit: contain;
      padding: 4px;
    }

    .placeholder-poster {
      font-size: 11px;
      color: var(--text-muted);
      text-align: center;
      padding: 8px;
    }

    .meta-wrap {
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      background: var(--surface);
    }

    .item-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text);
      line-height: 1.25;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-sub {
      font-size: 11px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
      gap: 4px;
    }

    .badge-status {
      position: absolute;
      top: 6px;
      right: 6px;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      box-shadow: 0 2px 4px rgba(0,0,0,0.6);
      z-index: 15;
    }
    .badge-bad { background: var(--danger); color: white; }
    .badge-improve { background: var(--warning); color: black; }

    /* Card quick action buttons */
    .card-actions {
      position: absolute;
      top: 6px;
      left: 6px;
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.15s ease;
      z-index: 20;
    }
    .item-card:hover .card-actions,
    .item-card.status-bad .card-actions,
    .item-card.status-improve .card-actions {
      opacity: 1;
    }

    .btn-mark {
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255,255,255,0.25);
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.1s, background 0.1s;
    }
    .btn-mark:hover { transform: scale(1.15); }
    .btn-mark.mark-bad:hover { background: var(--danger); }
    .btn-mark.mark-warn:hover { background: var(--warning); color: black; }
    .btn-mark.mark-ok:hover { background: var(--success); }

    /* Modal de detalle ampliado */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .modal-overlay.open { display: flex; }
    .modal-card {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: 12px;
      max-width: 760px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      box-shadow: 0 16px 48px rgba(0,0,0,0.8);
    }
    .modal-body {
      display: flex;
      flex-direction: row;
      gap: 24px;
      padding: 24px;
    }
    .modal-img-wrap {
      width: 280px;
      flex-shrink: 0;
      background: #000;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
    }
    .modal-img {
      width: 100%;
      height: auto;
      max-height: 420px;
      object-fit: contain;
    }
    .modal-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .modal-title { font-size: 20px; font-weight: 700; line-height: 1.2; }
    .modal-field { font-size: 13px; color: var(--text-muted); }
    .modal-field strong { color: var(--text); }
    .modal-notes-input {
      background: #0f1117;
      border: 1px solid var(--surface-border);
      color: var(--text);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      width: 100%;
      margin-top: 8px;
      outline: none;
    }

    /* Floating summary bar */
    .floating-bar {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(24, 28, 36, 0.96);
      backdrop-filter: blur(12px);
      border: 1px solid #3b82f6;
      border-radius: 30px;
      padding: 10px 20px;
      box-shadow: 0 12px 32px rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      gap: 16px;
      z-index: 99;
      font-size: 13px;
    }
    .floating-bar .count-pill {
      background: #252b38;
      padding: 4px 10px;
      border-radius: 20px;
      font-weight: 600;
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: #10b981;
      color: #fff;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s, transform 0.2s;
      z-index: 2000;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }
    .toast.show { opacity: 1; transform: translate(-50%, -10px); }
  </style>
</head>
<body>

  <header>
    <div class="top-bar">
      <div class="title-area">
        <h1>Auditoría Visual de Carátulas <span class="badge" id="totalCountBadge">4.349 obras</span></h1>
      </div>

      <div class="controls-group">
        <!-- Selector de Columnas Fijas (Mantiene la cuadrícula intacta) -->
        <div class="cols-selector" title="Número de columnas fijas (no se mueven de sitio)">
          <span style="color:var(--text-muted); margin-right:4px;">Cols:</span>
          <button class="col-btn" data-cols="4">4</button>
          <button class="col-btn" data-cols="6">6</button>
          <button class="col-btn active" data-cols="8">8</button>
          <button class="col-btn" data-cols="10">10</button>
          <button class="col-btn" data-cols="12">12</button>
        </div>

        <!-- Zoom Slider que escala como una foto -->
        <div class="zoom-slider-wrap" title="Escala la vista como una foto completa sin descuadrar columnas">
          <span>🔍 Zoom foto:</span>
          <button class="btn-zoom" id="btnZoomOut">–</button>
          <input type="range" id="zoomSlider" min="40" max="180" value="100" step="5">
          <button class="btn-zoom" id="btnZoomIn">+</button>
          <span id="zoomValueLabel" style="min-width: 44px; text-align: right; color: var(--text-muted);">100%</span>
        </div>

        <!-- Buscador -->
        <input type="text" id="searchInput" class="search-input" placeholder="Buscar título o id...">

        <!-- Botón exportar diagnóstico -->
        <div class="actions-bar">
          <button class="btn btn-primary" id="btnCopyReport">📋 Enviar Diagnóstico</button>
          <button class="btn btn-secondary" id="btnDownloadJson">💾 JSON</button>
        </div>
      </div>
    </div>

    <div class="tabs-bar">
      <!-- Filtros por estantería -->
      <div class="shelf-tabs">
        <button class="tab-btn active" data-shelf="all">Todas (<span id="count-all">0</span>)</button>
        <button class="tab-btn" data-shelf="movie">🎬 Cine (<span id="count-movie">0</span>)</button>
        <button class="tab-btn" data-shelf="series">📺 Series (<span id="count-series">0</span>)</button>
        <button class="tab-btn" data-shelf="book">📚 Libros (<span id="count-book">0</span>)</button>
        <button class="tab-btn" data-shelf="boardgame">🎲 Juegos (<span id="count-boardgame">0</span>)</button>
        <button class="tab-btn" data-shelf="artist">🎵 Artistas (<span id="count-artist">0</span>)</button>
      </div>

      <div class="filter-toggles">
        <button class="chip-toggle" id="filterMarkedBtn">📌 Solo marcadas (<span id="markedTotalBadge">0</span>)</button>
        <button class="chip-toggle" id="filterSuspectBtn">⚠️ Sospechosas / Fallbacks</button>
        <button class="btn btn-danger" style="padding: 4px 8px; font-size: 11px;" id="btnClearAll" title="Borrar todas las selecciones">Limpiar marcas</button>
      </div>
    </div>
  </header>

  <div class="viewport-outer" id="viewportOuter">
    <div class="stats-info">
      <div>Mostrando <strong id="visibleCount">0</strong> obras en cuadrícula fija. El zoom escala la cuadrícula entera **como una foto**, sin mover los ítems de columna.</div>
      <div style="display: flex; gap: 14px;">
        <span>❌ <strong>Mal / No corresponde</strong></span>
        <span>⚠️ <strong>Mejorable / Baja calidad</strong></span>
      </div>
    </div>

    <div class="cards-grid" id="cardsGrid"></div>
  </div>

  <!-- Barra flotante de diagnóstico -->
  <div class="floating-bar" id="floatingBar" style="display: none;">
    <span>Diagnóstico en curso:</span>
    <span class="count-pill" style="color: #ff858d;">❌ <span id="floatBadCount">0</span> erróneas</span>
    <span class="count-pill" style="color: #fcd34d;">⚠️ <span id="floatWarnCount">0</span> mejorables</span>
    <button class="btn btn-primary" id="btnCopyReportFloat" style="padding: 4px 12px; font-size: 12px;">📋 Copiar para el chat</button>
  </div>

  <!-- Modal detalle -->
  <div class="modal-overlay" id="modalOverlay">
    <div class="modal-card">
      <div class="modal-body">
        <div class="modal-img-wrap">
          <img src="" alt="" class="modal-img" id="modalImg">
        </div>
        <div class="modal-info">
          <h2 class="modal-title" id="modalTitle"></h2>
          <div class="modal-field">ID: <code id="modalId" style="background:#000; padding:2px 4px; border-radius:4px;"></code></div>
          <div class="modal-field">Tipo: <strong id="modalType"></strong> | Año: <strong id="modalYear"></strong></div>
          <div class="modal-field">Creador / Autor: <strong id="modalCreator"></strong></div>
          <div class="modal-field">Fuente de imagen: <strong id="modalImageSrc"></strong></div>
          <div class="modal-field">URL original: <a id="modalPosterLink" href="" target="_blank" style="color:var(--accent); word-break:break-all; font-size:11px;">Abrir original ↗</a></div>

          <div style="margin-top: 10px;">
            <label style="font-size: 12px; font-weight: 600;">Marcar estado:</label>
            <div style="display: flex; gap: 8px; margin-top: 6px;">
              <button class="btn btn-danger" id="modalBtnBad">❌ Está mal (no es de la obra)</button>
              <button class="btn btn-secondary" style="color: var(--warning); border-color: var(--warning);" id="modalBtnWarn">⚠️ Mejorable / Baja calidad</button>
              <button class="btn btn-secondary" id="modalBtnOk">✓ Correcta / Desmarcar</button>
            </div>
          </div>

          <div style="margin-top: 6px;">
            <label style="font-size: 12px; font-weight: 600;">Comentario o motivo (opcional):</label>
            <input type="text" id="modalNoteInput" class="modal-notes-input" placeholder="Ej: Es la cara de un autor, es un icono plano, recorte malo...">
          </div>
        </div>
      </div>
      <div style="padding: 12px 24px; border-top: 1px solid var(--surface-border); display: flex; justify-content: flex-end;">
        <button class="btn btn-secondary" id="modalBtnClose">Cerrar (Esc)</button>
      </div>
    </div>
  </div>

  <div class="toast" id="toastMessage">¡Diagnóstico copiado al portapapeles!</div>

  <script>
    const ITEMS = ${JSON.stringify(items)};

    const STORAGE_KEY = 'biblio_covers_audit_v1';
    let auditState = {};
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) auditState = JSON.parse(saved);
    } catch(e) {}

    function saveAuditState() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(auditState));
      } catch(e) {}
      updateUIIndicators();
    }

    let currentShelf = 'all';
    let searchQuery = '';
    let filterOnlyMarked = false;
    let filterOnlySuspect = false;
    let currentModalItem = null;
    let currentFixedCols = 8;
    let currentScale = 1;

    const cardsGrid = document.getElementById('cardsGrid');
    const viewportOuter = document.getElementById('viewportOuter');
    const zoomSlider = document.getElementById('zoomSlider');
    const zoomValueLabel = document.getElementById('zoomValueLabel');
    const btnZoomIn = document.getElementById('btnZoomIn');
    const btnZoomOut = document.getElementById('btnZoomOut');
    const searchInput = document.getElementById('searchInput');
    const visibleCount = document.getElementById('visibleCount');
    const markedTotalBadge = document.getElementById('markedTotalBadge');
    const filterMarkedBtn = document.getElementById('filterMarkedBtn');
    const filterSuspectBtn = document.getElementById('filterSuspectBtn');
    const floatingBar = document.getElementById('floatingBar');
    const floatBadCount = document.getElementById('floatBadCount');
    const floatWarnCount = document.getElementById('floatWarnCount');
    const btnCopyReport = document.getElementById('btnCopyReport');
    const btnCopyReportFloat = document.getElementById('btnCopyReportFloat');
    const btnDownloadJson = document.getElementById('btnDownloadJson');
    const btnClearAll = document.getElementById('btnClearAll');
    const toast = document.getElementById('toastMessage');

    // Modal
    const modalOverlay = document.getElementById('modalOverlay');
    const modalImg = document.getElementById('modalImg');
    const modalTitle = document.getElementById('modalTitle');
    const modalId = document.getElementById('modalId');
    const modalType = document.getElementById('modalType');
    const modalYear = document.getElementById('modalYear');
    const modalCreator = document.getElementById('modalCreator');
    const modalImageSrc = document.getElementById('modalImageSrc');
    const modalPosterLink = document.getElementById('modalPosterLink');
    const modalBtnBad = document.getElementById('modalBtnBad');
    const modalBtnWarn = document.getElementById('modalBtnWarn');
    const modalBtnOk = document.getElementById('modalBtnOk');
    const modalNoteInput = document.getElementById('modalNoteInput');
    const modalBtnClose = document.getElementById('modalBtnClose');

    // Conteo por estantería
    const counts = { all: ITEMS.length, movie: 0, series: 0, book: 0, boardgame: 0, artist: 0 };
    for (const it of ITEMS) {
      if (counts[it.type] !== undefined) counts[it.type]++;
    }
    for (const k of Object.keys(counts)) {
      const el = document.getElementById('count-' + k);
      if (el) el.textContent = counts[k];
    }

    // Zoom tipo FOTO: escala la vista completa sin mover columnas
    function setScale(pct) {
      pct = Math.max(40, Math.min(180, pct));
      currentScale = pct / 100;
      viewportOuter.style.transform = 'scale(' + currentScale + ')';
      viewportOuter.style.width = (100 / currentScale) + '%';
      zoomSlider.value = pct;
      zoomValueLabel.textContent = pct + '%';
    }

    zoomSlider.addEventListener('input', (e) => setScale(parseInt(e.target.value)));
    btnZoomIn.addEventListener('click', () => setScale(parseInt(zoomSlider.value) + 15));
    btnZoomOut.addEventListener('click', () => setScale(parseInt(zoomSlider.value) - 15));

    // Ctrl + Rueda de ratón para zoom de foto suave
    window.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 10 : -10;
        setScale(parseInt(zoomSlider.value) + delta);
      }
    }, { passive: false });

    // Selector de columnas fijas
    document.querySelectorAll('.col-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.col-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFixedCols = parseInt(btn.dataset.cols);
        document.documentElement.style.setProperty('--fixed-cols', currentFixedCols);
      });
    });

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentShelf = btn.dataset.shelf;
        renderGrid();
      });
    });

    // Filtros rápidos
    filterMarkedBtn.addEventListener('click', () => {
      filterOnlyMarked = !filterOnlyMarked;
      filterMarkedBtn.classList.toggle('active', filterOnlyMarked);
      renderGrid();
    });

    filterSuspectBtn.addEventListener('click', () => {
      filterOnlySuspect = !filterOnlySuspect;
      filterSuspectBtn.classList.toggle('active', filterOnlySuspect);
      renderGrid();
    });

    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderGrid();
    });

    btnClearAll.addEventListener('click', () => {
      if (confirm('¿Seguro que quieres borrar todas las marcas de auditoría?')) {
        auditState = {};
        saveAuditState();
        renderGrid();
      }
    });

    function isSuspect(item) {
      if (!item.posterUrl) return true;
      if (item.imageSrc === 'generated') return true;
      if (item.posterUrl.includes('wikimedia') || item.imageSrc.includes('wikimedia')) return true;
      return false;
    }

    function renderGrid() {
      const q = searchQuery;
      const filtered = ITEMS.filter(it => {
        if (currentShelf !== 'all' && it.type !== currentShelf) return false;
        if (filterOnlyMarked && !auditState[it.id]) return false;
        if (filterOnlySuspect && !isSuspect(it)) return false;
        if (q) {
          const matchTitle = (it.title || '').toLowerCase().includes(q);
          const matchId = (it.id || '').toLowerCase().includes(q);
          if (!matchTitle && !matchId) return false;
        }
        return true;
      });

      visibleCount.textContent = filtered.length;
      cardsGrid.innerHTML = '';

      const frag = document.createDocumentFragment();

      for (const it of filtered) {
        const mark = auditState[it.id];
        const card = document.createElement('div');
        card.className = 'item-card ' + (it.type === 'boardgame' ? 'boardgame-card ' : '') + 
          (mark?.status === 'bad' ? 'status-bad ' : '') + 
          (mark?.status === 'improve' ? 'status-improve ' : '');
        card.dataset.id = it.id;

        let badgeHtml = '';
        if (mark?.status === 'bad') {
          badgeHtml = '<div class="badge-status badge-bad">❌ Mal</div>';
        } else if (mark?.status === 'improve') {
          badgeHtml = '<div class="badge-status badge-improve">⚠️ Mejorar</div>';
        }

        const posterSrc = it.posterUrl || '';

        card.innerHTML = \`
          \${badgeHtml}
          <div class="card-actions">
            <button class="btn-mark mark-bad" title="Marcar como incorrecta" onclick="quickMark(event, '\${it.id}', 'bad')">❌</button>
            <button class="btn-mark mark-warn" title="Marcar como mejorable" onclick="quickMark(event, '\${it.id}', 'improve')">⚠️</button>
            \${mark ? \`<button class="btn-mark mark-ok" title="Desmarcar" onclick="quickMark(event, '\${it.id}', 'ok')">✓</button>\` : ''}
          </div>
          <div class="poster-wrap">
            \${posterSrc ? \`<img class="poster-img" src="\${posterSrc}" alt="\${it.title}" loading="lazy">\` : '<div class="placeholder-poster">Sin imagen</div>'}
          </div>
          <div class="meta-wrap">
            <div class="item-title" title="\${it.title}">\${it.title}</div>
            <div class="item-sub">
              <span>\${it.year || ''}</span>
              <span style="opacity:0.7;">\${it.type}</span>
            </div>
          </div>
        \`;

        card.addEventListener('click', (e) => {
          if (e.target.closest('.card-actions')) return;
          openModal(it);
        });

        frag.appendChild(card);
      }

      cardsGrid.appendChild(frag);
      updateUIIndicators();
    }

    window.quickMark = function(e, id, status) {
      e.stopPropagation();
      if (status === 'ok') {
        delete auditState[id];
      } else {
        const prev = auditState[id] || {};
        auditState[id] = { status, note: prev.note || '', updatedAt: new Date().toISOString() };
      }
      saveAuditState();
      renderGrid();
    };

    function updateUIIndicators() {
      let bad = 0;
      let warn = 0;
      for (const k of Object.keys(auditState)) {
        if (auditState[k].status === 'bad') bad++;
        if (auditState[k].status === 'improve') warn++;
      }
      const total = bad + warn;
      markedTotalBadge.textContent = total;
      floatBadCount.textContent = bad;
      floatWarnCount.textContent = warn;

      if (total > 0) {
        floatingBar.style.display = 'flex';
      } else {
        floatingBar.style.display = 'none';
      }
    }

    function openModal(it) {
      currentModalItem = it;
      const mark = auditState[it.id] || {};
      modalImg.src = it.posterUrl || '';
      modalTitle.textContent = it.title;
      modalId.textContent = it.id;
      modalType.textContent = it.type;
      modalYear.textContent = it.year || 'N/A';
      modalCreator.textContent = it.creator || 'N/A';
      modalImageSrc.textContent = it.imageSrc || 'N/A';
      modalPosterLink.href = it.posterUrl || '#';
      modalNoteInput.value = mark.note || '';
      modalOverlay.classList.add('open');
    }

    function closeModal() {
      if (currentModalItem && modalNoteInput.value.trim()) {
        const mark = auditState[currentModalItem.id];
        if (mark) {
          mark.note = modalNoteInput.value.trim();
          saveAuditState();
        }
      }
      modalOverlay.classList.remove('open');
      currentModalItem = null;
    }

    modalBtnClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalOverlay.classList.contains('open')) closeModal();
    });

    modalBtnBad.addEventListener('click', () => {
      if (!currentModalItem) return;
      auditState[currentModalItem.id] = {
        status: 'bad',
        note: modalNoteInput.value.trim(),
        updatedAt: new Date().toISOString()
      };
      saveAuditState();
      renderGrid();
      closeModal();
    });

    modalBtnWarn.addEventListener('click', () => {
      if (!currentModalItem) return;
      auditState[currentModalItem.id] = {
        status: 'improve',
        note: modalNoteInput.value.trim(),
        updatedAt: new Date().toISOString()
      };
      saveAuditState();
      renderGrid();
      closeModal();
    });

    modalBtnOk.addEventListener('click', () => {
      if (!currentModalItem) return;
      delete auditState[currentModalItem.id];
      saveAuditState();
      renderGrid();
      closeModal();
    });

    function generateDiagnosticReport() {
      const keys = Object.keys(auditState);
      if (keys.length === 0) {
        alert('Aún no has marcado ninguna obra. Marca las que veas mal o mejorables y luego pulsa este botón.');
        return null;
      }

      const badList = [];
      const warnList = [];

      for (const id of keys) {
        const entry = auditState[id];
        const item = ITEMS.find(i => i.id === id);
        const obj = {
          id,
          title: item ? item.title : id,
          type: item ? item.type : 'unknown',
          year: item ? item.year : '',
          posterUrl: item ? item.posterUrl : '',
          note: entry.note || (entry.status === 'bad' ? 'Imagen errónea / no es de la obra' : 'Mejorable / baja resolución')
        };
        if (entry.status === 'bad') badList.push(obj);
        else warnList.push(obj);
      }

      let md = '# Diagnóstico de Carátulas para Antigravity\\n\\n';
      md += \`Total marcadas: \${keys.length} (\${badList.length} erróneas, \${warnList.length} mejorables)\\n\\n\`;

      if (badList.length > 0) {
        md += '### ❌ Carátulas erróneas (no corresponden a la obra)\\n';
        for (const item of badList) {
          md += \`- [\${item.type}] **\${item.title}** (\${item.id}): \${item.note}\\n\`;
        }
        md += '\\n';
      }

      if (warnList.length > 0) {
        md += '### ⚠️ Carátulas mejorables (baja calidad, recorte o edición fea)\\n';
        for (const item of warnList) {
          md += \`- [\${item.type}] **\${item.title}** (\${item.id}): \${item.note}\\n\`;
        }
        md += '\\n';
      }

      return { md, json: { bad: badList, warn: warnList, generatedAt: new Date().toISOString() } };
    }

    function copyToClipboard(text) {
      navigator.clipboard.writeText(text).then(() => {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
      }).catch(err => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
      });
    }

    function handleCopy() {
      const report = generateDiagnosticReport();
      if (!report) return;
      copyToClipboard(report.md);
    }

    btnCopyReport.addEventListener('click', handleCopy);
    btnCopyReportFloat.addEventListener('click', handleCopy);

    btnDownloadJson.addEventListener('click', () => {
      const report = generateDiagnosticReport();
      if (!report) return;
      const blob = new Blob([JSON.stringify(report.json, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'diagnostico-caratulas-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    renderGrid();
  </script>
</body>
</html>
`

writeFileSync(OUT_FILE, html, 'utf8')
writeFileSync(PUBLIC_OUT, html, 'utf8')
console.log('✓ audit-gallery.html regenerado con zoom de foto y columnas fijas.')
