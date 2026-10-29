function renderQrDesigner() {
  const field = (label, id, type = 'text', value = '', extra = '') => `<label class="tool-field">${label}<input class="tool-input" id="${id}" type="${type}" value="${value}" ${extra}></label>`;
  const select = (label, id, options) => `<label class="tool-field">${label}<select class="tool-select" id="${id}">${options.map(([value, text]) => `<option value="${value}">${text}</option>`).join('')}</select></label>`;
  return `<p class="tool-message">Create codes locally in this browser. QR scanning remains available in the separate scanner tool.</p>
    <div class="tool-form-grid">
      ${select('Content type', 'qrd-type', [['url','Website URL'],['text','Plain text'],['wifi','Wi-Fi network'],['email','Email address'],['phone','Phone number'],['vcard','Contact card (vCard)']])}
    </div>
    <div class="qrd-fields" data-qrd-fields="url">${field('Website URL', 'qrd-url', 'url', 'https://example.com', 'placeholder="https://example.com" autocomplete="url"')}</div>
    <div class="qrd-fields" data-qrd-fields="text" hidden><label class="tool-field">Text<textarea class="tool-textarea" id="qrd-text" rows="3" placeholder="Enter text to encode"></textarea></label></div>
    <div class="qrd-fields" data-qrd-fields="wifi" hidden><div class="tool-form-grid">${field('Network name (SSID)', 'qrd-ssid', 'text', '', 'autocomplete="off"')}${field('Password', 'qrd-password', 'password', '', 'autocomplete="new-password"')}${select('Security', 'qrd-security', [['WPA','WPA / WPA2 / WPA3'],['WEP','WEP'],['nopass','No password']])}</div><p class="tool-message qrd-warning">This QR code may reveal your Wi-Fi password. Share it carefully.</p></div>
    <div class="qrd-fields" data-qrd-fields="email" hidden>${field('Email address', 'qrd-email', 'email', '', 'placeholder="name@example.com" autocomplete="email"')}</div>
    <div class="qrd-fields" data-qrd-fields="phone" hidden>${field('Phone number', 'qrd-phone', 'tel', '', 'placeholder="+1 555 010 1234" autocomplete="tel"')}</div>
    <div class="qrd-fields" data-qrd-fields="vcard" hidden><div class="tool-form-grid">${field('First name', 'qrd-first')}${field('Last name', 'qrd-last')}${field('Phone', 'qrd-contact-phone', 'tel')}${field('Email', 'qrd-contact-email', 'email')}${field('Organization (optional)', 'qrd-org')}</div><p class="tool-message qrd-warning">This contact card contains personal information. Share it carefully.</p></div>
    <h3 class="qrd-section-title">Customize</h3>
    <div class="qrd-presets" role="group" aria-label="Color presets">
      <button type="button" class="qrd-preset" data-qrd-fg="#111827" data-qrd-bg="#FFFFFF">Classic</button>
      <button type="button" class="qrd-preset" data-qrd-fg="#173B35" data-qrd-bg="#E8F5E9">Forest</button>
      <button type="button" class="qrd-preset" data-qrd-fg="#312E81" data-qrd-bg="#EEF2FF">Indigo</button>
      <button type="button" class="qrd-preset" data-qrd-fg="#7F1D1D" data-qrd-bg="#FFF1F2">Berry</button>
    </div>
    <div class="tool-form-grid qrd-settings">
      ${field('Foreground color', 'qrd-foreground', 'color', '#111827')}${field('Background color', 'qrd-background', 'color', '#FFFFFF')}
      ${field('Size (px)', 'qrd-size', 'number', '320', 'min="128" max="1024" step="16"')}
      ${field('Quiet margin (modules)', 'qrd-margin', 'number', '4', 'min="0" max="12" step="1"')}
      ${select('Dot style', 'qrd-dot-style', [['square','Square'],['rounded','Rounded'],['dots','Dots']])}
      ${select('Corner style', 'qrd-corner-style', [['square','Square'],['rounded','Rounded'],['dots','Dots']])}
    </div>
    <p class="tool-message" id="qrd-contrast" role="status"></p>
    <div class="qrd-layout"><div class="qrd-preview" id="qrd-preview" aria-label="Live QR code preview"><span>Enter valid content to preview your QR code.</span></div><div class="qrd-side-note"><strong>Privacy note</strong><p>QR codes can be copied, photographed, or forwarded. Avoid encoding sensitive details unless you trust everyone who may see the code.</p><p>Rounded modules and custom colors can affect scan reliability. Use strong contrast and test the finished code with a scanner.</p></div></div>
    <div class="tool-actions qrd-actions"><button class="tool-button primary" type="button" data-qrd-action="png">Download PNG</button><button class="tool-button" type="button" data-qrd-action="svg">Download SVG</button><button class="tool-button" type="button" data-qrd-action="copy">Copy encoded text</button><button class="tool-button" type="button" data-qrd-action="print">Print</button></div>
    <p class="tool-message" id="qrd-status" role="status" aria-live="polite">Preview updates as you edit.</p>`;
}

