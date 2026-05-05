/* content.js for Web Annotator */

if (!window.waAnnotatorInjected) {
  window.waAnnotatorInjected = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "ping") {
      sendResponse({ status: "ok" });
    } else if (request.action === "toggle") {
      toggleExtension();
    }
  });

  let isVisible = true;
  let canvas;
  let currentLayerId = 'layer-1';
  let layerIndexCounter = 1;
  let layers = []; // Array of { id, name, visible }
  let currentTool = 'page';

  const ICONS = {
    page: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><rect x="5" y="2" width="14" height="20" rx="7"></rect><line x1="12" y1="6" x2="12" y2="10"></line></svg>`,
    cursor: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><polygon points="3 3 10.5 21 13.5 13.5 21 10.5 3 3"></polygon></svg>`,
    pen: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.5" fill="none"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`,
    squiggleStandard: `<svg viewBox="0 0 40 20" width="28" height="14" stroke="currentColor" stroke-width="4.5" fill="none" stroke-linecap="round"><path d="M 5 10 C 13 -1, 27 21, 35 10"></path></svg>`,
    squigglePressure: `<svg viewBox="0 0 40 20" width="28" height="14" fill="currentColor" stroke="currentColor" stroke-width="1.5"><path d="M 4 10 C 13 -3, 27 23, 36 10 C 26 27, 14 -7, 4 10 Z"></path></svg>`,
    highlight: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.5" fill="none" class="wa-icon"><path d="M18 2l4 4-10 10H8v-4L18 2z"></path><path d="M8 12L4 16v4h4l4-4"></path><line x1="2" y1="22" x2="22" y2="22" stroke-width="2"></line></svg>`,
    eraser: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.5" fill="none"><path d="M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L20 9C20.5 9.5 20.5 10.5 20 11L11 20"></path><line x1="16" y1="15" x2="10" y2="9"></line></svg>`,
    eraserPixel: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="13" r="7"></circle><line x1="6" y1="10.5" x2="14" y2="18"></line><line x1="7" y1="20" x2="21" y2="20"></line></svg>`,
    rect: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.5" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>`,
    circle: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.5" fill="none"><circle cx="12" cy="12" r="9"></circle></svg>`,
    triangle: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.5" fill="none"><polygon points="12 3 22 21 2 21"></polygon></svg>`,
    rectFilled: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>`,
    circleFilled: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="9"></circle></svg>`,
    triangleFilled: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="none"><polygon points="12 3 22 21 2 21"></polygon></svg>`,
    styleFill: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none"><rect x="2" y="2" width="20" height="20" rx="3"></rect></svg>`,
    styleStroke: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="2" width="20" height="20" rx="3"></rect></svg>`,
    text: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.5" fill="none"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>`,
    add: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    eye: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    eyeOff: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`,
    trash: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    chevronLeft: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`,
    chevronRight: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`,
    size: `<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="8"></circle></svg>`,
    opacity: `<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="8"></circle><path d="M12 4v16a8 8 0 0 0 0-16z" fill="currentColor"></path></svg>`,
    download: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
    cloudSync: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><path d="m14 14-2-2-2 2"/><path d="M12 12v7"/></svg>`,
    cloudOff: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
    database: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>`
  };

  const CUSTOM_CURSORS = {
    cursor: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="%23333333" stroke="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path></svg>') 3 3, default`,
    pen: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="white" stroke="%23333333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>') 2 22, crosshair`,
    highlight: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23333333" stroke-width="2"><line x1="12" y1="0" x2="12" y2="24"></line><line x1="0" y1="12" x2="24" y2="12"></line></svg>') 12 12, crosshair`,
    rect: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23333333" stroke-width="1.5"><line x1="8" y1="1" x2="8" y2="15"></line><line x1="1" y1="8" x2="15" y2="8"></line><rect x="12" y="12" width="10" height="10" rx="2"></rect></svg>') 8 8, crosshair`,
    circle: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23333333" stroke-width="1.5"><line x1="8" y1="1" x2="8" y2="15"></line><line x1="1" y1="8" x2="15" y2="8"></line><circle cx="18" cy="18" r="5"></circle></svg>') 8 8, crosshair`,
    triangle: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23333333" stroke-width="1.5"><line x1="8" y1="1" x2="8" y2="15"></line><line x1="1" y1="8" x2="15" y2="8"></line><polygon points="18 13 23 22 13 22"></polygon></svg>') 8 8, crosshair`,
    text: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23333333" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>') 12 12, text`,
    eraser: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="white" stroke="%23333333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H7L3 16a2 2 0 0 1 0-2.8L13 3.2a2 2 0 0 1 2.8 0L20.8 8.2a2 2 0 0 1 0 2.8L12 20"></path><line x1="16" y1="15" x2="10" y2="9"></line></svg>') 0 22, pointer`
  };

  let isFillMode = true; // true = filled shapes, false = stroked (outline) shapes

  let toolOpacities = {
    pen: 1,
    'pressure-pen': 1,
    highlight: 0.5,
    rect: 1,
    circle: 1,
    triangle: 1,
    text: 1
  };

  // Pixel eraser state
  let pixelEraserActive = false;
  let pixelEraserPoints = [];
  let lastDrawPoint = null; // Stores last point for Shift-click line connection
  
  let isAutoSave = false;
  
  // History & Undo State
  let historyStack = [];
  let historyIndex = -1;
  let isHistoryAction = false;
  const MAX_HISTORY = 30;
  
  // Clipboard State
  let clipboard = null;
  let pasteOffset = 0;

  function getStoreKey() {
    return 'wa_saves_' + window.location.href.split('#')[0];
  }

  function saveHistory() {
     if (!canvas || isHistoryAction) return;
     const state = {
         canvas: canvas.toJSON(['layerId', 'id', 'p']),
         layers: JSON.parse(JSON.stringify(layers)),
         currentLayerId: currentLayerId,
         layerIndexCounter: layerIndexCounter
     };
     
     if (historyIndex < historyStack.length - 1) {
         historyStack = historyStack.slice(0, historyIndex + 1);
     }
     
     historyStack.push(state);
     if (historyStack.length > MAX_HISTORY) {
         historyStack.shift();
     } else {
         historyIndex++;
     }
  }

  function undo() {
      if (historyIndex > 0) {
          isHistoryAction = true;
          historyIndex--;
          const state = historyStack[historyIndex];
          
          layers = JSON.parse(JSON.stringify(state.layers));
          currentLayerId = state.currentLayerId;
          layerIndexCounter = state.layerIndexCounter;
          
          canvas.loadFromJSON(state.canvas, () => {
              canvas.renderAll();
              renderLayers();
              updateSliderStates();
              isHistoryAction = false;
              saveToStorage();
          });
      }
  }

  function redo() {
      if (historyIndex < historyStack.length - 1) {
          isHistoryAction = true;
          historyIndex++;
          const state = historyStack[historyIndex];
          
          layers = JSON.parse(JSON.stringify(state.layers));
          currentLayerId = state.currentLayerId;
          layerIndexCounter = state.layerIndexCounter;
          
          canvas.loadFromJSON(state.canvas, () => {
              canvas.renderAll();
              renderLayers();
              updateSliderStates();
              isHistoryAction = false;
              saveToStorage();
          });
      }
  }

  function saveToStorage() {
     if (!isAutoSave || !canvas) return;
     
     // Garbage Collection: If user clears everything, wipe the database record automatically
     if (canvas.getObjects().length === 0 && layers.length <= 1) {
         chrome.storage.local.remove(getStoreKey());
         return;
     }

     const state = {
         canvas: canvas.toJSON(['layerId', 'id', 'p']),
         layers: layers,
         currentLayerId: currentLayerId,
         layerIndexCounter: layerIndexCounter
     };
     chrome.storage.local.set({ [getStoreKey()]: state });
  }

  function saveState() {
     saveHistory();
     saveToStorage();
  }

  function loadState(callback) {
     chrome.storage.local.get([getStoreKey()], (res) => {
        const state = res[getStoreKey()];
        if (state && state.layers) {
            layers = state.layers;
            currentLayerId = state.currentLayerId || 'layer-1';
            layerIndexCounter = state.layerIndexCounter || 1;
            canvas.loadFromJSON(state.canvas, () => {
                canvas.renderAll();
                renderLayers();
                
                // Automatically toggle UI Sync to active if this page had pre-existing save data!
                isAutoSave = true;
                const syncBtn = document.getElementById('wa-btn-autosave');
                if (syncBtn) {
                   syncBtn.classList.add('active');
                   syncBtn.innerHTML = ICONS.cloudSync;
                   syncBtn.title = 'Auto-Save Sync (Enabled)';
                }

                if (callback) callback();
            });
        } else {
            if (callback) callback();
        }
     });
  }
  
  let toolSizes = {
    pen: 3,
    'pressure-pen': 3,
    highlight: 20, // Highlighters default much thicker
    rect: 3,
    circle: 3,
    triangle: 3,
    text: 3,
    'eraser-pixel': 20 // Pixel eraser default size
  };
  
  function getToolSize() {
    return toolSizes[currentTool] !== undefined ? toolSizes[currentTool] : 3;
  }
  
  function getToolOpacity() {
    return toolOpacities[currentTool] !== undefined ? toolOpacities[currentTool] : 1;
  }
  
  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function updateSliderStates() {
    const sizeContainer = document.getElementById('wa-brush-size')?.closest('.wa-slider-container');
    const opacityContainer = document.getElementById('wa-opacity')?.closest('.wa-slider-container');
    if (!sizeContainer || !opacityContainer) return;

    const activeObj = canvas?.getActiveObject();
    let sizeEnabled = false;
    let opacityEnabled = false;

    if (currentTool === 'pen' || currentTool === 'pressure-pen' || currentTool === 'highlight') {
      sizeEnabled = true;
      opacityEnabled = true;
    } else if (currentTool === 'eraser-pixel') {
      sizeEnabled = true; // brush size controls eraser radius
      opacityEnabled = false;
    } else if (currentTool === 'rect' || currentTool === 'circle' || currentTool === 'triangle' || currentTool === 'text') {
      // Size slider controls stroke width in stroke mode for shapes
      sizeEnabled = !isFillMode;
      opacityEnabled = true;
    } else if (currentTool === 'cursor') {
      if (activeObj) {
        opacityEnabled = true;
        if (activeObj.type === 'path') sizeEnabled = true;
      }
    }

    if (sizeEnabled) sizeContainer.classList.remove('disabled');
    else sizeContainer.classList.add('disabled');

    if (opacityEnabled) opacityContainer.classList.remove('disabled');
    else opacityContainer.classList.add('disabled');
  }

  function updatePreviewAndLabels() {
    const colorPicker = document.getElementById('wa-color-picker');
    const opacitySlider = document.getElementById('wa-opacity');
    const sizeSlider = document.getElementById('wa-brush-size');
    const colorPreview = document.getElementById('wa-color-preview');
    const valOpacity = document.getElementById('wa-val-opacity');
    const valSize = document.getElementById('wa-val-size');
    if (!colorPicker || !opacitySlider || !sizeSlider) return;

    const hex = colorPicker.value;
    const alpha = parseFloat(opacitySlider.value);
    const size = parseInt(sizeSlider.value, 10);
      
    if (colorPreview) {
      colorPreview.style.background = `linear-gradient(to right, ${hexToRgba(hex, alpha)} 50%, ${hex} 50%)`;
    }
    if (valOpacity) valOpacity.innerText = Math.round(alpha * 100) + '%';
    if (valSize) valSize.innerText = size + 'px';
      
    updateSliderStates();
  }

  function initUI() {
    const container = document.createElement('div');
    container.id = 'wa-ui-container';

    // Canvas Wrapper
    const wrapper = document.createElement('div');
    wrapper.id = 'wa-canvas-wrapper';
    
    // The canvas itself
    const canvasEl = document.createElement('canvas');
    canvasEl.id = 'wa-canvas';
    wrapper.appendChild(canvasEl);

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.id = 'wa-toolbar';
    toolbar.className = 'wa-panel';
    toolbar.innerHTML = `
      <button class="wa-btn active" title="Interact with Web Page (Scroll & Click Links)" data-tool="page">${ICONS.page}</button>
      <button class="wa-btn" title="Select Annotations (Move & Edit)" data-tool="cursor">${ICONS.cursor}</button>
      
      <div class="wa-tool-group" data-group="pen">
        <button class="wa-btn" title="Pen (Draw)" data-tool="pen">
          ${ICONS.pen}
          <div class="wa-tool-more"></div>
        </button>
        <div class="wa-flyout">
          <button class="wa-btn active" title="Standard Pen" data-tool="pen">${ICONS.squiggleStandard}</button>
          <button class="wa-btn" title="Pressure Brush" data-tool="pressure-pen">${ICONS.squigglePressure}</button>
        </div>
      </div>

      <button class="wa-btn" title="Highlight (Straight Line)" data-tool="highlight">${ICONS.highlight}</button>

      <div class="wa-tool-group" data-group="eraser">
        <button class="wa-btn" title="Eraser" data-tool="eraser">
          ${ICONS.eraser}
          <div class="wa-tool-more"></div>
        </button>
        <div class="wa-flyout">
          <button class="wa-btn active" title="Object Eraser (click to delete)" data-tool="eraser">${ICONS.eraser}</button>
          <button class="wa-btn" title="Pixel Eraser (paint to erase pixels)" data-tool="eraser-pixel">${ICONS.eraserPixel}</button>
        </div>
      </div>

      <div class="wa-tool-group" data-group="shape">
        <button class="wa-btn" title="Rectangle" data-tool="rect">
          ${ICONS.rectFilled}
          <div class="wa-tool-more"></div>
        </button>
        <div class="wa-flyout wa-flyout-shape-panel">
          <div class="wa-flyout-row">
            <button class="wa-btn active" title="Rectangle" data-tool="rect">${ICONS.rect}</button>
            <button class="wa-btn" title="Circle" data-tool="circle">${ICONS.circle}</button>
            <button class="wa-btn" title="Triangle" data-tool="triangle">${ICONS.triangle}</button>
          </div>
          <div class="wa-flyout-divider"></div>
          <div class="wa-flyout-row">
            <button class="wa-btn active" id="wa-style-fill" title="Filled (Solid)">${ICONS.styleFill}</button>
            <button class="wa-btn" id="wa-style-stroke" title="Stroke (Outline)">${ICONS.styleStroke}</button>
          </div>
        </div>
      </div>

      <button class="wa-btn" title="Text" data-tool="text">${ICONS.text}</button>
      <div class="wa-separator"></div>
      <div class="wa-color-wrapper" title="Color Picker">
        <div id="wa-color-preview"></div>
        <input type="color" id="wa-color-picker" value="#18A0FB">
      </div>
      
      <div class="wa-sliders-row">
        <div class="wa-slider-container" title="Opacity (Transparency)">
          <div class="wa-slider-icon">${ICONS.opacity}</div>
          <div class="wa-slider-wrapper">
             <input type="range" id="wa-opacity" min="0.1" max="1" step="0.1" value="1">
          </div>
          <div class="wa-slider-value" id="wa-val-opacity">100%</div>
        </div>
        <div class="wa-slider-container" title="Brush Size">
          <div class="wa-slider-icon">${ICONS.size}</div>
          <div class="wa-slider-wrapper">
             <input type="range" id="wa-brush-size" min="1" max="50" step="1" value="3">
          </div>
          <div class="wa-slider-value" id="wa-val-size">3px</div>
        </div>
      </div>
    `;
    
    const tbToggle = document.createElement('button');
    tbToggle.className = 'wa-toggle-btn';
    tbToggle.innerHTML = ICONS.chevronLeft;
    tbToggle.onclick = () => {
      toolbar.classList.toggle('collapsed');
      tbToggle.innerHTML = toolbar.classList.contains('collapsed') ? ICONS.chevronRight : ICONS.chevronLeft;
    };
    toolbar.appendChild(tbToggle);

    // Layers
    const layersPanel = document.createElement('div');
    layersPanel.id = 'wa-layers';
    layersPanel.className = 'wa-panel';
    layersPanel.innerHTML = `
       <div class="wa-layer-header">
         <h3>Layers</h3>
         <div class="wa-header-actions">
           <button class="wa-btn-small" id="wa-btn-autosave" title="Auto-Save Sync (Disabled)">${ICONS.cloudOff}</button>
           <button class="wa-btn-small" id="wa-btn-export" title="Export as Image">${ICONS.download}</button>
           <button class="wa-btn-small" id="wa-add-layer" title="New Layer">${ICONS.add}</button>
         </div>
       </div>
       <div id="wa-layers-list"></div>
    `;

    const lpToggle = document.createElement('button');
    lpToggle.className = 'wa-toggle-btn';
    lpToggle.innerHTML = ICONS.chevronRight;
    lpToggle.onclick = () => {
      layersPanel.classList.toggle('collapsed');
      lpToggle.innerHTML = layersPanel.classList.contains('collapsed') ? ICONS.chevronLeft : ICONS.chevronRight;
    };
    layersPanel.appendChild(lpToggle);

    container.appendChild(wrapper);
    container.appendChild(toolbar);
    container.appendChild(layersPanel);
    document.body.appendChild(container);

    initFabric(canvasEl);
    bindEvents(toolbar, layersPanel);
    
    // Attempt to load from storage or initialize default Layer 1
    loadState(() => {
        if (layers.length === 0) {
            addLayer('Layer 1');
        } else {
            saveHistory(); // capture the initial state after loading
        }
    });
  }

  function initFabric(canvasEl) {
    fabric.PressurePenBrush = fabric.util.createClass(fabric.BaseBrush, {
      color: "#000",
      width: 10,
      initialize: function(canvas) {
        this.canvas = canvas;
        this.points = [];
      },
      onMouseDown: function(pointer, options) {
        const pressure = (options.e.pointerType === 'pen' ? options.e.pressure : 0.8) || 0.8;
        this.points = [{ x: pointer.x, y: pointer.y, p: pressure }];
        this.canvas.clearContext(this.canvas.contextTop);
      },
      onMouseMove: function(pointer, options) {
        if (this.points.length > 0) {
          const pressure = (options.e.pointerType === 'pen' ? options.e.pressure : null);
          this.points.push({ x: pointer.x, y: pointer.y, p: pressure });
          this.canvas.clearContext(this.canvas.contextTop);
          this.renderPoints(this.canvas.contextTop, this.points);
        }
      },
      onMouseUp: function(options) {
        this.canvas.clearContext(this.canvas.contextTop);
        if (this.points.length > 1) {
          this.createFabricImage();
        }
        this.points = [];
      },
      renderPoints: function(ctx, points) {
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        for(let i = 1; i < points.length; i++) {
            const p1 = points[i-1];
            const p2 = points[i];
            
            let pressure = p2.p;
            if (pressure === null) { 
               const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
               const targetP = Math.max(0.1, 1 - (dist / 40)); 
               const prevP = p1.p === null ? 0.8 : p1.p;
               pressure = prevP * 0.8 + targetP * 0.2;
               p2.p = pressure;
            }
            
            const w = this.width * pressure;
            ctx.lineWidth = w;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(p2.x, p2.y, w / 2, 0, Math.PI * 2);
            ctx.fill();
        }
      },
      createFabricImage: function() {
        const pad = this.width;
        const minX = Math.min(...this.points.map(p => p.x)) - pad;
        const minY = Math.min(...this.points.map(p => p.y)) - pad;
        const maxX = Math.max(...this.points.map(p => p.x)) + pad;
        const maxY = Math.max(...this.points.map(p => p.y)) + pad;
        const w = maxX - minX;
        const h = maxY - minY;
        if (w <= 0 || h <= 0) return;

        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = w;
        tmpCanvas.height = h;
        const ctx = tmpCanvas.getContext('2d');
        const offsetPts = this.points.map(p => ({ x: p.x - minX, y: p.y - minY, p: p.p }));
        
        this.renderPoints(ctx, offsetPts);

        fabric.Image.fromURL(tmpCanvas.toDataURL(), (img) => {
            img.set({ left: minX, top: minY, layerId: currentLayerId });
            this.canvas.add(img);
        });
      }
    });

    // Canvas strictly anchors to the physical viewport bounds to emulate rendering over SPAs and docs
    canvasEl.width = window.innerWidth;
    canvasEl.height = window.innerHeight;

    canvas = new fabric.Canvas('wa-canvas', {
      isDrawingMode: false,
      selection: false,
      width: window.innerWidth,
      height: window.innerHeight
    });

    // Shift-constrained drawing logic (Photoshop style)
    // Intercepts pointer coordinates globally when Shift is held during drawing
    const originalGetPointer = canvas.getPointer;
    canvas.getPointer = function(e, ignoreZoom) {
      const pointer = originalGetPointer.call(this, e, ignoreZoom);
      if (e && e.shiftKey) {
        let lastPoint = null;
        // Case 1: Fabric's free drawing (Pen / Pressure Pen)
        if (this.isDrawingMode && this.freeDrawingBrush && this.freeDrawingBrush._points && this.freeDrawingBrush._points.length > 0) {
          lastPoint = this.freeDrawingBrush._points[this.freeDrawingBrush._points.length - 1];
        } 
        // Case 2: Custom Pixel Eraser
        else if (pixelEraserActive && pixelEraserPoints.length > 0) {
          lastPoint = pixelEraserPoints[pixelEraserPoints.length - 1];
        }
        // Case 3: Highlight Tool (Manual Straight Line)
        else if (isDrawingLine && currentLine) {
          lastPoint = { x: currentLine.x1, y: currentLine.y1 };
        }

        // We removed the axis-snapping (horizontal/vertical) here as requested.
        // The Shift-click connecting logic is handled in mouse:down.
      }
      return pointer;
    };

    // Resize listener for window boundary changes without polling document geometries natively
    window.addEventListener('resize', () => {
      canvas.setWidth(window.innerWidth);
      canvas.setHeight(window.innerHeight);
      canvas.renderAll();
    });

    // Advanced Global Scroll Capture to pan the virtual canvas context manually seamlessly over SPA inner-DIV scrolls (e.g., Google Docs)
    let currentScrollX = 0;
    let currentScrollY = 0;
    
    window.addEventListener('scroll', (e) => {
      let updated = false;
      if (e.target === document || e.target === document.documentElement || e.target === document.body) {
        currentScrollX = window.scrollX || document.documentElement.scrollLeft;
        currentScrollY = window.scrollY || document.documentElement.scrollTop;
        updated = true;
      } else if (e.target && e.target.clientWidth && e.target.clientHeight) {
        // Dynamically detect if a scrolled internal frame is the primary "page" container
        const area = e.target.clientWidth * e.target.clientHeight;
        const screenArea = window.innerWidth * window.innerHeight;
        // If the scrolling container covers more than 30% of your screen area, it's effectively the main app document pane
        if (area > screenArea * 0.3) {
           currentScrollX = e.target.scrollLeft;
           currentScrollY = e.target.scrollTop;
           updated = true;
        }
      }
      
      if (updated && canvas) {
         // Transform canvas viewport opposite to scrolling allowing visual persistence mapping
         const vpt = canvas.viewportTransform;
         vpt[4] = -currentScrollX;
         vpt[5] = -currentScrollY;
         canvas.renderAll();
      }
    }, true); // Capture phase enables reliable hijacking of events on arbitrary complex shadow/virtual DOMs

    // Track objects added to preserve layer order and update UI
    canvas.on('object:added', (e) => {
       if (!e.target.layerId) {
          e.target.layerId = currentLayerId;
       }
       sortFabricObjects();
       renderLayers();
       saveState();
    });

    canvas.on('object:removed', () => {
       renderLayers();
       saveState();
    });
    
    canvas.on('object:modified', () => {
       saveState();
    });

    // Auto-switch layer when an object is selected
    const handleSelection = (e) => {
      if (e.selected && e.selected.length === 1) {
        const objLayerId = e.selected[0].layerId;
        if (currentLayerId !== objLayerId) {
          currentLayerId = objLayerId;
          renderLayers();
        }
      }
      updateSliderStates();
    };
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => updateSliderStates());

    let isDrawingLine = false;
    let currentLine = null;

    canvas.on('mouse:down', (options) => {
      const pointer = canvas.getPointer(options.e);

      // --- NEW: Photoshop-style Shift-Click Line Connection ---
      const isDrawingTool = (currentTool === 'pen' || currentTool === 'pressure-pen' || currentTool === 'eraser-pixel');
      if (options.e.shiftKey && lastDrawPoint && isDrawingTool) {
        if (currentTool === 'eraser-pixel') {
          pixelEraserPoints = [lastDrawPoint, pointer];
          applyPixelErasure();
          pixelEraserPoints = [];
        } else {
          const color = document.getElementById('wa-color-picker').value;
          const alpha = getToolOpacity();
          const size = parseInt(document.getElementById('wa-brush-size').value, 10);
          const path = new fabric.Path(`M ${lastDrawPoint.x} ${lastDrawPoint.y} L ${pointer.x} ${pointer.y}`, {
            stroke: hexToRgba(color, alpha),
            strokeWidth: size,
            fill: null,
            strokeLineCap: 'round',
            strokeLineJoin: 'round',
            layerId: currentLayerId,
            selectable: false,
            evented: false
          });
          canvas.add(path);
          saveState();
        }
        lastDrawPoint = pointer;
        
        // Temporarily disable drawing mode to prevent Fabric from starting a new free-draw path
        const wasDrawing = canvas.isDrawingMode;
        if (wasDrawing) {
          canvas.isDrawingMode = false;
          setTimeout(() => { canvas.isDrawingMode = true; }, 10);
        }
        return;
      }
      // Update last point for future connections
      lastDrawPoint = pointer;

      if (currentTool === 'highlight') {
        const pointer = canvas.getPointer(options.e);
        const color = document.getElementById('wa-color-picker').value;
        const size = parseInt(document.getElementById('wa-brush-size').value, 10);
        
        isDrawingLine = true;
        currentLine = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: hexToRgba(color, getToolOpacity()), // Map Opacity Setting via Rgba string directly into stroke
          strokeWidth: size, // Let the user accurately set the highlighter scaling
          strokeLineCap: 'square', // Square tip as requested
          selectable: false,
          evented: false,
          layerId: currentLayerId
        });
        canvas.add(currentLine);
        saveState();
      } else if (currentTool === 'eraser' && options.target) {
        canvas.remove(options.target);
      } else if (currentTool === 'eraser-pixel') {
        const pointer = canvas.getPointer(options.e);
        pixelEraserActive = true;
        pixelEraserPoints = [pointer];
        drawPixelEraserPreview(pointer);
      } else if (currentTool === 'rect') {
        const pointer = canvas.getPointer(options.e);
        addRectangle(pointer);
      } else if (currentTool === 'circle') {
        const pointer = canvas.getPointer(options.e);
        addCircle(pointer);
      } else if (currentTool === 'triangle') {
        const pointer = canvas.getPointer(options.e);
        addTriangle(pointer);
      } else if (currentTool === 'text') {
        const pointer = canvas.getPointer(options.e);
        addText(pointer);
      }
    });
    
    canvas.on('mouse:move', (options) => {
      const pointer = canvas.getPointer(options.e);

      // --- NEW: Photoshop-style Shift-Click Auxiliary Guide Line ---
      const isDrawingTool = (currentTool === 'pen' || currentTool === 'pressure-pen' || currentTool === 'eraser-pixel');
      // Idle means the mouse button is NOT pressed (more reliable than checking points arrays)
      const isIdle = !options.e.buttons;

      if (options.e.shiftKey && lastDrawPoint && isDrawingTool && isIdle) {
        const ctx = canvas.contextTop;
        canvas.clearContext(ctx);
        const vpt = canvas.viewportTransform;
        ctx.save();
        ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
        ctx.strokeStyle = 'rgba(120, 120, 120, 0.6)';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(lastDrawPoint.x, lastDrawPoint.y);
        ctx.lineTo(pointer.x, pointer.y);
        ctx.stroke();
        ctx.restore();
      } else if (isIdle) {
        // Only clear if we are idle (not drawing) to avoid flickering
        canvas.clearContext(canvas.contextTop);
      }

      if (isDrawingLine && currentTool === 'highlight' && currentLine) {
        const pointer = canvas.getPointer(options.e);
        currentLine.set({ x2: pointer.x, y2: pointer.y });
        canvas.renderAll();
      } else if (pixelEraserActive && currentTool === 'eraser-pixel') {
        const pointer = canvas.getPointer(options.e);
        pixelEraserPoints.push(pointer);
        drawPixelEraserPreview(pointer);
      }
    });

    canvas.on('mouse:up', () => {
      if (isDrawingLine && currentTool === 'highlight') {
        isDrawingLine = false;
        if (currentLine) {
           currentLine.setCoords(); // crucial for fabric hit detection since we manually mutated x2/y2
        }
        currentLine = null;
        saveState();
      } else if (pixelEraserActive && currentTool === 'eraser-pixel') {
        pixelEraserActive = false;
        canvas.clearContext(canvas.contextTop); // remove preview
        if (pixelEraserPoints.length > 0) {
          applyPixelErasure();
        }
        pixelEraserPoints = [];
      }
      
      // Update last point after any stroke ends
      lastDrawPoint = canvas.getPointer();
    });
    
    // Clear guide line when Shift is released
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift' && canvas) {
        canvas.clearContext(canvas.contextTop);
      }
    });
    
    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (!isVisible) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Delete/Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && currentTool === 'cursor') {
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length) {
          isHistoryAction = true;
          canvas.discardActiveObject();
          activeObjects.forEach(obj => canvas.remove(obj));
          isHistoryAction = false;
          saveState();
        }
      }

      // Ctrl+C (Copy)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && currentTool === 'cursor') {
        e.preventDefault();
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
          activeObject.clone((cloned) => {
            clipboard = cloned;
            pasteOffset = 20; // reset offset
          }, ['layerId', 'id', 'p']);
        }
      }

      // Ctrl+V (Paste)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && currentTool === 'cursor') {
        e.preventDefault();
        if (!clipboard) return;
        
        clipboard.clone((clonedObj) => {
            isHistoryAction = true;
            canvas.discardActiveObject();
            
            clonedObj.set({
                left: clonedObj.left + pasteOffset,
                top: clonedObj.top + pasteOffset,
                evented: true,
                selectable: true
            });
            
            if (clonedObj.type === 'activeSelection') {
                clonedObj.canvas = canvas;
                clonedObj.forEachObject((obj) => {
                    obj.set('layerId', currentLayerId);
                    canvas.add(obj);
                });
                clonedObj.setCoords();
            } else {
                clonedObj.set('layerId', currentLayerId);
                canvas.add(clonedObj);
            }
            
            pasteOffset += 20;
            canvas.setActiveObject(clonedObj);
            canvas.requestRenderAll();
            isHistoryAction = false;
            saveState();
        }, ['layerId', 'id', 'p']);
      }

      // Ctrl+Z (Undo) and Ctrl+Shift+Z / Ctrl+Y (Redo)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    });
  }

  // Sync the shape group's main button icon to the current shape + fill/stroke mode
  function updateShapeIcon() {
    const group = document.querySelector('[data-group="shape"]');
    if (!group) return;
    const mainBtn = group.querySelector('.wa-btn:not(.wa-flyout .wa-btn)');
    if (!mainBtn) return;

    const shape = mainBtn.getAttribute('data-tool'); // rect | circle | triangle
    let icon;
    if (isFillMode) {
      if (shape === 'rect')     icon = ICONS.rectFilled;
      else if (shape === 'circle')   icon = ICONS.circleFilled;
      else if (shape === 'triangle') icon = ICONS.triangleFilled;
    } else {
      if (shape === 'rect')     icon = ICONS.rect;
      else if (shape === 'circle')   icon = ICONS.circle;
      else if (shape === 'triangle') icon = ICONS.triangle;
    }
    if (icon) mainBtn.innerHTML = icon + '<div class="wa-tool-more"></div>';

    // Also sync the style toggle icons in the flyout row 2 to match the selected shape
    const fillBtn = document.getElementById('wa-style-fill');
    const strokeBtn = document.getElementById('wa-style-stroke');
    if (fillBtn && strokeBtn) {
      if (shape === 'rect') {
        fillBtn.innerHTML = ICONS.rectFilled;
        strokeBtn.innerHTML = ICONS.rect;
      } else if (shape === 'circle') {
        fillBtn.innerHTML = ICONS.circleFilled;
        strokeBtn.innerHTML = ICONS.circle;
      } else if (shape === 'triangle') {
        fillBtn.innerHTML = ICONS.triangleFilled;
        strokeBtn.innerHTML = ICONS.triangle;
      }
    }
  }

  // Sync eraser group main button icon to the selected eraser mode
  function updateEraserIcon() {
    const group = document.querySelector('[data-group="eraser"]');
    if (!group) return;
    const mainBtn = group.querySelector('.wa-btn:not(.wa-flyout .wa-btn)');
    if (!mainBtn) return;
    const tool = mainBtn.getAttribute('data-tool'); // 'eraser' or 'eraser-pixel'
    const icon = tool === 'eraser-pixel' ? ICONS.eraserPixel : ICONS.eraser;
    mainBtn.innerHTML = icon + '<div class="wa-tool-more"></div>';
  }

  // Sync pen group main button icon to the selected pen mode
  function updatePenIcon() {
    const group = document.querySelector('[data-group="pen"]');
    if (!group) return;
    const mainBtn = group.querySelector('.wa-btn:not(.wa-flyout .wa-btn)');
    if (!mainBtn) return;
    const tool = mainBtn.getAttribute('data-tool'); // 'pen' or 'pressure-pen'
    const icon = tool === 'pressure-pen' ? ICONS.squigglePressure : ICONS.pen;
    mainBtn.innerHTML = icon + '<div class="wa-tool-more"></div>';
  }

  // --- Pixel Eraser Helpers ---

  // Build a round cursor SVG matching the eraser size
  function buildEraserCircleCursor(sizePx) {
    const r = Math.max(4, Math.min(sizePx / 2, 60));
    const dim = r * 2 + 4;
    const cx = r + 2;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}"><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="rgba(0,0,0,0.6)" stroke-width="1.5"/><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="0.75"/></svg>`;
    return `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}') ${cx} ${cx}, crosshair`;
  }

  // Draws a live preview of the eraser path on the upper canvas
  function drawPixelEraserPreview(latestPoint) {
    const sz = toolSizes['eraser-pixel'] || 20;
    const ctx = canvas.contextTop;
    canvas.clearContext(ctx);
    if (pixelEraserPoints.length < 1) return;

    // Apply viewport transform so preview matches canvas pan
    const vpt = canvas.viewportTransform;
    ctx.save();
    ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);

    // Draw the eraser trail as a thick, semi-transparent line
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(120, 120, 120, 0.35)';
    ctx.lineWidth = sz;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pixelEraserPoints[0].x, pixelEraserPoints[0].y);
    for (let i = 1; i < pixelEraserPoints.length; i++) {
      ctx.lineTo(pixelEraserPoints[i].x, pixelEraserPoints[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Commits the pixel erasure: adds the eraser stroke as an inverted clipPath to affected objects
  function applyPixelErasure() {
    if (pixelEraserPoints.length < 2) return;
    const sz = toolSizes['eraser-pixel'] || 20;

    // 1. Construct path string manually for maximum reliability
    let pathStr = `M ${pixelEraserPoints[0].x} ${pixelEraserPoints[0].y}`;
    for (let i = 1; i < pixelEraserPoints.length; i++) {
      pathStr += ` L ${pixelEraserPoints[i].x} ${pixelEraserPoints[i].y}`;
    }
    
    let affectedAny = false;

    // 2. Apply as inverted clipPath to every object
    canvas.getObjects().forEach(obj => {
      // Only erase objects that belong to a layer (our annotations)
      if (!obj.layerId) return;
      
      // For now, apply to all objects to verify it works, then add back intersection optimization
      affectedAny = true;
      
      const pathClone = new fabric.Path(pathStr, {
        stroke: 'black',
        strokeWidth: sz,
        fill: null,
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
        absolutePositioned: true
      });

      if (obj.clipPath && obj.clipPath.isEraserGroup) {
        obj.clipPath.addWithUpdate(pathClone);
      } else {
        const group = new fabric.Group([pathClone], {
          inverted: true,
          absolutePositioned: true
        });
        group.isEraserGroup = true;
        obj.set('clipPath', group);
      }
      
      // Force re-render
      obj.set('dirty', true);
    });

    if (affectedAny) {
      canvas.requestRenderAll();
      saveState();
    }
  }

  function bindEvents(toolbar, layersPanel) {
    // Tool buttons logic
    const mainButtons = toolbar.querySelectorAll('.wa-btn:not(.wa-flyout .wa-btn)');
    mainButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        mainButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setTool(btn.getAttribute('data-tool'));
      });
    });

    // Flyout buttons logic (Photoshop-style swap)
    const flyoutBtns = toolbar.querySelectorAll('.wa-flyout .wa-btn');
    flyoutBtns.forEach(btn => {
      // Style buttons (no data-tool) are handled separately below
      if (!btn.hasAttribute('data-tool')) return;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const toolName = btn.getAttribute('data-tool');
        
        // Scope active state to the same row (or whole flyout for pen-style groups)
        const row = btn.closest('.wa-flyout-row');
        if (row) {
          row.querySelectorAll('.wa-btn').forEach(b => b.classList.remove('active'));
        } else {
          const group = btn.closest('.wa-tool-group');
          group.querySelectorAll('.wa-flyout .wa-btn').forEach(b => b.classList.remove('active'));
        }
        btn.classList.add('active');

        // Swap the tool assigned to the main button
        const group = btn.closest('.wa-tool-group');
        const mainBtn = group.querySelector('.wa-btn:not(.wa-flyout .wa-btn)');
        mainBtn.setAttribute('data-tool', toolName);
        
        // Let the mainBtn click logic handle activating the tool and UI states
        mainBtn.click();
        // Sync the main button icon for pen, shape and eraser groups
        updatePenIcon();
        updateShapeIcon();
        updateEraserIcon();
      });
    });

    // Color, Size, and Opacity change events
    const colorPicker = document.getElementById('wa-color-picker');
    const opacitySlider = document.getElementById('wa-opacity');
    const sizeSlider = document.getElementById('wa-brush-size');

    colorPicker.addEventListener('input', updatePreviewAndLabels);

    // Update drawing properties when color changes natively
    colorPicker.addEventListener('change', (e) => {
      const hex = e.target.value;
      const opacity = getToolOpacity();
      canvas.freeDrawingBrush.color = hexToRgba(hex, opacity);
      
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        if (activeObj.type === 'i-text') activeObj.set('fill', hex);
        else if (activeObj.type === 'rect') activeObj.set('fill', hex);
        else if (activeObj.type === 'path') activeObj.set('stroke', hex);
        canvas.renderAll();
      }
    });
    
    // Manage dynamic opacity slider
    opacitySlider.addEventListener('input', (e) => {
      updatePreviewAndLabels();
      const alpha = parseFloat(e.target.value);
      if (toolOpacities[currentTool] !== undefined) {
         toolOpacities[currentTool] = alpha;
      }
      
      if (currentTool === 'pen' || currentTool === 'pressure-pen') {
         canvas.freeDrawingBrush.color = hexToRgba(colorPicker.value, alpha);
      }
      
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        activeObj.set('opacity', alpha);
        canvas.renderAll();
      }
    });

    sizeSlider.addEventListener('input', (e) => {
      updatePreviewAndLabels();
      const sz = parseInt(e.target.value, 10);
      
      if (toolSizes[currentTool] !== undefined) {
         toolSizes[currentTool] = sz;
      }
      
      if (currentTool === 'pen' || currentTool === 'pressure-pen') {
         canvas.freeDrawingBrush.width = sz;
      } else if (currentTool === 'eraser-pixel') {
         // Update the circle cursor to reflect the new size
         const newCursor = buildEraserCircleCursor(sz);
         canvas.defaultCursor = newCursor;
         canvas.hoverCursor = newCursor;
      }
      
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj.type === 'path') {
         activeObj.set('strokeWidth', sz);
         canvas.renderAll();
      }
    });
    
    canvas.on('selection:cleared', () => updatePreviewAndLabels());

    // Initial UI state setup for the color and sizes matching Defaults
    updatePreviewAndLabels();

    // Fill / Stroke style buttons inside the shape flyout
    document.getElementById('wa-style-fill').addEventListener('click', (e) => {
      e.stopPropagation();
      if (isFillMode) return; // already active
      isFillMode = true;
      document.getElementById('wa-style-fill').classList.add('active');
      document.getElementById('wa-style-stroke').classList.remove('active');
      updateShapeIcon();
      updateSliderStates();
    });
    document.getElementById('wa-style-stroke').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!isFillMode) return; // already active
      isFillMode = false;
      document.getElementById('wa-style-stroke').classList.add('active');
      document.getElementById('wa-style-fill').classList.remove('active');
      updateShapeIcon();
      updateSliderStates();
    });

    // Adds a new layer
    document.getElementById('wa-add-layer').addEventListener('click', () => {
      layerIndexCounter++;
      addLayer(`Layer ${layerIndexCounter}`);
    });

    // Persistence and Export Actions
    document.getElementById('wa-btn-autosave').addEventListener('click', (e) => {
       const btn = e.currentTarget;
       isAutoSave = !isAutoSave;
       if (isAutoSave) {
          btn.classList.add('active');
          btn.innerHTML = ICONS.cloudSync;
          btn.title = 'Auto-Save Sync (Enabled)';
          saveState(); // Trigger a save immediately
       } else {
          btn.classList.remove('active');
          btn.innerHTML = ICONS.cloudOff;
          btn.title = 'Auto-Save Sync (Disabled)';
       }
    });

    document.getElementById('wa-btn-export').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const originalInner = btn.innerHTML;
      btn.innerHTML = `<span style="font-size:10px;">...</span>`;
      
      try {
        const uiContainer = document.getElementById('wa-ui-container');
        uiContainer.style.opacity = '0'; // Hide UI
        
        // Find main scroller by explicitly analyzing HTML DOM capabilities!
        let scroller = document.documentElement;
        if (scroller.scrollHeight <= window.innerHeight) {
           scroller = document.body;
        }
        
        const elements = document.querySelectorAll('*');
        let bestArea = 0;
        
        for (let el of elements) {
           if (el.scrollHeight > el.clientHeight) {
               const style = window.getComputedStyle(el);
               const isScrollable = (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay');
               
               // In some extreme SPAs they might hijack scrolling completely, 
               // but typically the true scrolling HTML block must have CSS overflow rules or be the body itself.
               if (isScrollable) {
                   const area = el.clientWidth * el.clientHeight;
                   // Pick the largest actual scrollable block over 30% of the screen
                   if (area > window.innerWidth * window.innerHeight * 0.3 && area > bestArea) {
                       bestArea = area;
                       scroller = el;
                   }
               }
           }
        }
        
        const rect = scroller.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const sLeft = rect.left;
        const sTop = (scroller === document.documentElement || scroller === document.body) ? 0 : rect.top;
        const sWidth = scroller.clientWidth || window.innerWidth;
        const sHeight = scroller.clientHeight || window.innerHeight;
        
        const scrollHeight = scroller.scrollHeight;
        const MathCeil = Math.ceil(scrollHeight / sHeight);
        
        const snapshots = [];
        const originalScroll = scroller.scrollTop;
        scroller.scrollTop = 0;
        
        // Let structural shifts settle
        await new Promise(r => setTimeout(r, 400));
        
        for (let i = 0; i < MathCeil; i++) {
           const dataUrl = await new Promise((resolve) => {
               chrome.runtime.sendMessage({ action: "captureVisibleTab" }, (response) => {
                   resolve(response ? response.dataUrl : null);
               });
           });
           
           if (!dataUrl) throw new Error("Background capture failed.");
           
           snapshots.push({
               src: dataUrl,
               y: scroller.scrollTop
           });
           
           if (i < MathCeil - 1) {
              scroller.scrollTop += sHeight;
              await new Promise(r => setTimeout(r, 500)); // wait for DOM virtual loading
           }
        }
        
        // Restore UI state
        scroller.scrollTop = originalScroll;
        uiContainer.style.opacity = '1';

        // Stitch using explicit high-res pixel multipliers to prevent Fabric/Canvas scaling conflicts
        const compositeDpr = window.devicePixelRatio || 1;
        const composite = document.createElement('canvas');
        composite.width = sWidth * compositeDpr; 
        composite.height = scrollHeight * compositeDpr;
        const ctx = composite.getContext('2d');
        
        for (let shot of snapshots) {
           const img = new Image();
           img.src = shot.src;
           await new Promise(r => img.onload = r);
           
           // Dynamically identify Chrome's background graphic buffer density
           const imgDpr = img.width / window.innerWidth;
           
           // Calculate exact crop dimensions from the native screen-captured buffer
           const cropX = sLeft * imgDpr;
           const cropY = sTop * imgDpr;
           const cropW = sWidth * imgDpr;
           const cropH = sHeight * imgDpr;
           
           // Map correctly to our composite High-Res matrix tracking absolute scroll progress
           ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, shot.y * compositeDpr, sWidth * compositeDpr, sHeight * compositeDpr);
        }
        
        // Render Fabric Layer accurately over the stitched map
        const originalVpt = canvas.viewportTransform.slice();
        const oldW = canvas.width;
        const oldH = canvas.height;
        
        canvas.setWidth(sWidth);
        canvas.setHeight(scrollHeight);
        // Reset pan but adjust mathematically to both top & left structural gaps!
        canvas.viewportTransform = [1,0,0,1, -sLeft, -sTop]; 
        canvas.renderAll();
        
        // Fabric's internal element is natively built at compositeDpr scale.
        // We forcibly map it to full bounds to ensure absolutely zero visual displacement!
        ctx.drawImage(canvas.getElement(), 0, 0, sWidth * compositeDpr, scrollHeight * compositeDpr);
        
        // Restore canvas
        canvas.setWidth(oldW);
        canvas.setHeight(oldH);
        canvas.viewportTransform = originalVpt;
        canvas.renderAll();
        
        const link = document.createElement('a');
        link.download = 'Web_Annotation_' + document.title.replace(/[^a-z0-9]/gi, '_') + '.png';
        link.href = composite.toDataURL('image/png', 1.0);
        link.click();
        
      } catch (err) {
         console.error("Export Failed:", err);
         alert("Hardware Export Failed. Please ensure the extension has sufficient permissions.");
         document.getElementById('wa-ui-container').style.opacity = '1';
      }
      
      btn.innerHTML = originalInner;
    });
  }

  function setTool(tool) {
    currentTool = tool;
    const wrapper = document.getElementById('wa-canvas-wrapper');
    
    // Refresh slider values visually to match currently chosen tool
    const opacitySlider = document.getElementById('wa-opacity');
    if (toolOpacities[tool] !== undefined) {
      opacitySlider.value = toolOpacities[tool];
    }
    
    const sizeSlider = document.getElementById('wa-brush-size');
    if (toolSizes[tool] !== undefined) {
      sizeSlider.value = toolSizes[tool];
    }
    
    updatePreviewAndLabels();

    // Default config
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.forEachObject(obj => { obj.selectable = false; obj.evented = false; });
    
    if (tool === 'page') {
      // Pass through clicks to page
      wrapper.classList.remove('interactive');
    } else {
      // Capture clicks on canvas
      wrapper.classList.add('interactive');
      
      // RESET: Prevent custom tool cursors (like Eraser) from bleeding into others
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'move';
      
      if (tool === 'pen' || tool === 'pressure-pen') {
        canvas.isDrawingMode = true;
        canvas.defaultCursor = CUSTOM_CURSORS.pen;
        canvas.freeDrawingCursor = CUSTOM_CURSORS.pen;
        
        if (tool === 'pressure-pen') {
            if (!canvas.pressureBrushInstance) canvas.pressureBrushInstance = new fabric.PressurePenBrush(canvas);
            canvas.freeDrawingBrush = canvas.pressureBrushInstance;
        } else {
            if (!canvas.defaultPencilBrush) canvas.defaultPencilBrush = new fabric.PencilBrush(canvas);
            canvas.freeDrawingBrush = canvas.defaultPencilBrush;
        }

        const color = document.getElementById('wa-color-picker').value;
        const alpha = getToolOpacity();
        canvas.freeDrawingBrush.color = hexToRgba(color, alpha);
        canvas.freeDrawingBrush.width = parseInt(document.getElementById('wa-brush-size').value, 10);
      } else if (tool === 'highlight') {
        canvas.forEachObject(obj => { obj.selectable = false; obj.evented = false; });
        canvas.defaultCursor = CUSTOM_CURSORS.highlight;
        canvas.hoverCursor = CUSTOM_CURSORS.highlight;
      } else if (tool === 'cursor') {
        canvas.selection = true;
        canvas.forEachObject(obj => { obj.selectable = true; obj.evented = true; });
        canvas.defaultCursor = CUSTOM_CURSORS.cursor;
        canvas.hoverCursor = CUSTOM_CURSORS.cursor;
      } else if (tool === 'eraser') {
        canvas.forEachObject(obj => { obj.selectable = false; obj.evented = true; }); // needs evented for click detection
        canvas.defaultCursor = CUSTOM_CURSORS.eraser;
        canvas.hoverCursor = CUSTOM_CURSORS.eraser;
      } else if (tool === 'eraser-pixel') {
        // Pixel eraser: no eventing needed on objects, use a custom circle cursor
        canvas.forEachObject(obj => { obj.selectable = false; obj.evented = false; });
        const sz = toolSizes['eraser-pixel'] || 20;
        canvas.defaultCursor = buildEraserCircleCursor(sz);
        canvas.hoverCursor = canvas.defaultCursor;
      } else if (tool === 'rect') {
        canvas.defaultCursor = CUSTOM_CURSORS.rect;
      } else if (tool === 'circle') {
        canvas.defaultCursor = CUSTOM_CURSORS.circle;
      } else if (tool === 'triangle') {
        canvas.defaultCursor = CUSTOM_CURSORS.triangle;
      } else if (tool === 'text') {
        canvas.defaultCursor = CUSTOM_CURSORS.text;
      }
    }
  }

  function addRectangle(pointer) {
    const color = document.getElementById('wa-color-picker').value;
    const size = parseInt(document.getElementById('wa-brush-size').value, 10);
    const rect = new fabric.Rect({
      left: pointer.x,
      top: pointer.y,
      fill: isFillMode ? color : 'transparent',
      stroke: isFillMode ? null : color,
      strokeWidth: isFillMode ? 0 : size,
      width: 100,
      height: 80,
      rx: 8,
      ry: 8,
      layerId: currentLayerId
    });
    canvas.add(rect);
    
    // Switch to cursor tool automatically after placing
    document.querySelector('[data-tool="cursor"]').click();
    canvas.setActiveObject(rect);
  }

  function addCircle(pointer) {
    const color = document.getElementById('wa-color-picker').value;
    const size = parseInt(document.getElementById('wa-brush-size').value, 10);
    const circle = new fabric.Circle({
      left: pointer.x,
      top: pointer.y,
      radius: 50,
      fill: isFillMode ? color : 'transparent',
      stroke: isFillMode ? null : color,
      strokeWidth: isFillMode ? 0 : size,
      layerId: currentLayerId
    });
    canvas.add(circle);
    
    document.querySelector('[data-tool="cursor"]').click();
    canvas.setActiveObject(circle);
  }

  function addTriangle(pointer) {
    const color = document.getElementById('wa-color-picker').value;
    const size = parseInt(document.getElementById('wa-brush-size').value, 10);
    const triangle = new fabric.Triangle({
      left: pointer.x,
      top: pointer.y,
      width: 100,
      height: 86,
      fill: isFillMode ? color : 'transparent',
      stroke: isFillMode ? null : color,
      strokeWidth: isFillMode ? 0 : size,
      layerId: currentLayerId
    });
    canvas.add(triangle);
    
    document.querySelector('[data-tool="cursor"]').click();
    canvas.setActiveObject(triangle);
  }

  function addText(pointer) {
    const color = document.getElementById('wa-color-picker').value;
    const text = new fabric.IText('Your Text', {
      left: pointer.x,
      top: pointer.y,
      fill: color,
      fontSize: 28,
      fontFamily: 'Inter',
      fontWeight: 600,
      layerId: currentLayerId
    });
    canvas.add(text);
    
    // Switch to cursor tool automatically after placing
    document.querySelector('[data-tool="cursor"]').click();
    canvas.setActiveObject(text);
    text.enterEditing();
    text.selectAll();
  }

  // --- Layer Management System ---
  function addLayer(name) {
    const id = 'layer-' + Date.now();
    layers.push({ id, name, visible: true });
    currentLayerId = id;
    renderLayers();
    saveState();
  }

  function removeLayer(id) {
    // Remove all objects belonging to this layer
    const objects = canvas.getObjects().filter(o => o.layerId === id);
    objects.forEach(o => canvas.remove(o));
    
    if (layers.length <= 1) return; // If it's the last layer, we just cleared it. Don't remove the layer structure.
    
    layers = layers.filter(l => l.id !== id);
    if (currentLayerId === id) {
      currentLayerId = layers[layers.length - 1].id;
    }
    renderLayers();
    saveState();
  }

  function toggleLayerVisible(id, btnElement) {
    const layer = layers.find(l => l.id === id);
    if (layer) {
      layer.visible = !layer.visible;
      btnElement.innerHTML = layer.visible ? ICONS.eye : ICONS.eyeOff;
      
      canvas.getObjects().forEach(o => {
        if (o.layerId === id) {
          o.visible = layer.visible;
        }
      });
      canvas.renderAll();
    }
  }

  function sortFabricObjects() {
    if (!canvas) return;
    canvas._objects.sort((a, b) => {
      const idxA = layers.findIndex(l => l.id === a.layerId);
      const idxB = layers.findIndex(l => l.id === b.layerId);
      // Fallback relative to each other if they belong to the same layer
      return idxA - idxB;
    });
    // This updates the internal indices of Fabric
    canvas.renderAll();
  }

  let draggedLayerIndex = null;

  function renderLayers() {
    const list = document.getElementById('wa-layers-list');
    if (!list) return;
    list.innerHTML = '';
    
    // Render in reverse so the newest/top layer is shown at the top of the list
    const reversedLayers = [...layers].reverse();
    
    reversedLayers.forEach((layer, uiIndex) => {
      const realIndex = layers.length - 1 - uiIndex;
      
      const item = document.createElement('div');
      item.className = 'wa-layer-item' + (currentLayerId === layer.id ? ' active' : '');
      item.draggable = true;
      
      item.addEventListener('dragstart', (e) => {
        draggedLayerIndex = realIndex;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => item.classList.add('dragging'), 0);
      });
      
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        draggedLayerIndex = null;
      });
      
      item.addEventListener('dragover', (e) => {
        e.preventDefault(); // needed to allow drop
      });
      
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedLayerIndex !== null && draggedLayerIndex !== realIndex) {
          const draggedItem = layers.splice(draggedLayerIndex, 1)[0];
          layers.splice(realIndex, 0, draggedItem);
          sortFabricObjects();
          renderLayers();
        }
      });
      
      const objCount = canvas ? canvas.getObjects().filter(o => o.layerId === layer.id).length : 0;
      
      const name = document.createElement('div');
      name.className = 'wa-layer-name';
      
      const titleSpan = document.createElement('span');
      titleSpan.innerText = layer.name;
      titleSpan.title = "Double-click to rename";
      
      const metaSpan = document.createElement('span');
      metaSpan.className = 'wa-layer-meta';
      metaSpan.innerText = `(${objCount} objs)`;
      
      name.appendChild(titleSpan);
      name.appendChild(metaSpan);
      
      item.addEventListener('click', (e) => {
        // Prevent layer switch if clicking the toggle button, delete button, or input box
        if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && currentLayerId !== layer.id) {
           currentLayerId = layer.id;
           renderLayers();
        }
      });
      
      titleSpan.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const input = document.createElement('input');
        input.type = 'text';
        input.value = layer.name;
        input.style.width = '100px';
        input.style.background = '#fff';
        input.style.border = '1px solid #18a0fb';
        input.style.color = '#333';
        input.style.outline = 'none';
        input.style.borderRadius = '4px';
        input.style.padding = '2px 4px';

        const finishRename = () => {
          if (input.value.trim().length > 0) {
            layer.name = input.value.trim();
          }
          renderLayers();
          saveState();
        };

        input.onblur = finishRename;
        input.onkeydown = (k) => { if (k.key === 'Enter') finishRename(); };

        name.replaceChild(input, titleSpan);
        input.focus();
        input.select();
      });

      const controls = document.createElement('div');
      controls.className = 'wa-layer-controls';

      // Toggle visibility button
      const visBtn = document.createElement('button');
      visBtn.innerHTML = layer.visible ? ICONS.eye : ICONS.eyeOff;
      visBtn.title = "Toggle Visibility";
      visBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLayerVisible(layer.id, visBtn);
      });

      // Delete layer button
      const delBtn = document.createElement('button');
      delBtn.innerHTML = ICONS.trash;
      delBtn.title = "Delete Layer";
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeLayer(layer.id);
      });

      controls.appendChild(visBtn);
      controls.appendChild(delBtn); /* Always display trash icon */

      item.appendChild(name);
      item.appendChild(controls);
      list.appendChild(item);
    });
  }

  function toggleExtension() {
    const container = document.getElementById('wa-ui-container');
    if (container) {
       isVisible = !isVisible;
       if (isVisible) {
          container.classList.remove('hidden');
          // Ensure correct viewport scale upon un-hiding if window was modified
          canvas.setWidth(window.innerWidth);
          canvas.setHeight(window.innerHeight);
          canvas.renderAll();
       } else {
          container.classList.add('hidden');
       }
    }
  }

  // Small timeout ensures the DOM has laid out newly appended styles from extension injection
  setTimeout(initUI, 100);
}
