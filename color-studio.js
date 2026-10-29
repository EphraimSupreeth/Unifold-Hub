(() => {
  const TOOL_NAME = 'Color Studio';
  const categoryMap = window.UNIFOLD_TOOL_CATEGORIES || (window.UNIFOLD_TOOL_CATEGORIES = {});
  categoryMap[TOOL_NAME] = 'design';
  if (!document.querySelector(`.tool-card[data-name="${TOOL_NAME}"]`)) {
    const card = document.createElement('article');
    card.className = 'tool-card';
    card.dataset.name = TOOL_NAME;
    card.dataset.category = 'design';
    card.dataset.keywords = 'color palette generator hex rgb hsl contrast wcag gradient image extract visualizer export design';
    card.setAttribute('role', 'button');
    card.setAttribute('aria-haspopup', 'dialog');
    card.setAttribute('aria-label', `Open ${TOOL_NAME}`);
    card.tabIndex = 0;
    card.innerHTML = '<div class="card-top"><span class="tool-icon icon-violet" aria-hidden="true">◉</span><span class="coming-soon">Open Tool →</span></div><h3>Color Studio</h3><p>Generate palettes, explore color, check contrast, and build gradients.</p>';
    document.querySelector('#tool-grid')?.append(card);
  }

  const previousRender = window.UnifoldNewTools?.render;
  if (typeof previousRender === 'function') {
    window.UnifoldNewTools.render = function (name) {
      if (name === TOOL_NAME) return renderStudio();
      return previousRender.call(this, name);
    };
  }

  const starterPalettes = [
    { name: 'Violet Hour', colors: ['#201E50', '#5546C7', '#8875E8', '#C7BDF5', '#F1EDFF'] },
    { name: 'Coastal Glass', colors: ['#123B4A', '#217C83', '#58B7A8', '#B9DED2', '#F2F6E9'] },
    { name: 'Citrus Market', colors: ['#263A29', '#638A3D', '#D7B943', '#E98945', '#F4E6C5'] },
    { name: 'Soft Terracotta', colors: ['#49333B', '#8E4F4C', '#C87961', '#E5B49B', '#F5E8DB'] },
    { name: 'Midnight Bloom', colors: ['#171D3B', '#393B72', '#7553A6', '#C06C9D', '#F0B68D'] },
    { name: 'Fresh Signal', colors: ['#19324A', '#2377A5', '#4BAF92', '#C6D94B', '#F1F4E8'] }
  ];
  const STORAGE_KEY = 'unifold-color-studio-palettes-v1';
  const state = { palette: ['#7957FF', '#4736A8', '#B7A7FF', '#E8DFFF', '#29245F'], harmony: 'analogous', explorerFormat: 'hex', dragged: -1, saved: loadSaved(), imageUrl: null, extracted: [] };
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const validHex = (value) => /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
  function normalizeHex(value) {
    const clean = value.trim().replace(/^#/, '');
    if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(clean)) throw new Error('Enter a valid HEX color, such as #7957FF.');
    const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
    return `#${full.toUpperCase()}`;
  }
  function hexRgb(hex) { const value = normalizeHex(hex).slice(1); return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)); }
  function rgbHex(rgb) { return `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`; }
  function rgbHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
    let h = 0, s = 0; const l = (max + min) / 2;
    if (delta) { s = delta / (1 - Math.abs(2 * l - 1)); if (max === r) h = ((g - b) / delta) % 6; else if (max === g) h = (b - r) / delta + 2; else h = (r - g) / delta + 4; h *= 60; if (h < 0) h += 360; }
    return [h, s * 100, l * 100];
  }
  function hslRgb(h, s, l) {
    h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    const rgb = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return rgb.map((v) => Math.round((v + m) * 255));
  }
  function readableText(hex) { const [r, g, b] = hexRgb(hex); return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 145 ? '#17182A' : '#FFFFFF'; }
  function loadSaved() { try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(value) ? value.filter((item) => item && typeof item.name === 'string' && Array.isArray(item.colors) && item.colors.every(validHex)).slice(0, 100) : []; } catch { return []; } }
  function persistSaved() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.saved)); return true; } catch { return false; } }

  function renderStudio() {
    return `<div class="cs-workspace">
      <nav class="cs-section-nav" aria-label="Color Studio sections"><a href="#cs-generator">Palette</a><a href="#cs-image">Image</a><a href="#cs-contrast">Contrast</a><a href="#cs-gradient">Gradient</a><a href="#cs-explorer">Explorer</a><a href="#cs-visualizer">Preview</a><a href="#cs-library">Library</a></nav>
      <section class="cs-section" id="cs-generator"><div class="cs-section-heading"><div><span class="section-kicker">Build a palette</span><h3>Palette Generator</h3><p>Harmonious colors with editable, lockable swatches. Press Space to regenerate when you are not editing a field.</p></div></div>
        <div class="cs-controls"><label class="tool-field">Harmony<select class="tool-select" id="cs-harmony"><option value="complementary">Complementary</option><option value="analogous" selected>Analogous</option><option value="triadic">Triadic</option><option value="tetradic">Tetradic</option><option value="monochromatic">Monochromatic</option></select></label><label class="tool-field">Palette size<select class="tool-select" id="cs-count">${Array.from({length:8},(_,i)=>`<option value="${i+3}" ${i===2?'selected':''}>${i+3} colors</option>`).join('')}</select></label><label class="tool-field">Starting color<span class="cs-color-field"><input id="cs-base" type="color" value="#7957ff" aria-label="Starting color"><input class="tool-input" id="cs-base-hex" value="#7957FF" aria-label="Starting color HEX"></span></label></div>
        <div class="tool-actions"><button class="tool-button primary" type="button" data-cs-action="generate">Regenerate unlocked</button><button class="tool-button" type="button" data-cs-action="add">Add color</button><button class="tool-button" type="button" data-cs-action="copy-palette">Copy palette</button></div><div id="cs-swatches" class="cs-swatches" aria-live="polite"></div><p id="cs-generator-status" class="tool-message" role="status"></p></section>
      <section class="cs-section" id="cs-image"><div class="cs-section-heading"><div><span class="section-kicker">Local processing</span><h3>Image-to-Palette</h3><p>Images are decoded and sampled locally in your browser; they are never uploaded. Maximum file size 20 MB and 40 megapixels.</p></div></div>
        <label class="cs-dropzone" id="cs-dropzone" for="cs-image-file"><span>Drop an image here or choose a file</span><input id="cs-image-file" type="file" accept="image/*" aria-label="Choose a local image"></label><p id="cs-image-status" class="tool-message" role="status"></p><div id="cs-image-colors" class="cs-mini-swatches"></div><div class="tool-actions"><button class="tool-button" type="button" data-cs-action="use-extracted">Use extracted colors in palette</button></div></section>
      <section class="cs-section" id="cs-contrast"><div class="cs-section-heading"><div><span class="section-kicker">Accessible color</span><h3>Contrast Checker</h3><p>WCAG AA normal text requires 4.5:1 and large text 3:1. AAA requires 7:1 for normal and 4.5:1 for large text (large means at least 18 pt regular or 14 pt bold).</p></div></div>
        <div class="cs-controls">${contrastField('Foreground','cs-fg','#29245F')}${contrastField('Background','cs-bg','#FFFFFF')}</div><div id="cs-contrast-preview" class="cs-contrast-preview">Sample text · Aa 123</div><div id="cs-contrast-result" class="tool-result" aria-live="polite"></div><div class="tool-actions"><button class="tool-button" type="button" data-cs-contrast-action="reset">Reset contrast colors</button></div><p id="cs-contrast-status" class="tool-message" role="status"></p></section>
      <section class="cs-section" id="cs-gradient"><div class="cs-section-heading"><div><span class="section-kicker">Color in motion</span><h3>Gradient Studio</h3></div></div><div class="cs-controls"><label class="tool-field">Angle <span class="cs-range-row"><input id="cs-gradient-angle" type="range" min="0" max="360" value="135"><output id="cs-angle-value">135°</output></span></label></div><div id="cs-gradient-stops" class="cs-gradient-stops"></div><div class="tool-actions"><button class="tool-button" type="button" data-cs-action="gradient-add">Add stop</button><button class="tool-button" type="button" data-cs-action="gradient-reset">Reset gradient</button><button class="tool-button primary" type="button" data-cs-action="gradient-copy">Copy CSS</button></div><div id="cs-gradient-preview" class="cs-gradient-preview" role="img" aria-label="Live CSS linear gradient preview"></div><pre id="cs-gradient-css" class="cs-code"></pre><p id="cs-gradient-status" class="tool-message" role="status"></p></section>
      <section class="cs-section" id="cs-explorer"><div class="cs-section-heading"><div><span class="section-kicker">Explore a color</span><h3>Color Explorer</h3><p>Enter HEX, RGB, or HSL values. Use the native picker or select a generated variation to update the explorer.</p></div></div><div class="cs-controls"><label class="tool-field">Input format<select id="cs-format" class="tool-select"><option value="hex">HEX</option><option value="rgb">RGB</option><option value="hsl">HSL</option></select></label><label class="tool-field">Color value<input id="cs-explorer-value" class="tool-input" value="#7957FF" aria-label="Color value in selected format"></label><label class="tool-field">Native color picker<input id="cs-explorer-picker" type="color" value="#7957ff" aria-label="Choose explorer color"></label></div><p id="cs-explorer-status" class="tool-message" role="status"></p><div id="cs-conversions" class="cs-conversions"></div><div id="cs-variations" class="cs-variations"></div></section>
      <section class="cs-section" id="cs-visualizer"><div class="cs-section-heading"><div><span class="section-kicker">See it in context</span><h3>Palette Visualizer</h3><p>This sample is isolated to the preview and never changes Unifold's app theme or saved settings.</p></div></div><div id="cs-visualizer-preview" class="cs-visualizer-preview"></div></section>
      <section class="cs-section" id="cs-library"><div class="cs-section-heading"><div><span class="section-kicker">Keep and reuse</span><h3>Palette Library &amp; Export</h3><p>Starter palettes are bundled locally. Saved palettes remain in this browser only.</p></div></div><div class="cs-controls"><label class="tool-field">Search palettes by name or color<input class="tool-input" id="cs-library-search" type="search" placeholder="Search palettes…"></label><label class="tool-field">Filter<select id="cs-library-filter" class="tool-select"><option value="all">All palettes</option><option value="starter">Starter collection</option><option value="saved">Saved palettes</option></select></label></div><div class="tool-actions"><button class="tool-button primary" type="button" data-cs-action="save">Save current palette</button><button class="tool-button" type="button" data-cs-action="export-css">Export CSS</button><button class="tool-button" type="button" data-cs-action="export-json">Export JSON</button><button class="tool-button" type="button" data-cs-action="export-png">Export PNG</button></div><p id="cs-library-status" class="tool-message" role="status"></p><div id="cs-library-list" class="cs-library-list"></div></section>
    </div>`;
  }
  function contrastField(label, id, initial) { return `<label class="tool-field">${label}<span class="cs-color-field"><input id="${id}-picker" type="color" value="${initial}" aria-label="${label} color picker"><input id="${id}" class="tool-input" value="${initial}" spellcheck="false" aria-label="${label} HEX"></span></label>`; }
  function inStudio() { return Boolean($('cs-swatches')); }
  function status(id, text, kind = '') { const node = $(id); if (node) { node.textContent = text; node.dataset.state = kind; } }
  function renderSwatches() {
    const host = $('cs-swatches'); if (!host) return;
    if ($('cs-count')) $('cs-count').value = String(state.palette.length);
    host.replaceChildren();
    state.palette.forEach((color, index) => {
      const swatch = document.createElement('article'); swatch.className = 'cs-swatch'; swatch.draggable = true; swatch.dataset.index = index;
      swatch.style.setProperty('--swatch-color', color); swatch.style.setProperty('--swatch-ink', readableText(color));
      swatch.innerHTML = `<div class="cs-swatch-color" aria-hidden="true"></div><div class="cs-swatch-controls"><label class="visually-hidden" for="cs-hex-${index}">Color ${index + 1} HEX</label><input id="cs-hex-${index}" class="cs-hex-input" value="${color}" maxlength="7" spellcheck="false" data-cs-hex="${index}"><label class="cs-lock"><input type="checkbox" data-cs-lock="${index}" ${swatchLocked(index)?'checked':''}> Lock</label><div class="cs-swatch-actions"><button type="button" data-cs-action="copy-color" data-index="${index}" aria-label="Copy ${color}">Copy</button><button type="button" data-cs-action="move-left" data-index="${index}" aria-label="Move color ${index+1} left" ${index===0?'disabled':''}>←</button><button type="button" data-cs-action="move-right" data-index="${index}" aria-label="Move color ${index+1} right" ${index===state.palette.length-1?'disabled':''}>→</button><button type="button" data-cs-action="remove" data-index="${index}" aria-label="Remove color ${index+1}" ${state.palette.length<=3?'disabled':''}>×</button></div></div>`;
      host.append(swatch);
    });
  }
  function swatchLocked(index) { return state.locked?.has(index) || false; }
  function generatePalette() {
    const base = normalizeHex($('cs-base-hex')?.value || $('cs-base')?.value || '#7957FF');
    const [h, s, l] = rgbHsl(...hexRgb(base));
    const count = Number($('cs-count')?.value || 5), mode = $('cs-harmony')?.value || state.harmony;
    const hues = { complementary: [0,180,25,205,335,155], analogous: [-40,-20,0,20,40,-60,60,80,100], triadic: [0,120,240,120,240,0,120,240,120,240], tetradic: [0,90,180,270,90,180,270,0,90,180], monochromatic: Array(count).fill(0) }[mode] || [0,20,-20,40,-40];
    const next = Array.from({ length: count }, (_, i) => {
      if (swatchLocked(i) && state.palette[i]) return state.palette[i];
      if (mode === 'monochromatic') { const lightness = count === 1 ? l : 18 + i * (64 / (count - 1)); return rgbHex(hslRgb(h, s, lightness)); }
      const hue = (h + hues[i % hues.length] + 360) % 360;
      const lightness = Math.max(24, Math.min(78, l + (i - (count - 1) / 2) * 7));
      return rgbHex(hslRgb(hue, Math.max(28, s), lightness));
    });
    state.palette = next;
    renderSwatches(); updatePreview(); status('cs-generator-status', 'Palette generated.');
  }
  function updatePreview() {
    updateVisualizer();
    const stops = $('cs-gradient-stops'); if (stops && !stops.children.length) resetGradient();
  }
  function parseColorInput(value, format) {
    const text = value.trim();
    if (format === 'hex') return hexRgb(normalizeHex(text));
    if (format === 'rgb') { const m = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(?:1|0?\.\d+)\s*)?\)$/i.exec(text) || /^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/.exec(text); if (!m || m.slice(1,4).some((n) => Number(n) > 255)) throw new Error('Use RGB values from 0 to 255, such as rgb(60, 90, 180).'); return m.slice(1,4).map(Number); }
    if (format === 'hsl') { const m = /^hsla?\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*(?:,\s*(?:1|0?\.\d+)\s*)?\)$/i.exec(text) || /^(-?\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%?\s*,\s*(\d+(?:\.\d+)?)%?$/.exec(text); if (!m || Number(m[2]) > 100 || Number(m[3]) > 100 || Number(m[2]) < 0 || Number(m[3]) < 0) throw new Error('Use HSL values such as hsl(220, 60%, 45%).'); return hslRgb(Number(m[1]), Number(m[2]), Number(m[3])); }
    throw new Error('Choose HEX, RGB, or HSL format.');
  }
  function colorToFormat(rgb, format) { const hex = rgbHex(rgb); if (format === 'rgb') return `rgb(${rgb.join(', ')})`; if (format === 'hsl') { const [h,s,l] = rgbHsl(...rgb); return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`; } return hex; }
  function renderExplorer() {
    const value = $('cs-explorer-value'); if (!value) return;
    try {
      const rgb = parseColorInput(value.value, $('cs-format').value), hex = rgbHex(rgb), [h,s,l] = rgbHsl(...rgb);
      $('cs-explorer-picker').value = hex.toLowerCase();
      $('cs-conversions').innerHTML = `<p><strong>${hex}</strong> &nbsp; rgb(${rgb.join(', ')}) &nbsp; hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)</p>`;
      const variants = [
        ...[-30,-15,15,30].map((delta) => ({ label: delta < 0 ? `Shade ${Math.abs(delta)}%` : `Light ${delta}%`, color: rgbHex(hslRgb(h,s,Math.max(0,Math.min(100,l+delta)))) })),
        ...[20,40].map((amount) => ({ label: `Tint ${amount}%`, color: mixRgb(rgb,[255,255,255],amount/100) })),
        ...[20,40].map((amount) => ({ label: `Tone ${amount}%`, color: mixRgb(rgb,[128,128,128],amount/100) })),
        ...[30,60,120,180].map((delta) => ({ label: `Related ${delta}°`, color: rgbHex(hslRgb(h+delta,s,l)) }))
      ];
      $('cs-variations').replaceChildren(...variants.map((variant) => colorTile(variant.color, variant.label, 'explorer')));
      status('cs-explorer-status', 'Color converted.');
    } catch (error) { $('cs-conversions').textContent = ''; $('cs-variations').replaceChildren(); status('cs-explorer-status', error.message, 'error'); }
  }
  function mixRgb(a,b,t) { return a.map((v,i)=>Math.round(v*(1-t)+b[i]*t)); }
  function colorTile(color, label, source) { const tile = document.createElement('button'); tile.type = 'button'; tile.className = 'cs-color-tile'; tile.style.setProperty('--tile-color', color); tile.style.setProperty('--tile-ink', readableText(color)); tile.setAttribute('aria-label', `${label}, ${color}; click to copy`); tile.innerHTML = `<span>${esc(label)}</span><strong>${color}</strong>`; tile.addEventListener('click', () => copyText(color, source === 'explorer' ? 'cs-explorer-status' : 'cs-image-status')); return tile; }
  function luminance(hex) { return hexRgb(hex).map((v) => { const c=v/255; return c <= .04045 ? c/12.92 : ((c+.055)/1.055)**2.4; }).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0); }
  function contrastRatio(first, second) { const a=luminance(first),b=luminance(second);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05); }
  function accessibleAlternative(source, fixed) {
    const rgb=hexRgb(source), candidates=[];
    for (const endpoint of [[0,0,0],[255,255,255]]) {
      const end=rgbHex(endpoint);
      if (contrastRatio(end,fixed)<4.5) continue;
      let low=0,high=1;
      for(let i=0;i<24;i++){const mid=(low+high)/2;const mixed=rgbHex(rgb.map((value,index)=>value*(1-mid)+endpoint[index]*mid));if(contrastRatio(mixed,fixed)>=4.5)high=mid;else low=mid;}
      let color=rgbHex(rgb.map((value,index)=>value*(1-high)+endpoint[index]*high));
      while(contrastRatio(color,fixed)<4.5&&high<1){high=Math.min(1,high+.001);color=rgbHex(rgb.map((value,index)=>value*(1-high)+endpoint[index]*high));}
      const ratio=contrastRatio(color,fixed);
      if(ratio>=4.5)candidates.push({color,ratio,distance:high});
    }
    return candidates.sort((a,b)=>a.distance-b.distance)[0]||null;
  }
  function contrastStatus(ratio, threshold) { return ratio>=threshold?'✓ Pass':'✕ Fail'; }
  function updateContrast() {
    try {
      const fg = normalizeHex($('cs-fg').value), bg = normalizeHex($('cs-bg').value);
      const ratio = contrastRatio(fg,bg);
      $('cs-fg').value=fg; $('cs-bg').value=bg; $('cs-fg-picker').value=fg.toLowerCase(); $('cs-bg-picker').value=bg.toLowerCase(); $('cs-contrast-preview').style.color=fg; $('cs-contrast-preview').style.backgroundColor=bg;
      const checks=[['Normal text · AA (4.5:1)',4.5],['Large text · AA (3:1)',3],['Normal text · AAA (7:1)',7],['Large text · AAA (4.5:1)',4.5]];
      const rows=checks.map(([label,threshold])=>`<span>${label}: <strong>${contrastStatus(ratio,threshold)}</strong></span>`).join('');
      let alternatives='';
      if(ratio<4.5){
        const fgOption=accessibleAlternative(fg,bg);
        const bgOption=accessibleAlternative(bg,fg);
        const suggestions=[fgOption&&{label:'Foreground',...fgOption},bgOption&&{label:'Background',...bgOption}].filter(Boolean);
        alternatives=`<div class="cs-contrast-suggestions"><strong>Accessible alternatives (verified for AA normal text, 4.5:1)</strong>${suggestions.map((item)=>`<button class="cs-contrast-suggestion" type="button" data-cs-contrast-copy="${item.color}" aria-label="Copy alternative ${item.label.toLowerCase()} color ${item.color}"><span>Alternative ${item.label.toLowerCase()}</span><strong>${item.color}</strong><span>${item.ratio.toFixed(2)}:1 · verified</span><span aria-hidden="true">Copy HEX</span></button>`).join('')}</div>`;
      }
      $('cs-contrast-result').innerHTML = `<strong>${ratio.toFixed(2)}:1 contrast ratio</strong><div class="cs-ratings">${rows}</div>${alternatives}`;
      status('cs-contrast-status','Contrast calculated using WCAG relative luminance. Large text means at least 18 pt regular or 14 pt bold.');
    } catch (error) { $('cs-contrast-result').textContent=''; status('cs-contrast-status',error.message,'error'); }
  }
  document.addEventListener('click',(event)=>{
    const copy=event.target.closest('[data-cs-contrast-copy]');
    if(copy&&inStudio()){copyText(copy.dataset.csContrastCopy,'cs-contrast-status');return;}
    const reset=event.target.closest('[data-cs-contrast-action="reset"]');
    if(reset&&inStudio()){$('cs-fg').value='#29245F';$('cs-bg').value='#FFFFFF';updateContrast();}
  });
  function getGradientCss() {
    const angle = Math.max(0, Math.min(360, Number($('cs-gradient-angle')?.value || 135)));
    const stops = [...document.querySelectorAll('#cs-gradient-stops [data-cs-stop]')].map((row) => `${normalizeHex(row.querySelector('[data-cs-stop-color]').value)} ${Math.max(0,Math.min(100,Number(row.querySelector('[data-cs-stop-position]').value)))}%`);
    if (stops.length < 2) throw new Error('A gradient needs at least two color stops.');
    return `linear-gradient(${angle}deg, ${stops.join(', ')})`;
  }
  function updateGradient() {
    if (!$('cs-gradient-preview')) return;
    try { const css=getGradientCss(); $('cs-gradient-preview').style.backgroundImage=css; $('cs-gradient-css').textContent=`background-image: ${css};`; $('cs-angle-value').textContent=`${$('cs-gradient-angle').value}°`; status('cs-gradient-status','Gradient preview updated.'); }
    catch (error) { status('cs-gradient-status',error.message,'error'); }
  }
  function addGradientStop(color='#7957FF',position=100) {
    const host=$('cs-gradient-stops'); if(!host||host.children.length>=8)return;
    const row=document.createElement('div'); row.className='cs-gradient-stop'; row.dataset.csStop='';
    row.innerHTML=`<label class="tool-field">Color<input type="color" data-cs-stop-color value="${normalizeHex(color).toLowerCase()}" aria-label="Gradient stop color"></label><label class="tool-field">Position (%)<input class="tool-input" type="number" data-cs-stop-position min="0" max="100" value="${position}" aria-label="Gradient stop position"></label><button class="tool-button" type="button" data-cs-action="gradient-remove" aria-label="Remove gradient stop" ${host.children.length<=2?'disabled':''}>Remove</button>`;
    host.append(row); [...host.children].forEach((item)=>{const b=item.querySelector('[data-cs-action="gradient-remove"]');if(b)b.disabled=host.children.length<=2;}); updateGradient();
  }
  function resetGradient() { const host=$('cs-gradient-stops');if(!host)return;host.replaceChildren();addGradientStop('#7957FF',0);addGradientStop('#29245F',100); }
  function updateVisualizer() {
    const host=$('cs-visualizer-preview'); if(!host)return;
    const colors=state.palette.length?state.palette:['#7957FF','#29245F','#F1EDFF'];
    const c=(i)=>colors[i%colors.length];
    host.style.setProperty('--cs-v1',c(0));host.style.setProperty('--cs-v2',c(1));host.style.setProperty('--cs-v3',c(2));host.style.setProperty('--cs-v4',c(3));host.style.setProperty('--cs-v5',c(4));
    host.innerHTML=`<header class="cs-demo-nav"><strong>Northstar</strong><nav><a href="#cs-visualizer">Work</a><a href="#cs-visualizer">Studio</a><a href="#cs-visualizer">About</a></nav><button type="button">Contact</button></header><section class="cs-demo-hero"><div><span>DESIGN THAT FEELS CLEAR</span><h4>Make room<br>for good ideas.</h4><p>A sample hero and dashboard styled only with the selected palette.</p><button type="button">Get started</button></div><div class="cs-demo-art" aria-hidden="true"><span></span><span></span><span></span></div></section><div class="cs-demo-cards"><article><span>01 / STRATEGY</span><h5>Thoughtful systems</h5><p>Simple patterns create space for useful work.</p></article><article><span>02 / PRODUCT</span><h5>Built with care</h5><p>Clear details make every interaction feel natural.</p></article><article><span>03 / INSIGHT</span><h5>Always learning</h5><p>Progress comes from noticing what matters.</p></article></div><div class="cs-demo-dashboard"><div><small>PROJECTS</small><strong>24</strong></div><div><small>COMPLETION</small><strong>82%</strong></div><div class="cs-demo-chart" aria-label="Decorative sample chart"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div><p class="cs-demo-type">Aa Bb Cc · Color, type, and contrast in context.</p>`;
  }
  function renderLibrary() {
    const host=$('cs-library-list');if(!host)return;
    const q=($('cs-library-search')?.value||'').trim().toLowerCase(), filter=$('cs-library-filter')?.value||'all';
    const all=[...starterPalettes.map((item)=>({...item,kind:'starter'})),...state.saved.map((item,index)=>({...item,kind:'saved',savedIndex:index}))];
    const matches=all.filter((item)=>(filter==='all'||filter===item.kind)&&(!q||`${item.name} ${item.colors.join(' ')}`.toLowerCase().includes(q)));
    host.replaceChildren();
    if(!matches.length){host.innerHTML='<p class="tool-message">No palettes match this search.</p>';return;}
    matches.forEach((item)=>{
      const card=document.createElement('article');card.className='cs-library-card';
      const title=document.createElement('h4');title.textContent=item.name;
      const bar=document.createElement('div');bar.className='cs-library-colors';item.colors.forEach((color)=>{const chip=document.createElement('span');chip.style.backgroundColor=color;chip.title=color;chip.setAttribute('aria-label',color);bar.append(chip);});
      const actions=document.createElement('div');actions.className='tool-actions';
      const use=libraryButton('Load palette',()=>{state.palette=item.colors.map(normalizeHex);renderSwatches();updatePreview();status('cs-library-status',`${item.name} loaded into the workspace.`);});actions.append(use);
      if(item.kind==='saved'){actions.append(libraryButton('Rename',()=>{const name=window.prompt('Rename saved palette:',item.name);if(name?.trim()){state.saved[item.savedIndex].name=name.trim().slice(0,80);status('cs-library-status',persistSaved()?'Palette renamed.':'Could not save changes in browser storage.');renderLibrary();}}),libraryButton('Delete',()=>{if(!window.confirm(`Delete “${item.name}” from saved palettes?`))return;state.saved.splice(item.savedIndex,1);status('cs-library-status',persistSaved()?'Saved palette deleted.':'Could not save changes in browser storage.');renderLibrary();}));}
      card.append(title,bar,actions);host.append(card);
    });
  }
  function libraryButton(label,handler){const b=document.createElement('button');b.type='button';b.className='tool-button';b.textContent=label;b.addEventListener('click',handler);return b;}
  async function copyText(text,statusId){try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard permission unavailable.');await navigator.clipboard.writeText(text);status(statusId,'Copied to clipboard.','success');}catch{const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();let ok=false;try{ok=document.execCommand('copy');}catch{}area.remove();status(statusId,ok?'Copied to clipboard.':'Copy failed. Select and copy the text manually.','error');}}
  function paletteText(){return state.palette.join(', ');}
  function saveCurrent(){if(!state.palette.length){status('cs-library-status','There are no colors to save.','error');return;}const name=window.prompt('Name this palette:','My Unifold palette');if(!name?.trim())return;state.saved.unshift({name:name.trim().slice(0,80),colors:state.palette.slice()});state.saved=state.saved.slice(0,100);status('cs-library-status',persistSaved()?'Palette saved on this device.':'Could not save to browser storage.','success');renderLibrary();}
  function downloadBlob(blob,name){try{const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true;}catch{return false;}}
  function exportCss(){return `:root {\n${state.palette.map((color,i)=>`  --unifold-color-${i+1}: ${color};`).join('\n')}\n}`;}
  function exportPng(){try{const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=320;const ctx=canvas.getContext('2d');if(!ctx)throw new Error();const width=canvas.width/state.palette.length;state.palette.forEach((color,i)=>{ctx.fillStyle=color;ctx.fillRect(i*width,0,Math.ceil(width),canvas.height);ctx.fillStyle=readableText(color);ctx.font='bold 22px system-ui';ctx.fillText(color,i*width+18,canvas.height-24);});canvas.toBlob((blob)=>{if(!blob||!downloadBlob(blob,'unifold-palette.png'))status('cs-library-status','PNG export failed in this browser.','error');else status('cs-library-status','Palette PNG downloaded.','success');},'image/png');}catch{status('cs-library-status','PNG export is not available in this browser.','error');}}
  function imagePalette(file){
    const out=$('cs-image-status');if(!file)return;
    if(!file.type.startsWith('image/')||file.size>20*1024*1024){status('cs-image-status','Choose a supported image smaller than 20 MB.','error');return;}
    status('cs-image-status','Reading image locally…');
    const url=URL.createObjectURL(file),img=new Image();state.imageUrl=url;
    img.onload=()=>{if(!inStudio()){URL.revokeObjectURL(url);return;}try{
      if(img.naturalWidth*img.naturalHeight>40000000)throw new Error('Image dimensions exceed the 40-megapixel safety limit.');
      const scale=Math.min(1,1000/img.naturalWidth,1000/img.naturalHeight),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
      const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Canvas processing is unavailable.');ctx.drawImage(img,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data,bins=new Map();
      for(let i=0;i<pixels.length;i+=16){if(pixels[i+3]<128)continue;const r=pixels[i]>>3,g=pixels[i+1]>>3,b=pixels[i+2]>>3,key=(r<<10)|(g<<5)|b;const entry=bins.get(key)||{count:0,r:0,g:0,b:0};entry.count++;entry.r+=pixels[i];entry.g+=pixels[i+1];entry.b+=pixels[i+2];bins.set(key,entry);}
      state.extracted=[...bins.values()].sort((a,b)=>b.count-a.count).slice(0,8).map((v)=>rgbHex([v.r/v.count,v.g/v.count,v.b/v.count]));if(!state.extracted.length)throw new Error('No visible colors were found in this image.');
      $('cs-image-colors').replaceChildren(...state.extracted.map((color)=>colorTile(color,'Extracted','image')));status('cs-image-status',`Extracted ${state.extracted.length} dominant colors from ${img.naturalWidth} × ${img.naturalHeight}px.`,'success');
    }catch(error){status('cs-image-status',error.message||'Image could not be processed.','error');$('cs-image-colors').replaceChildren();}finally{URL.revokeObjectURL(url);if(state.imageUrl===url)state.imageUrl=null;}};
    img.onerror=()=>{URL.revokeObjectURL(url);if(state.imageUrl===url)state.imageUrl=null;status('cs-image-status','Image could not be decoded. Try a PNG, JPEG, or WebP file.','error');};img.src=url;
  }
  function initStudio(){state.palette=['#7957FF','#4736A8','#B7A7FF','#E8DFFF','#29245F'];renderSwatches();$('cs-harmony').value=state.harmony;updateContrast();renderExplorer();resetGradient();updateVisualizer();renderLibrary();}
  function handleAction(action,button){
    const index=Number(button.dataset.index);
    if(action==='generate'){try{generatePalette();}catch(error){status('cs-generator-status',error.message,'error');}}
    if(action==='add'){if(state.palette.length>=10){status('cs-generator-status','A palette can contain at most 10 colors.','error');return;}state.palette.push(normalizeHex($('cs-base-hex').value));renderSwatches();updatePreview();}
    if(action==='remove'){if(state.palette.length<=3)return;state.palette.splice(index,1);const locks=new Set();state.locked?.forEach((i)=>{if(i<index)locks.add(i);else if(i>index)locks.add(i-1);});state.locked=locks;renderSwatches();updatePreview();}
    if(action==='move-left'||action==='move-right'){const target=index+(action==='move-left'?-1:1);if(target<0||target>=state.palette.length)return;[state.palette[index],state.palette[target]]=[state.palette[target],state.palette[index]];const locks=new Set();state.locked?.forEach((i)=>locks.add(i===index?target:i===target?index:i));state.locked=locks;renderSwatches();updatePreview();}
    if(action==='copy-color')copyText(state.palette[index],'cs-generator-status');
    if(action==='copy-palette')copyText(paletteText(),'cs-generator-status');
    if(action==='use-extracted'){if(!state.extracted.length){status('cs-image-status','Choose an image and extract colors first.','error');return;}state.palette=state.extracted.slice(0,10);while(state.palette.length<3)state.palette.push(state.extracted[state.palette.length%state.extracted.length]);renderSwatches();updatePreview();status('cs-image-status','Extracted colors loaded into the palette.','success');}
    if(action==='gradient-add'){if($('cs-gradient-stops').children.length>=8){status('cs-gradient-status','A gradient can have at most 8 stops.','error');return;}addGradientStop('#B7A7FF',100);}
    if(action==='gradient-remove'){const row=button.closest('[data-cs-stop]');if($('cs-gradient-stops').children.length<=2)return;row.remove();updateGradient();}
    if(action==='gradient-reset')resetGradient();
    if(action==='gradient-copy')copyText($('cs-gradient-css').textContent,'cs-gradient-status');
    if(action==='save')saveCurrent();
    if(action==='export-css'){if(!downloadBlob(new Blob([exportCss()],{type:'text/css;charset=utf-8'}),'unifold-palette.css'))status('cs-library-status','CSS export failed.','error');else status('cs-library-status','CSS file downloaded.','success');}
    if(action==='export-json'){const text=JSON.stringify({name:'Unifold palette',colors:state.palette},null,2);if(!downloadBlob(new Blob([text],{type:'application/json'}),'unifold-palette.json'))status('cs-library-status','JSON export failed.','error');else status('cs-library-status','JSON file downloaded.','success');}
    if(action==='export-png')exportPng();
  }
  document.addEventListener('click',(event)=>{const button=event.target.closest('[data-cs-action]');if(button&&inStudio()){event.preventDefault();handleAction(button.dataset.csAction,button);}});
  document.addEventListener('input',(event)=>{
    if(!inStudio())return;const target=event.target;
    if(target.id==='cs-base-hex'){if(validHex(target.value)){ $('cs-base').value=normalizeHex(target.value).toLowerCase(); status('cs-generator-status','Starting color updated.');}else status('cs-generator-status','Enter a valid HEX color.','error');}
    if(target.id==='cs-base'){ $('cs-base-hex').value=target.value.toUpperCase(); }
    if(target.dataset.csHex!==undefined){const index=Number(target.dataset.csHex);try{const color=normalizeHex(target.value);state.palette[index]=color;target.value=color;target.closest('.cs-swatch').style.setProperty('--swatch-color',color);target.closest('.cs-swatch').style.setProperty('--swatch-ink',readableText(color));updatePreview();status('cs-generator-status','Color updated.');}catch{status('cs-generator-status','Enter a valid HEX color such as #7957FF.','error');}}
    if(target.id==='cs-explorer-value')renderExplorer();
    if(target.id==='cs-explorer-picker'){const rgb=hexRgb(target.value);state.explorerFormat='hex';$('cs-format').value='hex';$('cs-explorer-value').value=rgbHex(rgb);renderExplorer();}
    if(target.id==='cs-fg'||target.id==='cs-bg')updateContrast();
    if(target.id==='cs-gradient-angle'||target.closest('[data-cs-stop]'))updateGradient();
    if(target.id==='cs-library-search')renderLibrary();
  });
  document.addEventListener('change',(event)=>{
    if(!inStudio())return;const t=event.target;
    if(t.id==='cs-harmony'){state.harmony=t.value;generatePalette();}
    if(t.id==='cs-count'){const count=Number(t.value);while(state.palette.length<count)state.palette.push(normalizeHex($('cs-base-hex').value));state.palette.length=count;renderSwatches();generatePalette();}
    if(t.matches('[data-cs-lock]')){state.locked ||= new Set();const i=Number(t.dataset.csLock);if(t.checked)state.locked.add(i);else state.locked.delete(i);status('cs-generator-status',t.checked?'Color locked.':'Color unlocked.');}
    if(t.id==='cs-fg-picker'){ $('cs-fg').value=t.value.toUpperCase();updateContrast();}
    if(t.id==='cs-bg-picker'){ $('cs-bg').value=t.value.toUpperCase();updateContrast();}
    if(t.id==='cs-image-file'&&t.files?.[0])imagePalette(t.files[0]);
    if(t.id==='cs-library-filter')renderLibrary();
    if(t.id==='cs-format'){
      try { const rgb=parseColorInput($('cs-explorer-value').value,state.explorerFormat); state.explorerFormat=t.value; $('cs-explorer-value').value=colorToFormat(rgb,t.value); renderExplorer(); }
      catch(error) { state.explorerFormat=t.value; renderExplorer(); }
    }
  });
  document.addEventListener('keydown',(event)=>{
    if(!inStudio()||event.code!=='Space'||event.repeat)return;
    const target=event.target; if(target instanceof HTMLElement&&(target.matches('input,textarea,select,button')||target.isContentEditable))return;
    if(!document.querySelector('#tool-dialog')?.open)return;
    event.preventDefault();try{generatePalette();}catch(error){status('cs-generator-status',error.message,'error');}
  });
  document.addEventListener('dragstart',(event)=>{const card=event.target.closest('.cs-swatch');if(card&&inStudio()){state.dragged=Number(card.dataset.index);event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',String(state.dragged));}});
  document.addEventListener('dragover',(event)=>{if(event.target.closest('.cs-swatch')&&inStudio())event.preventDefault();});
  document.addEventListener('drop',(event)=>{const card=event.target.closest('.cs-swatch');if(!card||!inStudio())return;event.preventDefault();const from=Number(event.dataTransfer.getData('text/plain')),to=Number(card.dataset.index);if(Number.isInteger(from)&&Number.isInteger(to)&&from!==to){const [color]=state.palette.splice(from,1);state.palette.splice(to,0,color);const locks=new Set();state.locked?.forEach((i)=>locks.add(i===from?to:i>from&&i<=to?i-1:i<from&&i>=to?i+1:i));state.locked=locks;renderSwatches();updatePreview();}});
  document.addEventListener('dragover',(event)=>{const zone=event.target.closest('#cs-dropzone');if(zone&&inStudio()){event.preventDefault();zone.classList.add('is-dragging');}});
  document.addEventListener('dragleave',(event)=>{const zone=event.target.closest('#cs-dropzone');if(zone)zone.classList.remove('is-dragging');});
  document.addEventListener('drop',(event)=>{const zone=event.target.closest('#cs-dropzone');if(!zone||!inStudio())return;event.preventDefault();zone.classList.remove('is-dragging');const file=event.dataTransfer.files?.[0];if(file)imagePalette(file);});
  const content=document.querySelector('#tool-content');
  if(content)new MutationObserver(()=>{if($('cs-swatches'))initStudio();}).observe(content,{childList:true});
})();