(() => {
  let matrix = null;
  let encodedValue = '';
  let lastSvg = '';
  const $ = (id) => document.getElementById(id);
  const active = () => document.querySelector('#tool-dialog[open] #qrd-type') !== null;

  function escapedWifi(value) { return value.replace(/[\\;,:\"]/g, '\\$&'); }
  function vcardEscape(value) { return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
  function getPayload() {
    const type = $('qrd-type').value;
    if (type === 'url') {
      const value = $('qrd-url').value.trim();
      if (!value) throw Error('Enter a website URL.');
      let url;
      try { url = new URL(value); } catch { throw Error('Enter a complete URL, such as https://example.com.'); }
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw Error('Use a valid website URL beginning with http:// or https://.');
      return url.href;
    }
    if (type === 'text') {
      const value = $('qrd-text').value;
      if (!value.trim()) throw Error('Enter some text to encode.');
      return value;
    }
    if (type === 'wifi') {
      const ssid = $('qrd-ssid').value;
      const security = $('qrd-security').value;
      const password = $('qrd-password').value;
      if (!ssid.trim()) throw Error('Enter the Wi-Fi network name (SSID).');
      if (security !== 'nopass' && !password) throw Error('Enter the Wi-Fi password, or choose “No password”.');
      return `WIFI:T:${security};S:${escapedWifi(ssid)};${security === 'nopass' ? '' : `P:${escapedWifi(password)};`};;`;
    }
    if (type === 'email') {
      const address = $('qrd-email').value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw Error('Enter a valid email address.');
      return `mailto:${address}`;
    }
    if (type === 'phone') {
      const phone = $('qrd-phone').value.trim();
      if (!/^\+?[\d().\s-]{5,25}$/.test(phone) || !/\d{5,}/.test(phone)) throw Error('Enter a valid phone number.');
      return `tel:${phone.replace(/[\s().-]/g, '')}`;
    }
    const first = $('qrd-first').value.trim();
    const last = $('qrd-last').value.trim();
    const phone = $('qrd-contact-phone').value.trim();
    const email = $('qrd-contact-email').value.trim();
    if (!first && !last) throw Error('Enter at least a first or last name for the contact.');
    if (!phone && !email) throw Error('Enter a phone number or email for the contact.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('Enter a valid contact email address.');
    return ['BEGIN:VCARD', 'VERSION:3.0', `N:${vcardEscape(last)};${vcardEscape(first)};;;`, `FN:${vcardEscape(`${first} ${last}`.trim())}`, phone ? `TEL;TYPE=CELL:${vcardEscape(phone)}` : '', email ? `EMAIL:${vcardEscape(email)}` : '', $('qrd-org').value.trim() ? `ORG:${vcardEscape($('qrd-org').value.trim())}` : '', 'END:VCARD'].filter(Boolean).join('\r\n');
  }
  function luminance(hex) {
    const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }
  function contrastRatio(foreground, background) {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  }
  function drawShape(ctx, style, x, y, unit) {
    if (style === 'dots') { ctx.beginPath(); ctx.arc(x + unit / 2, y + unit / 2, unit * 0.46, 0, Math.PI * 2); ctx.fill(); }
    else if (style === 'rounded' && ctx.roundRect) { const r = unit * 0.28; ctx.beginPath(); ctx.roundRect(x, y, unit, unit, r); ctx.fill(); }
    else if (style === 'rounded') { const r = unit * 0.28; ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + unit, y, x + unit, y + unit, r); ctx.arcTo(x + unit, y + unit, x, y + unit, r); ctx.arcTo(x, y + unit, x, y, r); ctx.arcTo(x, y, x + unit, y, r); ctx.fill(); }
    else ctx.fillRect(x, y, unit, unit);
  }
  function isFinderCell(x, y, dimension) {
    return (x < 7 && y < 7) || (x >= dimension - 7 && y < 7) || (x < 7 && y >= dimension - 7);
  }
  function drawQr(bits, size, margin, foreground, background, dotStyle, cornerStyle) {
    const dimension = bits.getWidth();
    const total = dimension + margin * 2;
    const unit = size / total;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw Error('Canvas rendering is unavailable in this browser.');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = foreground;
    for (let y = 0; y < dimension; y += 1) {
      for (let x = 0; x < dimension; x += 1) {
        if (bits.get(x, y)) drawShape(ctx, isFinderCell(x, y, dimension) ? cornerStyle : dotStyle, (x + margin) * unit, (y + margin) * unit, unit);
      }
    }
    return canvas;
  }
  function makeSvg(bits, size, margin, foreground, background, dotStyle, cornerStyle) {
    const dimension = bits.getWidth();
    const total = dimension + margin * 2;
    const unit = size / total;
    const modules = [];
    for (let y = 0; y < dimension; y += 1) {
      for (let x = 0; x < dimension; x += 1) {
        if (!bits.get(x, y)) continue;
        const style = isFinderCell(x, y, dimension) ? cornerStyle : dotStyle;
        const px = (x + margin) * unit;
        const py = (y + margin) * unit;
        if (style === 'dots') modules.push(`<circle cx="${px + unit / 2}" cy="${py + unit / 2}" r="${unit * 0.46}"/>`);
        else if (style === 'rounded') modules.push(`<rect x="${px}" y="${py}" width="${unit}" height="${unit}" rx="${unit * 0.28}"/>`);
        else modules.push(`<rect x="${px}" y="${py}" width="${unit}" height="${unit}"/>`);
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Generated QR code"><rect width="100%" height="100%" fill="${background}"/><g fill="${foreground}">${modules.join('')}</g></svg>`;
  }
  function setStatus(text, isError = false) {
    const status = $('qrd-status');
    if (status) { status.textContent = text; status.classList.toggle('error', isError); status.classList.toggle('success', !isError); }
  }
  function updatePreview() {
    if (!active()) return;
    const host = $('qrd-preview');
    const contrast = contrastRatio($('qrd-foreground').value, $('qrd-background').value);
    $('qrd-contrast').textContent = `Color contrast: ${contrast.toFixed(2)}:1${contrast < 4.5 ? ' — increase contrast to at least 4.5:1 to generate a code.' : ' — sufficient contrast.'}`;
    $('qrd-contrast').classList.toggle('error', contrast < 4.5);
    try {
      if (contrast < 4.5) throw Error('Foreground and background colors need at least 4.5:1 contrast.');
      const payload = getPayload();
      if (!window.ZXing?.QRCodeWriter || !window.ZXing?.BarcodeFormat || !window.ZXing?.EncodeHintType) throw Error('The local QR encoder did not load. Check network/CDN access, then reload the page.');
      const writer = new ZXing.QRCodeWriter();
      const hints = new Map();
      hints.set(ZXing.EncodeHintType.ERROR_CORRECTION, ZXing.ErrorCorrectionLevel.H);
      hints.set(ZXing.EncodeHintType.MARGIN, 0);
      const bits = writer.encode(payload, ZXing.BarcodeFormat.QR_CODE, 0, 0, hints);
      const size = Number($('qrd-size').value);
      const margin = Number($('qrd-margin').value);
      if (!Number.isInteger(size) || size < 128 || size > 1024) throw Error('Choose a size between 128 and 1024 pixels.');
      if (!Number.isInteger(margin) || margin < 0 || margin > 12) throw Error('Choose a quiet margin from 0 to 12 modules.');
      const fg = $('qrd-foreground').value.toUpperCase();
      const bg = $('qrd-background').value.toUpperCase();
      const canvas = drawQr(bits, size, margin, fg, bg, $('qrd-dot-style').value, $('qrd-corner-style').value);
      host.replaceChildren(canvas);
      canvas.className = 'qrd-canvas';
      matrix = bits;
      encodedValue = payload;
      lastSvg = makeSvg(bits, size, margin, fg, bg, $('qrd-dot-style').value, $('qrd-corner-style').value);
      setStatus(`QR code generated locally · ${bits.getWidth()} × ${bits.getHeight()} modules.`);
    } catch (error) {
      matrix = null;
      encodedValue = '';
      lastSvg = '';
      host.replaceChildren();
      host.textContent = 'Enter valid content and settings to preview your QR code.';
      setStatus(error.message || 'Could not generate a QR code.', true);
    }
  }
  function revealFields() {
    const selected = $('qrd-type').value;
    document.querySelectorAll('#tool-content .qrd-fields').forEach((group) => { group.hidden = group.dataset.qrdFields !== selected; });
    const wifi = $('qrd-password');
    if (wifi) wifi.disabled = selected === 'wifi' && $('qrd-security').value === 'nopass';
    updatePreview();
  }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.hidden = true; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copyPayload() {
    if (!encodedValue) throw Error('Generate a valid QR code before copying its encoded text.');
    try { await navigator.clipboard.writeText(encodedValue); }
    catch {
      const area = document.createElement('textarea'); area.value = encodedValue; area.style.cssText = 'position:fixed;opacity:0'; document.body.append(area); area.select();
      const copied = document.execCommand('copy'); area.remove(); if (!copied) throw Error('Clipboard access is unavailable.');
    }
    setStatus('Encoded text copied to the clipboard.');
  }
  function doAction(action) {
    if (!matrix || !lastSvg) throw Error('Generate a valid QR code before exporting.');
    if (action === 'svg') downloadBlob(new Blob([lastSvg], { type: 'image/svg+xml;charset=utf-8' }), 'unifold-qr-code.svg');
    if (action === 'png') {
      const canvas = document.querySelector('#qrd-preview canvas');
      if (!canvas) throw Error('QR preview is not available for PNG export.');
      canvas.toBlob((blob) => blob ? downloadBlob(blob, 'unifold-qr-code.png') : setStatus('Your browser could not export this QR code as PNG.', true), 'image/png');
    }
    if (action === 'print') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) throw Error('Allow pop-ups to open a print-friendly QR code page.');
      printWindow.opener = null;
      printWindow.document.open();
      printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>QR Code</title><style>@page{margin:18mm}body{margin:0;min-height:90vh;display:grid;place-items:center;font:16px sans-serif}svg{width:min(85vw,120mm);height:auto}</style></head><body>${lastSvg}<script>window.addEventListener('load',()=>window.print())<\/script></body></html>`);
      printWindow.document.close();
    }
    if (action !== 'copy') setStatus(action === 'print' ? 'Print-friendly page opened.' : `QR code ${action.toUpperCase()} export prepared.`);
  }
  document.addEventListener('input', (event) => {
    if (active() && event.target.closest('#tool-content') && event.target.id.startsWith('qrd-')) updatePreview();
  });
  document.addEventListener('change', (event) => {
    if (!active() || !event.target.id.startsWith('qrd-')) return;
    if (event.target.id === 'qrd-type' || event.target.id === 'qrd-security') revealFields();
    else updatePreview();
  });
  document.addEventListener('click', (event) => {
    if (!active()) return;
    const preset = event.target.closest('[data-qrd-fg]');
    if (preset) {
      $('qrd-foreground').value = preset.dataset.qrdFg;
      $('qrd-background').value = preset.dataset.qrdBg;
      updatePreview();
      return;
    }
    const button = event.target.closest('[data-qrd-action]');
    if (!button) return;
    event.preventDefault();
    try {
      const action = button.dataset.qrdAction;
      if (action === 'copy') copyPayload().catch((error) => setStatus(error.message, true));
      else doAction(action);
    } catch (error) { setStatus(error.message || 'The requested action could not be completed.', true); }
  });
  document.addEventListener('click', (event) => {
    const card = event.target.closest('.tool-card[data-name="QR Code Designer"]');
    if (!card) return;
    setTimeout(() => {
      const heading = document.querySelector('#tool-dialog-title');
      if (heading && document.querySelector('#qrd-type')) heading.textContent = 'QR Code Designer';
      if ($('qrd-type')) revealFields();
    }, 0);
  });
})();
