(() => {
  const toolGrid = document.querySelector('#tool-grid');
  const categoryMap = window.UNIFOLD_TOOL_CATEGORIES || (window.UNIFOLD_TOOL_CATEGORIES = {});
  const toolDefinitions = [
    ['Typing Speed Test', 'text', 'Test your typing speed, accuracy, and errors with optional local records.', 'typing speed test wpm words per minute accuracy errors practice'],
    ['Image Crop & Rotate', 'image', 'Crop, rotate, flip, and resize images locally in your browser.', 'image crop rotate flip resize aspect ratio png jpeg'],
    ['File Checksum Calculator', 'security', 'Calculate a file’s SHA-256 checksum locally in your browser.', 'file checksum hash sha256 integrity cryptographic'],
    ['Countdown & Event Planner', 'utilities', 'Create event countdowns saved on this device.', 'countdown event planner calendar days hours minutes seconds'],
    ['Resume & CV Builder', 'text', 'Build a resume with a live preview and print-ready templates.', 'resume cv curriculum vitae career education experience skills print']
  ];
  const icons = {
    text: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16M4 11h13M4 16h16M4 20h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="3" stroke="currentColor" stroke-width="1.7"/><circle cx="9" cy="9" r="1.5" fill="currentColor"/><path d="m5.5 18 5-5 3 3 2-2 3 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    security: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.7"/></svg>',
    utilities: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.7"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
  };

  toolDefinitions.forEach(([name, category, description, keywords], index) => {
    categoryMap[name] = category;
    if (!toolGrid || document.querySelector(`.tool-card[data-name="${name}"]`)) return;
    const card = document.createElement('article');
    card.className = 'tool-card';
    card.dataset.name = name;
    card.dataset.category = category;
    card.dataset.keywords = keywords;
    card.innerHTML = `<div class="card-top"><span class="tool-icon ${['icon-cyan','icon-indigo','icon-violet','icon-green'][index % 4]}">${icons[category]}</span><span class="coming-soon">Open Tool →</span></div><h3>${name}</h3><p>${description}</p>`;
    toolGrid.append(card);
  });

  const $ = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const field = (label, id, type = 'text', extra = '') => `<label class="tool-field">${label}<input class="tool-input" id="${id}" type="${type}" ${extra}></label>`;
  const textarea = (label, id, placeholder = '', rows = 6) => `<label class="tool-field">${label}<textarea class="tool-textarea" id="${id}" rows="${rows}" placeholder="${placeholder}"></textarea></label>`;
  const button = (label, action, primary = false) => `<button class="tool-button${primary ? ' primary' : ''}" type="button" data-part-a-action="${action}">${label}</button>`;
  const status = (id, text = '') => `<p class="tool-message" id="${id}" role="status" aria-live="polite">${text}</p>`;

  const passage = 'Good tools make small tasks easier. A steady pace, careful attention, and relaxed hands can make a bigger difference than trying to type as quickly as possible. Read each sentence, keep your eyes on the text, and focus on accuracy first. Your result is calculated from the characters you type during the timed test.';
  let typingTimer = null;
  let typingEnd = 0;
  let typingStarted = 0;
  let typingTargetDuration = 0;
  let imageBitmap = null;
  let imageObjectUrl = null;
  let imageRenderToken = 0;
  let imageRotation = 0;
  let imageFlipX = false;
  let imageFlipY = false;
  let imageOriginal = null;
  let imageOutputCanvas = null;
  let eventTimer = null;
  let editingEventId = null;
  let resumePrintCleanup = null;

  function render(name) {
    if (name === 'Typing Speed Test') {
      return `<div class="part-a-stack"><p class="tool-message">Type the passage below. The timer starts with your first keystroke. WPM is based on correctly typed characters; errors include incorrect or extra characters.</p><div class="tool-form-grid"><label class="tool-field">Test duration<select class="tool-select" id="typing-duration"><option value="30">30 seconds</option><option value="60" selected>60 seconds</option><option value="custom">Custom</option></select></label><label class="tool-field" id="typing-custom-field" hidden>Custom duration (seconds)<input class="tool-input" id="typing-custom-duration" type="number" min="10" max="600" value="45"></label></div><div class="part-a-passage" id="typing-passage">${passage}</div><label class="tool-field">Type here<textarea class="tool-textarea" id="typing-input" rows="4" placeholder="Start typing to begin…"></textarea></label><div class="part-a-stats"><div class="tool-stat"><strong id="typing-time">60</strong><span>Seconds left</span></div><div class="tool-stat"><strong id="typing-wpm">0</strong><span>WPM</span></div><div class="tool-stat"><strong id="typing-accuracy">100%</strong><span>Accuracy</span></div><div class="tool-stat"><strong id="typing-errors">0</strong><span>Errors</span></div></div><label class="part-a-check"><input id="typing-save-record" type="checkbox"> Save my best record on this device</label><div class="tool-actions">${button('Reset test','typing-reset',true)}</div><div class="tool-result" id="typing-result" aria-live="polite">Choose a duration, then start typing.</div>${status('typing-record')}</div>`;
    }
    if (name === 'Text Diff Checker') {
      return `<div class="part-a-stack"><div class="tool-form-grid part-a-diff-columns">${textarea('Original text','part-diff-before','Paste the original text…',9)}${textarea('Modified text','part-diff-after','Paste the modified text…',9)}</div><label class="tool-field">Compare by<select class="tool-select" id="part-diff-mode"><option value="line">Lines</option><option value="word">Words</option></select></label><div class="tool-actions">${button('Compare','diff-compare',true)}${button('Swap','diff-swap')}${button('Clear','diff-clear')}${button('Copy comparison','diff-copy')}</div><div class="part-diff-output" id="part-diff-output" aria-live="polite">Enter text in both fields and choose Compare.</div>${status('part-diff-status')}</div>`;
    }
    if (name === 'Image Crop & Rotate') {
      return `<div class="part-a-stack"><p class="tool-message">Images are processed locally. EXIF orientation is applied by the browser’s image decoder where supported. Crop coordinates use the decoded image dimensions.</p><label class="tool-field">Choose image<input class="tool-input" id="crop-file" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"></label><div class="tool-form-grid"><label class="tool-field">Aspect ratio<select class="tool-select" id="crop-ratio"><option value="free">Free crop</option><option value="1:1">Square (1:1)</option><option value="4:3">Landscape (4:3)</option><option value="3:2">Photo (3:2)</option><option value="16:9">Widescreen (16:9)</option><option value="9:16">Portrait (9:16)</option></select></label><label class="tool-field">Rotate<select class="tool-select" id="crop-rotation"><option value="0">0°</option><option value="90">90° clockwise</option><option value="180">180°</option><option value="270">270° clockwise</option></select></label></div><div class="tool-form-grid part-a-crop-grid">${field('Crop left (px)','crop-x','number','min="0" step="1"')}${field('Crop top (px)','crop-y','number','min="0" step="1"')}${field('Crop width (px)','crop-width','number','min="1" step="1"')}${field('Crop height (px)','crop-height','number','min="1" step="1"')}</div><div class="tool-form-grid">${field('Output width (px)','crop-out-width','number','min="1" max="8000"')}${field('Output height (px)','crop-out-height','number','min="1" max="8000"')}</div><div class="tool-actions">${button('Flip horizontal','crop-flip-x')}${button('Flip vertical','crop-flip-y')}${button('Reset crop','crop-reset')}</div><div class="tool-result part-a-image-preview"><figure id="crop-original-wrap" hidden><figcaption>Original</figcaption><img id="crop-original-preview" alt="Original image preview" hidden></figure><figure id="crop-result-wrap" hidden><figcaption>Preview</figcaption><canvas id="crop-preview" aria-label="Edited image preview" hidden></canvas></figure><span id="crop-placeholder">Choose an image to begin.</span></div><div class="tool-form-grid"><label class="tool-field">Export format<select class="tool-select" id="crop-format"><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option></select></label><label class="tool-field">JPEG quality<input class="tool-input" id="crop-quality" type="number" min="50" max="100" value="92"></label></div><div class="tool-actions">${button('Export image','crop-export',true)}</div>${status('crop-status','Choose a PNG, JPEG, or WebP image up to 20 MB.')}</div>`;
    }
    if (name === 'File Checksum Calculator') {
      return `<div class="part-a-stack"><p class="tool-message">SHA-256 is calculated locally with Web Crypto. For memory safety, files are limited to 100 MiB; this browser must support secure-context Web Crypto.</p><label class="tool-field">Choose a file<input class="tool-input" id="checksum-file" type="file"></label><div class="tool-actions">${button('Calculate SHA-256','checksum-calculate',true)}${button('Copy hash','checksum-copy')}</div><div class="tool-result" id="checksum-result" aria-live="polite">Choose a file to calculate its checksum.</div>${status('checksum-status')}</div>`;
    }
    if (name === 'Countdown & Event Planner') {
      return `<div class="part-a-stack"><form id="event-form"><div class="tool-form-grid"><label class="tool-field">Event name<input class="tool-input" id="event-name" maxlength="100" required placeholder="e.g. Graduation day"></label><label class="tool-field">Date and time<input class="tool-input" id="event-date" type="datetime-local" required></label></div><div class="tool-actions"><button class="tool-button primary" id="event-save" type="submit">Add event</button><button class="tool-button" type="button" data-part-a-action="event-cancel" hidden>Cancel edit</button></div></form>${status('event-status','Events are saved only in this browser.') }<div id="event-list" class="part-a-event-list"></div></div>`;
    }
    if (name === 'Resume & CV Builder') {
      return `<div class="part-a-stack part-a-resume"><p class="tool-message">Your details stay in this page and are not uploaded or saved automatically. Use Print / Save PDF to open your browser’s print dialog.</p><div class="tool-form-grid">${field('Full name','resume-name','text','autocomplete="name" maxlength="100"')}${field('Email','resume-email','email','autocomplete="email" maxlength="160"')}${field('Phone','resume-phone','tel','autocomplete="tel" maxlength="60"')}${field('Location','resume-location','text','maxlength="100"')}</div>${textarea('Professional summary','resume-summary','A short introduction…',4)}${textarea('Education (one entry per line)','resume-education','Degree — Institution — Year',4)}${textarea('Experience (one entry per line)','resume-experience','Role — Company — Dates — Achievement',6)}${textarea('Skills (comma-separated)','resume-skills','Communication, planning, tools…',3)}<label class="tool-field">Template<select class="tool-select" id="resume-template"><option value="clean">Clean</option><option value="modern">Modern</option><option value="classic">Classic</option></select></label><div class="tool-actions">${button('Print / Save PDF','resume-print',true)}${button('Clear details','resume-clear')}</div><section class="part-a-resume-preview resume-clean" id="resume-preview" aria-label="Resume preview"></section>${status('resume-status')}</div>`;
    }
    return '';
  }

  const previousRender = window.UnifoldNewTools?.render;
  if (typeof previousRender === 'function') {
    window.UnifoldNewTools.render = function (name) {
      if (name === 'Text Diff Checker' || toolDefinitions.some(([toolName]) => toolName === name)) return render(name);
      return previousRender.call(this, name);
    };
  }

  function setStatus(id, text, isError = false) {
    const node = $(id);
    if (node) { node.textContent = text; node.classList.toggle('error', isError); }
  }
  async function copyText(text) {
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
    } catch { /* Fall back to the browser's copy command when available. */ }
    const helper = document.createElement('textarea');
    helper.value = text; helper.style.position = 'fixed'; helper.style.opacity = '0';
    document.body.append(helper); helper.select();
    try { return document.execCommand('copy'); }
    catch { return false; }
    finally { helper.remove(); }
  }

  function stopTyping() {
    if (typingTimer) clearInterval(typingTimer);
    typingTimer = null;
  }
  function typingDuration() {
    const selected = $('typing-duration')?.value || '60';
    const seconds = selected === 'custom' ? Number($('typing-custom-duration')?.value) : Number(selected);
    return Number.isInteger(seconds) && seconds >= 10 && seconds <= 600 ? seconds : 0;
  }
  function typingMetrics() {
    const typed = $('typing-input')?.value || '';
    let correct = 0;
    for (let i = 0; i < Math.min(typed.length, passage.length); i += 1) if (typed[i] === passage[i]) correct += 1;
    const errors = typed.length - correct;
    const elapsed = typingStarted ? Math.max(0.001, (Date.now() - typingStarted) / 60000) : 0;
    return { correct, errors, accuracy: typed.length ? correct / typed.length * 100 : 100, wpm: elapsed ? correct / 5 / elapsed : 0 };
  }
  function updateTyping() {
    const remaining = Math.max(0, Math.ceil((typingEnd - Date.now()) / 1000));
    const metrics = typingMetrics();
    if ($('typing-time')) $('typing-time').textContent = remaining;
    if ($('typing-wpm')) $('typing-wpm').textContent = Math.round(metrics.wpm);
    if ($('typing-accuracy')) $('typing-accuracy').textContent = `${metrics.accuracy.toFixed(1)}%`;
    if ($('typing-errors')) $('typing-errors').textContent = metrics.errors;
    if (typingStarted && remaining <= 0) finishTyping();
  }
  function finishTyping() {
    stopTyping();
    const input = $('typing-input');
    if (!input) return;
    input.disabled = true;
    const metrics = typingMetrics();
    $('typing-time').textContent = '0';
    $('typing-result').textContent = `Test complete: ${Math.round(metrics.wpm)} WPM · ${metrics.accuracy.toFixed(1)}% accuracy · ${metrics.errors} error(s).`;
    if ($('typing-save-record').checked) {
      try {
        const key = 'unifold-typing-records-v1';
        const records = JSON.parse(localStorage.getItem(key) || '{}');
        const duration = String(typingTargetDuration || Math.round((Date.now() - typingStarted) / 1000));
        const prior = records[duration];
        if (!prior || metrics.wpm > prior.wpm) records[duration] = { wpm: Number(metrics.wpm.toFixed(1)), accuracy: Number(metrics.accuracy.toFixed(1)), date: new Date().toISOString() };
        localStorage.setItem(key, JSON.stringify(records));
        $('typing-record').textContent = `Best saved locally for ${duration} seconds: ${records[duration].wpm} WPM, ${records[duration].accuracy}% accuracy.`;
      } catch { setStatus('typing-record', 'Could not save the record in browser storage.', true); }
    }
  }
  function resetTyping() {
    stopTyping();     typingStarted = 0; typingEnd = 0; typingTargetDuration = 0;
    const duration = typingDuration() || 60;
    if ($('typing-input')) { $('typing-input').value = ''; $('typing-input').disabled = false; }
    if ($('typing-time')) $('typing-time').textContent = duration;
    if ($('typing-wpm')) $('typing-wpm').textContent = '0';
    if ($('typing-accuracy')) $('typing-accuracy').textContent = '100%';
    if ($('typing-errors')) $('typing-errors').textContent = '0';
    if ($('typing-result')) $('typing-result').textContent = 'Choose a duration, then start typing.';
    if ($('typing-record')) $('typing-record').textContent = '';
  }

  function diffTokens(text, mode) {
    if (mode === 'word') return text.match(/\s+|[^\s]+/g) || [];
    return text.match(/[^\n]*\n|[^\n]+$/g) || [];
  }
  function diffCompare() {
    const before = $('part-diff-before').value;
    const after = $('part-diff-after').value;
    const mode = $('part-diff-mode').value;
    if (before.length + after.length > 500000) { setStatus('part-diff-status', 'For responsiveness, compare text up to 500 KB combined.', true); return; }
    const a = diffTokens(before, mode), b = diffTokens(after, mode);
    if ((a.length + 1) * (b.length + 1) > 250000) { setStatus('part-diff-status', 'This comparison is too large for a full alignment. Shorten the text and try again.', true); return; }
    const dp = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
    for (let i = a.length - 1; i >= 0; i -= 1) for (let j = b.length - 1; j >= 0; j -= 1) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const ops = []; let i = 0, j = 0;
    while (i < a.length || j < b.length) {
      if (i < a.length && j < b.length && a[i] === b[j]) ops.push(['same', a[i++]]);
      else if (j < b.length && (i === a.length || dp[i][j + 1] >= dp[i + 1][j])) ops.push(['add', b[j++]]);
      else ops.push(['del', a[i++]]);
    }
    const output = $('part-diff-output'); output.replaceChildren();
    const plain = [];
    for (let k = 0; k < ops.length; k += 1) {
      const next = ops[k + 1];
      if (next && ((ops[k][0] === 'del' && next[0] === 'add') || (ops[k][0] === 'add' && next[0] === 'del'))) {
        const oldText = ops[k][0] === 'del' ? ops[k][1] : next[1];
        const newText = ops[k][0] === 'add' ? ops[k][1] : next[1];
        const change = document.createElement('span'); change.className = 'part-diff-change';
        const removed = document.createElement('del'); removed.textContent = oldText;
        const added = document.createElement('ins'); added.textContent = newText;
        change.append(removed, added); output.append(change);
        plain.push(`[-${oldText}-]{+${newText}+}`); k += 1;
      } else {
        const [kind, value] = ops[k];
        if (kind === 'same') output.append(document.createTextNode(value));
        else { const mark = document.createElement(kind === 'del' ? 'del' : 'ins'); mark.className = `part-diff-${kind}`; mark.textContent = value; output.append(mark); }
        plain.push(kind === 'same' ? value : `${kind === 'del' ? '[-' : '{+'}${value}${kind === 'del' ? '-]' : '+}'}`);
      }
    }
    window.__unifoldPartADiff = plain.join('');
    setStatus('part-diff-status', `Compared ${a.length} original and ${b.length} modified ${mode === 'word' ? 'tokens' : 'lines'}. Insertions are green; removals are red; paired changes are shown together.`);
  }

  function centeredCrop(width, height, ratio) {
    if (!ratio) return { x: 0, y: 0, width, height };
    const [rw, rh] = ratio.split(':').map(Number), target = rw / rh;
    let cropWidth = width, cropHeight = height;
    if (width / height > target) cropWidth = Math.round(height * target);
    else cropHeight = Math.round(width / target);
    return { x: Math.floor((width - cropWidth) / 2), y: Math.floor((height - cropHeight) / 2), width: cropWidth, height: cropHeight };
  }
  function loadCropImage(file) {
    const token = ++imageRenderToken;
    if (imageBitmap?.close) imageBitmap.close(); imageBitmap = null;
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl); imageObjectUrl = null;
    imageOriginal = null; imageOutputCanvas = null;
    if ($('crop-preview')) { $('crop-preview').hidden = true; $('crop-preview').width = 0; $('crop-preview').height = 0; }
    if ($('crop-original-preview')) { $('crop-original-preview').hidden = true; $('crop-original-preview').removeAttribute('src'); }
    if ($('crop-original-wrap')) $('crop-original-wrap').hidden = true;
    if ($('crop-result-wrap')) $('crop-result-wrap').hidden = true;
    if ($('crop-placeholder')) $('crop-placeholder').hidden = false;
    if (!file) return;
    const supportedType = /^image\/(png|jpeg|webp)$/.test(file.type) || (!file.type && /\.(png|jpe?g|webp)$/i.test(file.name));
    if (!supportedType || file.size > 20 * 1024 * 1024) { setStatus('crop-status', 'Choose a supported PNG, JPEG, or WebP image smaller than 20 MB.', true); return; }
    setStatus('crop-status', 'Reading image locally…');
    imageObjectUrl = URL.createObjectURL(file);
    const ready = (image) => {
      if (token !== imageRenderToken) { image.close?.(); return; }
      imageOriginal = image;
      imageBitmap = typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap ? image : null;
      const width = image.width || image.naturalWidth, height = image.height || image.naturalHeight;
      if (!width || !height || width * height > 40000000) { image.close?.(); imageOriginal = null; setStatus('crop-status', 'Image must have valid dimensions and be no larger than 40 megapixels.', true); return; }
      const ratio = $('crop-ratio').value;
      const crop = centeredCrop(width, height, ratio === 'free' ? null : ratio);
      $('crop-x').value = crop.x; $('crop-y').value = crop.y; $('crop-width').value = crop.width; $('crop-height').value = crop.height;
      imageRotation = 0; imageFlipX = false; imageFlipY = false; $('crop-rotation').value = '0';
      $('crop-out-width').value = width; $('crop-out-height').value = height;
      const preview = $('crop-original-preview'); preview.src = imageObjectUrl; preview.hidden = false;
      $('crop-original-wrap').hidden = false; $('crop-placeholder').hidden = true;
      setStatus('crop-status', `Loaded ${width} × ${height}px. Adjust the crop and transform, then export.`);
      drawCropPreview();
    };
    if ('createImageBitmap' in window) {
      createImageBitmap(file).then(ready).catch(() => loadImageFallback(file, token, ready));
    } else loadImageFallback(file, token, ready);
  }
  function loadImageFallback(file, token, ready) {
    if (token !== imageRenderToken) return;
    if (!imageObjectUrl) imageObjectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => ready(img);
    img.onerror = () => setStatus('crop-status', 'This image could not be decoded by the browser.', true);
    img.src = imageObjectUrl;
  }
  function cropSettings() {
    if (!imageOriginal) throw new Error('Choose a supported image first.');
    const sourceWidth = imageOriginal.width || imageOriginal.naturalWidth, sourceHeight = imageOriginal.height || imageOriginal.naturalHeight;
    const crop = { x: Number($('crop-x').value), y: Number($('crop-y').value), width: Number($('crop-width').value), height: Number($('crop-height').value) };
    if (!Object.values(crop).every(Number.isFinite) || !Number.isInteger(crop.x) || !Number.isInteger(crop.y) || !Number.isInteger(crop.width) || !Number.isInteger(crop.height) || crop.x < 0 || crop.y < 0 || crop.width < 1 || crop.height < 1 || crop.x + crop.width > sourceWidth || crop.y + crop.height > sourceHeight) throw new Error(`Crop must fit within the source image (${sourceWidth} × ${sourceHeight}px).`);
    const width = Number($('crop-out-width').value), height = Number($('crop-out-height').value);
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 8000 || height > 8000 || width * height > 40000000) throw new Error('Output dimensions must be 1–8,000 px and no more than 40 megapixels.');
    return { crop, width, height, sourceWidth, sourceHeight };
  }
  function drawCropPreview() {
    if (!imageOriginal || !$('crop-preview')) return;
    try {
      const { crop, width, height } = cropSettings();
      const canvas = $('crop-preview');
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable in this browser.');
      context.clearRect(0, 0, width, height);
      if ($('crop-format').value === 'image/jpeg') { context.fillStyle = '#fff'; context.fillRect(0, 0, width, height); }
      const rotatedWidth = imageRotation % 180 ? crop.height : crop.width;
      const rotatedHeight = imageRotation % 180 ? crop.width : crop.height;
      context.save(); context.translate(width / 2, height / 2);
      context.scale(width / rotatedWidth, height / rotatedHeight);
      context.rotate(imageRotation * Math.PI / 180);
      context.scale(imageFlipX ? -1 : 1, imageFlipY ? -1 : 1);
      context.drawImage(imageOriginal, crop.x, crop.y, crop.width, crop.height, -crop.width / 2, -crop.height / 2, crop.width, crop.height);
      context.restore();
      canvas.hidden = false; $('crop-result-wrap').hidden = false; $('crop-placeholder').hidden = true; imageOutputCanvas = canvas;
      setStatus('crop-status', `Preview: ${width} × ${height}px output from crop ${crop.width} × ${crop.height}px.`);
    } catch (error) { setStatus('crop-status', error.message, true); }
  }
  function applyCropRatio() {
    if (!imageOriginal) return;
    const ratio = $('crop-ratio').value;
    const crop = centeredCrop(imageOriginal.width || imageOriginal.naturalWidth, imageOriginal.height || imageOriginal.naturalHeight, ratio === 'free' ? null : ratio);
    $('crop-x').value = crop.x; $('crop-y').value = crop.y; $('crop-width').value = crop.width; $('crop-height').value = crop.height;
    $('crop-out-width').value = imageRotation % 180 ? crop.height : crop.width;
    $('crop-out-height').value = imageRotation % 180 ? crop.width : crop.height;
    drawCropPreview();
  }
  async function exportCrop() {
    const canvas = imageOutputCanvas;
    if (!canvas) throw new Error('Load an image and create a valid preview before exporting.');
    const mime = $('crop-format').value, quality = Math.max(50, Math.min(100, Number($('crop-quality').value))) / 100;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
    if (!blob) throw new Error('The browser could not export this image.');
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `unifold-crop.${mime === 'image/png' ? 'png' : 'jpg'}`; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    setStatus('crop-status', `Exported ${mime === 'image/png' ? 'PNG' : 'JPEG'} (${(blob.size / 1024).toFixed(1)} KB).`, false);
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB']; let size = bytes / 1024, index = 0;
    while (size >= 1024 && index < units.length - 1) { size /= 1024; index += 1; }
    return `${size.toFixed(2)} ${units[index]}`;
  }
  async function calculateChecksum() {
    const file = $('checksum-file').files[0];
    if (!file) throw new Error('Choose a file first.');
    if (!window.crypto?.subtle || !window.isSecureContext) throw new Error('Web Crypto SHA-256 requires a secure context (HTTPS or localhost) and browser support.');
    const maxBytes = 100 * 1024 * 1024;
    if (file.size > maxBytes) throw new Error('This browser version reads the complete file into memory. For safety, choose a file no larger than 100 MiB.');
    const button = document.querySelector('[data-part-a-action="checksum-calculate"]');
    button.disabled = true; setStatus('checksum-status', 'Reading file and calculating SHA-256 locally…');
    try {
      const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
      const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
      $('checksum-result').textContent = `File: ${file.name}\nSize: ${formatBytes(file.size)} (${file.size.toLocaleString()} bytes)\nSHA-256: ${hash}`;
      $('checksum-result').dataset.hash = hash;
      setStatus('checksum-status', 'Checksum complete. File contents were processed locally.');
    } finally { if (button?.isConnected) button.disabled = false; }
  }

  const eventStorageKey = 'unifold-countdown-events-v1';
  function loadEvents() {
    try { const parsed = JSON.parse(localStorage.getItem(eventStorageKey) || '[]'); return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string' && Number.isFinite(Date.parse(item.date))) : []; }
    catch { return []; }
  }
  function saveEvents(events) { try { localStorage.setItem(eventStorageKey, JSON.stringify(events)); return true; } catch { setStatus('event-status', 'Browser storage is unavailable; this change could not be saved.', true); return false; } }
  function timeUntil(target) {
    let seconds = Math.floor(Math.abs(target - Date.now()) / 1000);
    const days = Math.floor(seconds / 86400); seconds %= 86400;
    const hours = Math.floor(seconds / 3600); seconds %= 3600;
    const minutes = Math.floor(seconds / 60); seconds %= 60;
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
  function renderEvents() {
    const host = $('event-list'); if (!host) return;
    const events = loadEvents().sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    if (!events.length) { host.innerHTML = '<p class="tool-result">No events yet. Add an event above to start a countdown.</p>'; return; }
    host.innerHTML = events.map((event) => {
      const timestamp = Date.parse(event.date), past = timestamp <= Date.now();
      return `<article class="part-a-event"><div><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(new Date(timestamp).toLocaleString())}</p><strong class="part-a-event-countdown" data-event-time="${timestamp}">${past ? 'Event has passed' : `In ${timeUntil(timestamp)}`}</strong></div><div class="tool-actions">${button('Edit',`event-edit:${escapeHtml(event.id)}`)}${button('Delete',`event-delete:${escapeHtml(event.id)}`)}</div></article>`;
    }).join('');
  }
  function updateEventCountdowns() {
    document.querySelectorAll('.part-a-event-countdown[data-event-time]').forEach((node) => {
      const timestamp = Number(node.dataset.eventTime);
      node.textContent = timestamp <= Date.now() ? 'Event has passed' : `In ${timeUntil(timestamp)}`;
    });
  }
  function eventSubmit(event) {
    event.preventDefault();
    const title = $('event-name').value.trim(), value = $('event-date').value, date = new Date(value);
    if (!title || !value || !Number.isFinite(date.getTime())) { setStatus('event-status', 'Enter an event name and a valid date and time.', true); return; }
    const events = loadEvents();
    if (editingEventId) {
      const item = events.find((entry) => entry.id === editingEventId);
      if (item) { item.title = title; item.date = date.toISOString(); }
    } else events.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, title, date: date.toISOString() });
    if (!saveEvents(events)) return;
    $('event-form').reset(); editingEventId = null; $('event-save').textContent = 'Add event'; $('[data-part-a-action="event-cancel"]').hidden = true;
    setStatus('event-status', 'Event saved locally on this device.'); renderEvents();
  }
  function editEvent(id) {
    const item = loadEvents().find((event) => event.id === id); if (!item) return;
    editingEventId = id; $('event-name').value = item.title;
    const date = new Date(item.date); $('event-date').value = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
    $('event-save').textContent = 'Save changes'; $('[data-part-a-action="event-cancel"]').hidden = false; $('event-name').focus();
  }
  function cancelEventEdit() { editingEventId = null; $('event-form')?.reset(); if ($('event-save')) $('event-save').textContent = 'Add event'; if ($('[data-part-a-action="event-cancel"]')) $('[data-part-a-action="event-cancel"]').hidden = true; }

  function renderResumePreview() {
    const preview = $('resume-preview'); if (!preview) return;
    const name = $('resume-name').value.trim() || 'Your Name';
    const contact = [$('resume-email').value.trim(), $('resume-phone').value.trim(), $('resume-location').value.trim()].filter(Boolean).map(escapeHtml).join(' · ');
    const block = (title, value) => value.trim() ? `<section><h2>${title}</h2><p>${escapeHtml(value.trim()).replace(/\n/g, '<br>')}</p></section>` : '';
    preview.className = `part-a-resume-preview resume-${$('resume-template').value}`;
    preview.innerHTML = `<header><h1>${escapeHtml(name)}</h1>${contact ? `<p class="resume-contact">${contact}</p>` : ''}</header>${block('Profile',$('resume-summary').value)}${block('Experience',$('resume-experience').value)}${block('Education',$('resume-education').value)}${$('resume-skills').value.trim() ? `<section><h2>Skills</h2><p>${escapeHtml($('resume-skills').value.split(',').map((item) => item.trim()).filter(Boolean).join(' · '))}</p></section>` : ''}`;
  }
  function printResume() {
    renderResumePreview();
    document.body.classList.add('printing-resume');
    const cleanup = () => { document.body.classList.remove('printing-resume'); window.removeEventListener('afterprint', cleanup); resumePrintCleanup = null; };
    resumePrintCleanup = cleanup;
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
    setTimeout(() => { if (resumePrintCleanup === cleanup) cleanup(); }, 2000);
  }

  function onInput(event) {
    const id = event.target.id;
    if (id === 'typing-input') {
      const duration = typingDuration();
      if (!duration) { setStatus('typing-result', 'Choose a test from 10 to 600 seconds.', true); return; }
      if (!typingStarted && event.target.value) {
        typingStarted = Date.now(); typingTargetDuration = duration; typingEnd = typingStarted + duration * 1000;
        $('typing-result').textContent = 'Test in progress…';
        typingTimer = setInterval(updateTyping, 100);
      }
      updateTyping();
    }
    if (id === 'typing-custom-duration' && !typingStarted) $('typing-time').textContent = Number(event.target.value) || 0;
    if (id === 'resume-name' || id.startsWith('resume-') && !['resume-template','resume-status'].includes(id)) renderResumePreview();
    if (id.startsWith('crop-') && imageOriginal && !['crop-file','crop-format','crop-quality','crop-ratio','crop-rotation'].includes(id)) drawCropPreview();
  }
  function onChange(event) {
    const id = event.target.id;
    if (id === 'typing-duration') {
      $('typing-custom-field').hidden = event.target.value !== 'custom';
      resetTyping();
    }
    if (id === 'crop-file') loadCropImage(event.target.files[0]);
    if (id === 'crop-ratio') applyCropRatio();
    if (id === 'crop-rotation') {
      const old = imageRotation; imageRotation = Number(event.target.value);
      if (imageOriginal && old % 180 !== imageRotation % 180) {
        const width = $('crop-out-width').value; $('crop-out-width').value = $('crop-out-height').value; $('crop-out-height').value = width;
      }
      drawCropPreview();
    }
    if (id === 'crop-format') drawCropPreview();
    if (id === 'resume-template') renderResumePreview();
  }
  function onClick(event) {
    const buttonNode = event.target.closest('[data-part-a-action]'); if (!buttonNode) return;
    const action = buttonNode.dataset.partAAction;
    if (action === 'typing-reset') resetTyping();
    if (action === 'diff-compare') diffCompare();
    if (action === 'diff-swap') { const before = $('part-diff-before'), after = $('part-diff-after'); [before.value, after.value] = [after.value, before.value]; diffCompare(); }
    if (action === 'diff-clear') { $('part-diff-before').value = ''; $('part-diff-after').value = ''; $('part-diff-output').textContent = ''; window.__unifoldPartADiff = ''; setStatus('part-diff-status', 'Text cleared.'); }
    if (action === 'diff-copy') {
      const text = window.__unifoldPartADiff || '';
      copyText(text).then((copied) => setStatus('part-diff-status', copied ? 'Comparison copied.' : 'Clipboard unavailable; select the comparison and copy it manually.', !copied));
    }
    if (action === 'crop-flip-x') { imageFlipX = !imageFlipX; drawCropPreview(); }
    if (action === 'crop-flip-y') { imageFlipY = !imageFlipY; drawCropPreview(); }
    if (action === 'crop-reset') {
      if (!imageOriginal) return;
      $('crop-ratio').value = 'free'; imageRotation = 0; imageFlipX = false; imageFlipY = false; $('crop-rotation').value = '0';
      const width = imageOriginal.width || imageOriginal.naturalWidth, height = imageOriginal.height || imageOriginal.naturalHeight;
      $('crop-x').value = 0; $('crop-y').value = 0; $('crop-width').value = width; $('crop-height').value = height; $('crop-out-width').value = width; $('crop-out-height').value = height; drawCropPreview();
    }
    if (action === 'crop-export') exportCrop().catch((error) => setStatus('crop-status', error.message, true));
    if (action === 'checksum-calculate') calculateChecksum().catch((error) => setStatus('checksum-status', error.message, true));
    if (action === 'checksum-copy') {
      const hash = $('checksum-result')?.dataset.hash;
      if (!hash) { setStatus('checksum-status', 'Calculate a hash before copying.', true); return; }
      copyText(hash).then((copied) => setStatus('checksum-status', copied ? 'SHA-256 hash copied.' : 'Clipboard unavailable; select and copy the hash manually.', !copied));
    }
    if (action === 'event-cancel') cancelEventEdit();
    if (action.startsWith('event-edit:')) editEvent(action.slice('event-edit:'.length));
    if (action.startsWith('event-delete:')) {
      const id = action.slice('event-delete:'.length), next = loadEvents().filter((item) => item.id !== id);
      if (saveEvents(next)) { if (editingEventId === id) cancelEventEdit(); renderEvents(); setStatus('event-status', 'Event deleted.'); }
    }
    if (action === 'resume-print') printResume();
    if (action === 'resume-clear') {
      ['resume-name','resume-email','resume-phone','resume-location','resume-summary','resume-education','resume-experience','resume-skills'].forEach((fieldId) => { if ($(fieldId)) $(fieldId).value = ''; });
      renderResumePreview(); setStatus('resume-status', 'Resume fields cleared.');
    }
  }
  function onSubmit(event) { if (event.target.id === 'event-form') eventSubmit(event); }

  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  document.addEventListener('click', onClick);
  document.addEventListener('submit', onSubmit);

  const content = document.querySelector('#tool-content');
  const dialog = document.querySelector('#tool-dialog');
  function cleanupActiveTool() {
    stopTyping();
    if (eventTimer) clearInterval(eventTimer);
    eventTimer = null; editingEventId = null;
    imageRenderToken += 1;
    if (imageBitmap?.close) imageBitmap.close(); imageBitmap = null; imageOriginal = null; imageOutputCanvas = null;
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl); imageObjectUrl = null;
  }
  dialog?.addEventListener('close', cleanupActiveTool);
  if (content) new MutationObserver(() => {
    if ($('typing-input')) resetTyping(); else stopTyping();
    if ($('event-list')) {
      renderEvents(); updateEventCountdowns();
      if (!eventTimer) eventTimer = setInterval(updateEventCountdowns, 1000);
    } else {
      if (eventTimer) clearInterval(eventTimer);
      eventTimer = null; editingEventId = null;
    }
    if ($('resume-preview')) renderResumePreview();
    if (!$('crop-file')) {
      imageRenderToken += 1;
      if (imageBitmap?.close) imageBitmap.close(); imageBitmap = null; imageOriginal = null; imageOutputCanvas = null;
      if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl); imageObjectUrl = null;
    }
  }).observe(content, { childList: true });

  window.addEventListener('afterprint', () => { if (resumePrintCleanup) resumePrintCleanup(); });
})();
