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
    rect: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.5" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>`,
    text: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.5" fill="none"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>`,
    add: `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    eye: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    eyeOff: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`,
    trash: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    chevronLeft: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`,
    chevronRight: `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`,
    size: `<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="8"></circle></svg>`,
    opacity: `<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="8"></circle><path d="M12 4v16a8 8 0 0 0 0-16z" fill="currentColor"></path></svg>`
  };
  
  let toolOpacities = {
    pen: 1,
    'pressure-pen': 1,
    highlight: 0.5,
    rect: 1,
    text: 1
  };
  
  let toolSizes = {
    pen: 3,
    'pressure-pen': 3,
    highlight: 20, // Highlighters default much thicker
    rect: 3,
    text: 3
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
    } else if (currentTool === 'rect' || currentTool === 'text') {
      sizeEnabled = false;
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
      <button class="wa-btn" title="Eraser (Click to delete annotation)" data-tool="eraser">${ICONS.eraser}</button>
      <button class="wa-btn" title="Rectangle" data-tool="rect">${ICONS.rect}</button>
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
         <button id="wa-add-layer" title="New Layer">${ICONS.add}</button>
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
    
    // Add initial layer
    addLayer('Layer 1');
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
    });

    canvas.on('object:removed', () => {
       renderLayers();
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
      } else if (currentTool === 'eraser' && options.target) {
        canvas.remove(options.target);
      } else if (currentTool === 'rect') {
        const pointer = canvas.getPointer(options.e);
        addRectangle(pointer);
      } else if (currentTool === 'text') {
        const pointer = canvas.getPointer(options.e);
        addText(pointer);
      }
    });
    
    canvas.on('mouse:move', (options) => {
      if (isDrawingLine && currentTool === 'highlight' && currentLine) {
        const pointer = canvas.getPointer(options.e);
        currentLine.set({ x2: pointer.x, y2: pointer.y });
        canvas.renderAll();
      }
    });

    canvas.on('mouse:up', () => {
      if (isDrawingLine && currentTool === 'highlight') {
        isDrawingLine = false;
        currentLine = null;
      }
    });
    
    // Deleting objects with keyboard in cursor mode
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && isVisible && currentTool === 'cursor') {
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          canvas.discardActiveObject();
          activeObjects.forEach(obj => canvas.remove(obj));
        }
      }
    });
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
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const toolName = btn.getAttribute('data-tool');
        
        // Find parent group and update inner active state visually
        const group = btn.closest('.wa-tool-group');
        const internalBtns = group.querySelectorAll('.wa-flyout .wa-btn');
        internalBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Swap the tool assigned to the main button, WITHOUT replacing its icon array
        const mainBtn = group.querySelector('.wa-btn:not(.wa-flyout .wa-btn)');
        mainBtn.setAttribute('data-tool', toolName);
        
        // Let the mainBtn click logic handle activating the tool and UI states
        mainBtn.click();
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

    // Adds a new layer
    document.getElementById('wa-add-layer').addEventListener('click', () => {
      layerIndexCounter++;
      addLayer(`Layer ${layerIndexCounter}`);
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
      
      if (tool === 'pen' || tool === 'pressure-pen') {
        canvas.isDrawingMode = true;
        
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
      } else if (tool === 'cursor') {
        canvas.selection = true;
        canvas.forEachObject(obj => { obj.selectable = true; obj.evented = true; });
      } else if (tool === 'eraser') {
        canvas.forEachObject(obj => { obj.selectable = false; obj.evented = true; }); // needs evented for click detection
      }
    }
  }

  function addRectangle(pointer) {
    const color = document.getElementById('wa-color-picker').value;
    const rect = new fabric.Rect({
      left: pointer.x,
      top: pointer.y,
      fill: color,
      width: 100,
      height: 80,
      rx: 8, // rounded corners
      ry: 8,
      layerId: currentLayerId
    });
    canvas.add(rect);
    
    // Switch to cursor tool automatically after placing
    document.querySelector('[data-tool="cursor"]').click();
    canvas.setActiveObject(rect);
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
