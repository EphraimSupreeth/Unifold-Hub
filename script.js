const themeToggle = document.querySelector('.theme-toggle');
const themeLabel = document.querySelector('.theme-label');
const searchInput = document.querySelector('#tool-search');
const filterButtons = document.querySelectorAll('.filter-button');
const toolCards = document.querySelectorAll('.tool-card');
const visibleCount = document.querySelector('#visible-count');
const emptyState = document.querySelector('#empty-state');
const clearSearch = document.querySelector('#clear-search');
function setTheme(theme) {
  const currentTheme = theme === 'dark' ? 'dark' : 'light';
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = currentTheme;
  themeLabel.textContent = nextTheme === 'dark' ? 'Dark theme' : 'Light theme';
  themeToggle.setAttribute('aria-label', `Switch to ${nextTheme} theme`);
  themeToggle.setAttribute('aria-pressed', String(currentTheme === 'dark'));
  themeToggle.title = `Switch to ${nextTheme} theme`;
}

let savedTheme = null;
try {
  savedTheme = localStorage.getItem('everyday-tools-theme');
} catch {
  // The theme toggle still works when browser storage is unavailable.
}
setTheme(savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

themeToggle.addEventListener('click', () => {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme);
  try {
    localStorage.setItem('everyday-tools-theme', nextTheme);
  } catch {
    // Keep the selected theme for this page view if storage is unavailable.
  }
});

let activeCategory = 'all';

function organizeToolSections() {
  const categoryByName = {
    ...window.UNIFOLD_TOOL_CATEGORIES,
    Calculator: 'utilities', 'Unit Converter': 'utilities', 'Percentage Calculator': 'utilities',
    'Timer & Stopwatch': 'utilities', 'To-do List': 'utilities', 'Age Calculator': 'utilities',
    'GST Calculator': 'utilities', 'Discount Calculator': 'utilities', 'Date Difference': 'utilities',
    'Data Storage Converter': 'utilities', 'Cooking Converter': 'utilities', 'Random Decision Picker': 'utilities',
    'Image Studio': 'image', 'Audio Studio': 'audio', 'PDF & Documents Studio': 'pdf',
    'Word Counter': 'utilities', 'Text Formatter': 'utilities', 'Quick Notes': 'utilities', 'QR Code Designer': 'web',
    'QR Code Scanner': 'web', 'Barcode Scanner': 'web',
    'Barcode Generator': 'web'
  };
  const source = document.querySelector('#tool-grid');
  toolCards.forEach((card) => {
    const category = categoryByName[card.dataset.name] || 'utilities';
    card.dataset.category = category;
    document.querySelector(`[data-category-grid="${category}"]`).append(card);
  });
  source.remove();
}

const categoryLabels = {
  ...window.UNIFOLD_CATEGORY_LABELS,
  utilities: 'Everyday Utilities', image: 'Image Studio', audio: 'Audio Studio',
  pdf: 'PDF & Documents', text: 'Text & OCR Studio', web: 'Web & Link Tools'
};

function updateTools() {
  const query = searchInput.value.trim().toLowerCase();
  const terms = query.split(/\s+/).filter(Boolean);
  let count = 0;
  clearSearch.hidden = query.length === 0;

  toolCards.forEach((card) => {
    const searchableText = `${card.dataset.name} ${categoryLabels[card.dataset.category] || ''} ${card.querySelector('p').textContent} ${card.dataset.keywords || ''}`.toLowerCase();
    const matchesSearch = terms.every((term) => searchableText.includes(term));
    const matchesCategory = activeCategory === 'all' || card.dataset.category === activeCategory;
    const isVisible = matchesSearch && matchesCategory;
    card.hidden = !isVisible;
    if (isVisible) count += 1;
  });

  visibleCount.textContent = count;
  document.querySelectorAll('[data-tool-section]').forEach((section) => {
    const hasVisible = section.querySelectorAll('.tool-card:not([hidden])').length > 0;
    const isSelectedEmptyCategory = activeCategory === section.dataset.toolSection && !query;
    section.hidden = !hasVisible && !isSelectedEmptyCategory;
  });
  filterButtons.forEach((button) => {
    if (button.dataset.filter !== 'all') {
      const total = Array.from(toolCards).filter((card) => card.dataset.category === button.dataset.filter).length;
      let badge = button.querySelector('span');
      if (!badge) { badge = document.createElement('span'); button.append(badge); }
      badge.textContent = total;
    } else if (button.querySelector('span')) button.querySelector('span').textContent = toolCards.length;
  });
  emptyState.hidden = count !== 0;
  if (count === 0) {
    emptyState.textContent = query
      ? `No tools found for “${searchInput.value.trim()}”. Try a different keyword or category, or clear your search.`
      : 'No tools in this category yet. Choose another category to explore the full collection.';
  }
}

searchInput.addEventListener('input', updateTools);
searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (searchInput.value) {
      searchInput.value = '';
      updateTools();
    }
    return;
  }
  if (event.key === 'ArrowDown') {
    const firstResult = Array.from(toolCards).find((card) => !card.hidden);
    if (firstResult) { event.preventDefault(); firstResult.focus(); }
  }
  if (event.key === 'Enter' && searchInput.value.trim()) {
    const firstResult = Array.from(toolCards).find((card) => !card.hidden);
    if (firstResult) { event.preventDefault(); firstResult.click(); }
  }
});
document.querySelector('.header-search')?.addEventListener('click', () => {
  searchInput.focus();
  searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
clearSearch.addEventListener('click', () => {
  searchInput.value = '';
  updateTools();
  searchInput.focus();
});
filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeCategory = button.dataset.filter;
    filterButtons.forEach((filter) => {
      const isActive = filter === button;
      filter.classList.toggle('is-active', isActive);
      filter.setAttribute('aria-pressed', String(isActive));
    });
    updateTools();
  });
});

document.addEventListener('keydown', (event) => {
  const target = event.target;
  const isEditing = target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable);
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !isEditing && !document.querySelector('dialog[open]')) {
    event.preventDefault();
    searchInput.focus();
  }
});

const calculatorCard = document.querySelector('.calculator-card');
const calculatorDialog = document.querySelector('#calculator-dialog');
const calculatorExpression = document.querySelector('#calculator-expression');
const calculatorValue = document.querySelector('#calculator-value');
let calculation = '';
let calculationMessage = 'Enter an expression';
let calculationWasResult = false;

function renderCalculator() {
  calculatorExpression.textContent = calculationMessage;
  calculatorValue.textContent = calculation || '0';
}

function openCalculator() {
  calculatorDialog.showModal();
  calculatorDialog.querySelector('[data-calculator-close]').focus();
}

function closeCalculator() {
  if (calculatorDialog.open) calculatorDialog.close();
}

function evaluateCalculation(source) {
  const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+\-]?\d+)?|[()+\-*\/]/g);
  if (!tokens || tokens.join('') !== source) throw new Error('Invalid expression');
  let position = 0;

  function parsePrimary() {
    const token = tokens[position++];
    if (token === '(') {
      const value = parseSum();
      if (tokens[position++] !== ')') throw new Error('Invalid expression');
      return value;
    }
    if (token === undefined || token === ')' || Number.isNaN(Number(token))) throw new Error('Invalid expression');
    return Number(token);
  }

  function parseUnary() {
    if (tokens[position] === '+') { position += 1; return parseUnary(); }
    if (tokens[position] === '-') { position += 1; return -parseUnary(); }
    return parsePrimary();
  }

  function parseProduct() {
    let value = parseUnary();
    while (tokens[position] === '*' || tokens[position] === '/') {
      const operator = tokens[position++];
      const right = parseUnary();
      if (operator === '/' && right === 0) throw new Error('Cannot divide by zero');
      value = operator === '*' ? value * right : value / right;
      if (!Number.isFinite(value)) throw new Error('Result is out of range');
    }
    return value;
  }

  function parseSum() {
    let value = parseProduct();
    while (tokens[position] === '+' || tokens[position] === '-') {
      const operator = tokens[position++];
      const right = parseProduct();
      value = operator === '+' ? value + right : value - right;
      if (!Number.isFinite(value)) throw new Error('Result is out of range');
    }
    return value;
  }

  const result = parseSum();
  if (position !== tokens.length) throw new Error('Invalid expression');
  return Number(result.toPrecision(12));
}

function addCalculatorInput(value) {
  if (calculationWasResult && /[\d.(]/.test(value)) calculation = '';
  calculationWasResult = false;

  if (value === '.') {
    const lastOperator = Math.max(calculation.lastIndexOf('+'), calculation.lastIndexOf('-'), calculation.lastIndexOf('*'), calculation.lastIndexOf('/'), calculation.lastIndexOf('('));
    if (calculation.slice(lastOperator + 1).includes('.')) return;
    if (!calculation || /[+\-*\/(]$/.test(calculation)) calculation += '0';
  }

  if (/^[+\-*\/]$/.test(value)) {
    if (!calculation && value !== '-') return;
    if (/[+\-*\/]$/.test(calculation)) {
      if (value === '-' && !calculation.endsWith('-')) calculation += value;
      else calculation = calculation.slice(0, -1) + value;
    } else if (!calculation.endsWith('(') || value === '-') {
      calculation += value;
    }
  } else {
    calculation += value;
  }

  calculationMessage = 'Enter an expression';
  renderCalculator();
}

function calculate() {
  if (!calculation) {
    calculationMessage = 'Enter an expression first';
    renderCalculator();
    return;
  }
  try {
    const original = calculation;
    calculation = String(evaluateCalculation(calculation));
    calculationMessage = `${original} =`;
    calculationWasResult = true;
  } catch (error) {
    calculationMessage = error.message === 'Cannot divide by zero' ? 'Cannot divide by zero' : 'Invalid expression';
    calculationWasResult = false;
  }
  renderCalculator();
}

function handleCalculatorAction(action) {
  if (action === 'clear') {
    calculation = '';
    calculationMessage = 'Cleared';
    calculationWasResult = false;
  } else if (action === 'delete') {
    calculation = calculation.slice(0, -1);
    calculationMessage = 'Enter an expression';
    calculationWasResult = false;
  } else if (action === 'equals') {
    calculate();
    return;
  }
  renderCalculator();
}

calculatorCard.addEventListener('click', openCalculator);
calculatorCard.addEventListener('keydown', (event) => {
  if (event.target !== calculatorCard) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openCalculator();
  }
});
calculatorDialog.querySelector('[data-calculator-close]').addEventListener('click', closeCalculator);
calculatorDialog.addEventListener('close', () => calculatorCard.focus());
calculatorDialog.addEventListener('click', (event) => {
  if (event.target === calculatorDialog) closeCalculator();
});
calculatorDialog.querySelector('.calculator-keys').addEventListener('click', (event) => {
  const key = event.target.closest('button');
  if (!key) return;
  if (key.dataset.calculatorAction) handleCalculatorAction(key.dataset.calculatorAction);
  else addCalculatorInput(key.dataset.calculatorValue);
});

document.addEventListener('keydown', (event) => {
  if (!calculatorDialog.open) return;
  if (/^[0-9.+\-*\/()]$/.test(event.key)) {
    event.preventDefault();
    addCalculatorInput(event.key);
  } else if (event.key === 'Enter' || event.key === '=') {
    event.preventDefault();
    calculate();
  } else if (event.key === 'Backspace') {
    event.preventDefault();
    handleCalculatorAction('delete');
  } else if (event.key === 'Escape') {
    closeCalculator();
  }
});

// The remaining tools share a single accessible dialog so the directory and its
// search, filters, theme, and the existing calculator remain independent.
const toolsDialog = document.querySelector('#tool-dialog');
const toolContent = document.querySelector('#tool-content');
let toolOpener = null;
let activeTool = '';
let converterCategory = 'length';
let timerMode = 'timer';
let countdownRemaining = 0;
let countdownStartedAt = 0;
let countdownRunning = false;
let stopwatchElapsed = 0;
let stopwatchStartedAt = 0;
let stopwatchRunning = false;
let clockInterval = null;
let stopwatchLaps = [];
let taskFilter = 'all';
let editingTaskId = null;
let imageSourceUrl = null;
let imageOutputUrl = null;
let imageSource = null;
let pdfDownloadUrls = [];
let tasks = loadTasks();

function loadTasks() {
  try {
    const value = JSON.parse(localStorage.getItem('everyday-tools-tasks') || '[]');
    return Array.isArray(value) ? value.filter((task) => task && typeof task.text === 'string') : [];
  } catch { return []; }
}

function saveTasks() {
  try { localStorage.setItem('everyday-tools-tasks', JSON.stringify(tasks)); }
  catch { setToolMessage('Tasks could not be saved in this browser.', 'error'); }
}

function escapeToolText(text) {
  return String(text).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function toolHeader(title) {
  return `<div class="tool-heading"><div><span class="section-kicker">Unifold toolkit</span><h2 id="tool-dialog-title">${title}</h2></div><button class="tool-back" type="button" data-tool-action="back">← Back to tools</button></div>`;
}

function openTool(card) {
  toolOpener = card;
  activeTool = card.dataset.name;
  if (activeTool === 'Unit Converter') converterCategory = 'length';
  if (activeTool === 'Timer & Stopwatch') timerMode = 'timer';
  renderTool();
  toolsDialog.showModal();
  const firstControl = toolContent.querySelector('input, textarea, select, button');
  if (firstControl) firstControl.focus();
}

function renderTool() {
  const templates = {
    'Unit Converter': renderConverter,
    'Word Counter': renderWordCounter,
    'Percentage Calculator': renderPercentage,
    'Timer & Stopwatch': renderClocks,
    'To-do List': renderTodo,
    'Text Formatter': renderFormatter,
    'QR Code Designer': renderQrDesigner,
    'Age Calculator': renderAgeCalculator,
    'GST Calculator': renderGstCalculator,
    'Discount Calculator': renderDiscountCalculator,
    'Date Difference': renderDateDifference,
    'Data Storage Converter': renderStorageConverter,
    'Cooking Converter': renderCookingConverter,
    'Random Decision Picker': renderDecisionPicker,
    'Quick Notes': renderQuickNotes,
    'QR Code Scanner': () => renderScanner('qr'),
    'Barcode Scanner': () => renderScanner('barcode'),
    'Barcode Generator': renderBarcodeGenerator,
    'Image Studio': renderImageStudio,
    'Audio Studio': renderAudioStudio,
    'PDF & Documents Studio': renderPdfStudio
  };
  const newToolMarkup = window.UnifoldNewTools?.render(activeTool);
  const template = templates[activeTool] || (newToolMarkup ? () => newToolMarkup : null);
  toolContent.innerHTML = `${toolHeader(escapeToolText(activeTool))}${template ? template() : ''}`;
  if (activeTool === 'Unit Converter') { updateConverterUnits(); updateConverter(); }
  if (activeTool === 'Word Counter') updateWordStats();
  if (activeTool === 'Percentage Calculator') { percentageFields('of'); calculatePercentage(); }
  if (activeTool === 'Timer & Stopwatch') updateClockDisplay();
  if (activeTool === 'To-do List') renderTaskList();
  if (activeTool === 'Age Calculator') updateAgeResult();
  if (activeTool === 'GST Calculator') updateGstResult();
  if (activeTool === 'Discount Calculator') updateDiscountResult();
  if (activeTool === 'Date Difference') updateDateDifference();
  if (activeTool === 'Data Storage Converter') updateStorageResult();
  if (activeTool === 'Cooking Converter') updateCookingResult();
  if (activeTool === 'Quick Notes') loadQuickNotes();
  if (activeTool === 'Audio Studio') {
    drawAudioWaveform(null);
    document.querySelector('#audio-volume').addEventListener('input', (event) => {
      document.querySelector('#audio-volume-label').textContent = `${event.target.value}%`;
      const player = document.querySelector('#audio-player');
      if (player) player.volume = Math.min(1, Number(event.target.value) / 100);
    });
  }
}

const unitSets = {
  length: { mm: ['Millimeters', 0.001], cm: ['Centimeters', 0.01], m: ['Meters', 1], km: ['Kilometers', 1000], in: ['Inches', 0.0254], ft: ['Feet', 0.3048], yd: ['Yards', 0.9144], mi: ['Miles', 1609.344] },
  mass: { mg: ['Milligrams', 0.000001], g: ['Grams', 0.001], kg: ['Kilograms', 1], lb: ['Pounds', 0.45359237] },
  temperature: { C: ['Celsius'], F: ['Fahrenheit'], K: ['Kelvin'] },
  time: { s: ['Seconds', 1], min: ['Minutes', 60], h: ['Hours', 3600], d: ['Days', 86400] },
  speed: { kmh: ['Kilometers per hour', 1 / 3.6], mph: ['Miles per hour', 0.44704], ms: ['Meters per second', 1], knot: ['Knots', 0.5144444444444445], fps: ['Feet per second', 0.3048] }
};
const CURRENCIES = [['INR','Indian rupee'],['USD','US dollar'],['EUR','Euro'],['GBP','British pound'],['AED','UAE dirham'],['JPY','Japanese yen'],['CAD','Canadian dollar'],['AUD','Australian dollar'],['CHF','Swiss franc'],['CNY','Chinese yuan']];
const CONVERTER_ZONES = [['America/Los_Angeles','Los Angeles'],['America/Denver','Denver'],['America/Chicago','Chicago'],['America/New_York','New York'],['America/Toronto','Toronto'],['America/Sao_Paulo','São Paulo'],['Europe/London','London'],['Europe/Paris','Paris'],['Europe/Berlin','Berlin'],['Africa/Johannesburg','Johannesburg'],['Asia/Dubai','Dubai'],['Asia/Kolkata','Mumbai / Kolkata'],['Asia/Singapore','Singapore'],['Asia/Tokyo','Tokyo'],['Australia/Sydney','Sydney'],['Pacific/Auckland','Auckland']];
let currencyRateDate = '';
let currencyRequestId = 0;
let currencyNoticeId = null;

function unitOptions(category, selected) {
  return Object.entries(unitSets[category]).map(([key, details]) => `<option value="${key}" ${key === selected ? 'selected' : ''}>${details[0]}</option>`).join('');
}

function renderConverter() {
  const zoneOptions = CONVERTER_ZONES.map(([zone, city]) => `<option value="${zone}">${city} (${zone})</option>`).join('');
  const currencyOptions = CURRENCIES.map(([code, name]) => `<option value="${code}">${code} · ${name}</option>`).join('');
  return `<div class="tool-form-grid">
    <label class="tool-field">Category<select class="tool-select" id="unit-category"><option value="length">Distance &amp; Length</option><option value="mass">Mass</option><option value="temperature">Temperature</option><option value="time">Time</option><option value="speed">Speed</option><option value="timezone">Time Zones</option><option value="currency">Currency</option></select></label>
    <label class="tool-field" id="unit-value-field">Value<input class="tool-input" id="unit-value" type="number" step="any" value="1" inputmode="decimal"></label>
    <label class="tool-field" id="unit-from-field">From<select class="tool-select" id="unit-from"></select></label>
    <label class="tool-field" id="unit-to-field">To<select class="tool-select" id="unit-to"></select></label>
  </div>
  <div id="unit-timezone-panel" hidden><p class="tool-message">Enter the source city’s local date and time. Uses IANA time zones and browser time-zone data, including daylight-saving rules.</p><div class="tool-form-grid"><label class="tool-field">Source date and time<input class="tool-input" id="unit-zone-datetime" type="datetime-local"></label><label class="tool-field">From city<select class="tool-select" id="unit-zone-from">${zoneOptions}</select></label><label class="tool-field">To city<select class="tool-select" id="unit-zone-to">${zoneOptions.replace('value="Europe/London"','value="Europe/London" selected')}</select></label></div><div class="tool-result" id="unit-zone-result" aria-live="polite">Choose a date and time.</div></div>
  <div id="unit-currency-panel" hidden><p class="tool-message">Live reference rates are fetched from Frankfurter (ECB reference rates; typically updated on business days, not for trading). This feature needs internet access. If unavailable, enter your own rate below.</p><div class="tool-form-grid"><label class="tool-field">Amount<input class="tool-input" id="unit-currency-amount" type="number" step="any" value="1" inputmode="decimal"></label><label class="tool-field">From<select class="tool-select" id="unit-currency-from">${currencyOptions}</select></label><label class="tool-field">To<select class="tool-select" id="unit-currency-to">${currencyOptions.replace('value="EUR"','value="EUR" selected')}</select></label><label class="tool-field">Manual rate (target units per 1 source unit)<input class="tool-input" id="unit-currency-rate" type="number" min="0" step="any" placeholder="Fetched rate or enter manually"></label></div><div class="tool-actions"><button class="tool-button" type="button" data-unit-action="fetch-currency">Fetch latest reference rate</button></div><div class="tool-result" id="unit-currency-result" aria-live="polite">Fetch a live rate or enter a manual rate.</div><p class="tool-message" id="unit-currency-status" role="status">No rates are hard-coded or assumed.</p></div>
  <div id="unit-standard-actions" class="tool-actions"><button class="tool-button" type="button" data-tool-action="swap-units">⇄ Swap units</button></div><div class="tool-result" id="unit-result" aria-live="polite"></div>`;
}

function updateConverterUnits() {
  const standardFields = ['unit-value-field', 'unit-from-field', 'unit-to-field', 'unit-standard-actions', 'unit-result'];
  const isZone = converterCategory === 'timezone';
  const isCurrency = converterCategory === 'currency';
  standardFields.forEach((id) => { const node = document.getElementById(id); if (node) node.hidden = isZone || isCurrency; });
  document.querySelector('#unit-timezone-panel').hidden = !isZone;
  document.querySelector('#unit-currency-panel').hidden = !isCurrency;
  if (isZone) {
    const date = document.querySelector('#unit-zone-datetime');
    if (!date.value) { const now = new Date(); date.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}T09:00`; }
    updateZoneConverter();
    return;
  }
  if (isCurrency) { updateCurrencyConverter(); return; }
  const category = converterCategory === 'distance' ? 'length' : converterCategory;
  const from = document.querySelector('#unit-from');
  const to = document.querySelector('#unit-to');
  const keys = Object.keys(unitSets[category]);
  const oldFrom = from.value || keys[0];
  const oldTo = to.value || keys[1] || keys[0];
  from.innerHTML = unitOptions(category, keys.includes(oldFrom) ? oldFrom : keys[0]);
  to.innerHTML = unitOptions(category, keys.includes(oldTo) ? oldTo : (keys[1] || keys[0]));
}

function updateConverter() {
  if (converterCategory === 'timezone') { updateZoneConverter(); return; }
  if (converterCategory === 'currency') { updateCurrencyConverter(); return; }
  const input = document.querySelector('#unit-value');
  if (!input) return;
  const value = Number(input.value);
  if (input.value.trim() === '' || !Number.isFinite(value)) {
    document.querySelector('#unit-result').textContent = 'Enter a valid number to convert.';
    return;
  }
  const category = converterCategory === 'distance' ? 'length' : converterCategory;
  const from = document.querySelector('#unit-from').value;
  const to = document.querySelector('#unit-to').value;
  let result;
  if (category === 'temperature') {
    const celsius = from === 'C' ? value : from === 'F' ? (value - 32) * 5 / 9 : value - 273.15;
    result = to === 'C' ? celsius : to === 'F' ? celsius * 9 / 5 + 32 : celsius + 273.15;
  } else {
    result = value * unitSets[category][from][1] / unitSets[category][to][1];
  }
  const precision = Number(result.toPrecision(10));
  const fromName = unitSets[category][from][0];
  const toName = unitSets[category][to][0];
  document.querySelector('#unit-result').textContent = `${value} ${fromName} = ${precision} ${toName}`;
}

function zoneParts(date, zone) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date).map((part) => [part.type, part.value]));
}
function sameWallTime(parts, wanted) {
  return ['year','month','day','hour','minute'].every((key) => Number(parts[key]) === wanted[key]);
}
function resolveWallTime(value, zone) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error('Choose a valid source date and time.');
  const wanted = { year:+match[1], month:+match[2], day:+match[3], hour:+match[4], minute:+match[5] };
  const wallUtc = Date.UTC(wanted.year, wanted.month - 1, wanted.day, wanted.hour, wanted.minute);
  let guess = wallUtc;
  for (let i = 0; i < 5; i += 1) {
    const p = zoneParts(new Date(guess), zone);
    const representedUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    const next = wallUtc - (representedUtc - guess);
    if (next === guess) break;
    guess = next;
  }
  const candidates = [];
  for (let time = guess - 3 * 3600000; time <= guess + 3 * 3600000; time += 60000) {
    if (sameWallTime(zoneParts(new Date(time), zone), wanted)) candidates.push(time);
  }
  if (!candidates.length) throw new Error('That local time does not exist in the selected time zone because clocks move forward. Choose another time.');
  return { instant: new Date(candidates[0]), ambiguous: candidates.length > 1 };
}
function zoneOffset(date, zone) {
  const name = new Intl.DateTimeFormat('en', { timeZone: zone, timeZoneName: 'longOffset' }).formatToParts(date).find((part) => part.type === 'timeZoneName')?.value;
  return name?.replace('GMT', 'UTC') || 'UTC offset unavailable';
}
function updateZoneConverter() {
  const output = document.querySelector('#unit-zone-result');
  if (!output) return;
  try {
    const sourceZone = document.querySelector('#unit-zone-from').value;
    const destinationZone = document.querySelector('#unit-zone-to').value;
    const { instant, ambiguous } = resolveWallTime(document.querySelector('#unit-zone-datetime').value, sourceZone);
    const format = (zone) => new Intl.DateTimeFormat(undefined, { timeZone: zone, weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(instant);
    output.textContent = `${sourceZone}: ${format(sourceZone)} (${zoneOffset(instant, sourceZone)})\n${destinationZone}: ${format(destinationZone)} (${zoneOffset(instant, destinationZone)})${ambiguous ? '\nThis source time occurs twice when clocks move back; the earlier occurrence is shown.' : ''}`;
    output.style.whiteSpace = 'pre-line';
  } catch (error) { output.textContent = error.message || 'Could not convert this time with the browser time-zone database.'; }
}
async function fetchCurrencyRate() {
  const from = document.querySelector('#unit-currency-from').value;
  const to = document.querySelector('#unit-currency-to').value;
  const status = document.querySelector('#unit-currency-status');
  const requestId = ++currencyRequestId;
  currencyRateDate = '';
  if (from === to) { currencyRateDate = 'Same currency; no exchange rate needed'; document.querySelector('#unit-currency-rate').value = '1'; status.textContent = currencyRateDate; updateCurrencyConverter(); return; }
  if (currencyNoticeId) window.notify?.dismiss(currencyNoticeId);
  const loadingId = window.notify?.loading('Fetching the latest reference rate…', { dedupeKey: `currency-rate-fetch-${requestId}` });
  currencyNoticeId = loadingId;
  status.textContent = 'Fetching reference rate from Frankfurter…';
  try {
    const response = await fetch(`https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(from)}&symbols=${encodeURIComponent(to)}`);
    if (!response.ok) throw new Error(`Rate service returned HTTP ${response.status}.`);
    const data = await response.json();
    const rate = data?.rates?.[to];
    if (!Number.isFinite(rate) || rate <= 0 || !data.date) throw new Error('The rate service did not return a valid rate.');
    if (requestId !== currencyRequestId) {
      if (loadingId) window.notify?.dismiss(loadingId);
      if (currencyNoticeId === loadingId) currencyNoticeId = null;
      return;
    }
    currencyRateDate = data.date;
    document.querySelector('#unit-currency-rate').value = String(rate);
    status.textContent = `ECB reference rate · date ${data.date}. Not a real-time trading quote.`;
    updateCurrencyConverter();
    if (loadingId) window.notify?.update(loadingId, { type: 'success', title: 'Reference rate updated', message: `Rate loaded for ${from} to ${to} · ${data.date}.`, duration: 4500, persistent: false });
  } catch (error) {
    if (requestId !== currencyRequestId) {
      if (loadingId) window.notify?.dismiss(loadingId);
      if (currencyNoticeId === loadingId) currencyNoticeId = null;
      return;
    }
    status.textContent = `${error.message} Enter a manual rate above; no live rate is assumed.`;
    if (loadingId) window.notify?.update(loadingId, { type: 'error', title: 'Rate unavailable', message: 'Could not fetch a reference rate. Check your connection or enter a manual rate.', duration: 0, persistent: true });
    updateCurrencyConverter();
  }
}
function updateCurrencyConverter() {
  const output = document.querySelector('#unit-currency-result');
  if (!output) return;
  const amountField = document.querySelector('#unit-currency-amount');
  const rateField = document.querySelector('#unit-currency-rate');
  const amount = Number(amountField.value);
  const rate = Number(rateField.value);
  if (!amountField.value.trim() || !Number.isFinite(amount) || !Number.isFinite(rate) || rate <= 0) {
    output.textContent = 'Enter a valid amount and fetch or enter a positive rate.';
    return;
  }
  const from = document.querySelector('#unit-currency-from').value;
  const to = document.querySelector('#unit-currency-to').value;
  output.textContent = `${amount} ${from} = ${Number((amount * rate).toPrecision(10))} ${to}${currencyRateDate ? ` · Rate date: ${currencyRateDate}` : ' · Manually entered rate'}`;
}

document.addEventListener('change', (event) => {
  if (activeTool !== 'Unit Converter') return;
  const id = event.target.id;
  if (id === 'unit-category') {
    currencyRequestId += 1;
    if (currencyNoticeId) window.notify?.dismiss(currencyNoticeId);
    currencyNoticeId = null;
    converterCategory = event.target.value;
    currencyRateDate = '';
    updateConverterUnits(); updateConverter();
  } else if (['unit-zone-datetime', 'unit-zone-from', 'unit-zone-to'].includes(id)) updateZoneConverter();
  else if (id === 'unit-currency-from' || id === 'unit-currency-to') {
    currencyRequestId += 1; currencyRateDate = '';
    if (currencyNoticeId) window.notify?.dismiss(currencyNoticeId);
    currencyNoticeId = null;
    document.querySelector('#unit-currency-rate').value = '';
    document.querySelector('#unit-currency-status').textContent = 'Currency pair changed. Fetch a new reference rate or enter a manual rate.';
    updateCurrencyConverter();
  }
});
document.addEventListener('input', (event) => {
  if (activeTool !== 'Unit Converter') return;
  if (event.target.id === 'unit-currency-rate') { currencyRateDate = ''; updateCurrencyConverter(); }
  if (event.target.id === 'unit-currency-amount') updateCurrencyConverter();
});
document.addEventListener('click', (event) => {
  const action = event.target.closest('[data-unit-action="fetch-currency"]');
  if (activeTool === 'Unit Converter' && action) fetchCurrencyRate();
});

function renderWordCounter() {
  return `<label class="tool-field">Your text<textarea class="tool-textarea" id="word-text" placeholder="Type or paste your text here..."></textarea></label>
    <div class="tool-stats" aria-live="polite"><div class="tool-stat"><strong id="stat-words">0</strong><span>Words</span></div><div class="tool-stat"><strong id="stat-chars">0</strong><span>Characters</span></div><div class="tool-stat"><strong id="stat-no-spaces">0</strong><span>No spaces</span></div><div class="tool-stat"><strong id="stat-sentences">0</strong><span>Sentences</span></div><div class="tool-stat"><strong id="stat-paragraphs">0</strong><span>Paragraphs</span></div></div>
    <div class="tool-actions"><button class="tool-button primary" type="button" data-tool-action="copy-word">Copy</button><button class="tool-button" type="button" data-tool-action="select-word">Select all</button><button class="tool-button danger" type="button" data-tool-action="clear-word">Clear</button></div><p class="tool-message" id="tool-message" role="status"></p>`;
}

function updateWordStats() {
  const area = document.querySelector('#word-text');
  if (!area) return;
  const text = area.value;
  const words = text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || [];
  const sentences = text.trim() ? (text.match(/[.!?]+(?=\s|$)/g) || []).length : 0;
  const paragraphs = text.split(/\n\s*\n/).filter((part) => part.trim()).length;
  document.querySelector('#stat-words').textContent = words.length;
  document.querySelector('#stat-chars').textContent = text.length;
  document.querySelector('#stat-no-spaces').textContent = text.replace(/\s/g, '').length;
  document.querySelector('#stat-sentences').textContent = sentences;
  document.querySelector('#stat-paragraphs').textContent = paragraphs;
}

function renderPercentage() {
  return `<label class="tool-field">Calculation<select class="tool-select" id="percent-mode"><option value="of">X% of a number</option><option value="is">What percent is X of Y?</option><option value="change">Percentage increase / decrease</option><option value="discount">Discount price</option></select></label><div class="tool-form-grid" id="percent-fields"></div><div class="tool-result" id="percent-result" aria-live="polite"></div><p class="tool-message" id="tool-message" role="status"></p>`;
}

function percentageFields(mode) {
  const definitions = {
    of: [['percent-a', 'Percent', 'number'], ['percent-b', 'Number', 'number']],
    is: [['percent-a', 'Value', 'number'], ['percent-b', 'Total', 'number']],
    change: [['percent-a', 'Original value', 'number'], ['percent-b', 'New value', 'number']],
    discount: [['percent-a', 'Original price', 'number'], ['percent-b', 'Discount (%)', 'number']]
  };
  document.querySelector('#percent-fields').innerHTML = definitions[mode].map(([id, label]) => `<label class="tool-field">${label}<input class="tool-input percentage-input" id="${id}" type="number" step="any" inputmode="decimal" placeholder="Enter ${label.toLowerCase()}"></label>`).join('');
}

function calculatePercentage() {
  const mode = document.querySelector('#percent-mode');
  if (!mode) return;
  const first = document.querySelector('#percent-a');
  const second = document.querySelector('#percent-b');
  const result = document.querySelector('#percent-result');
  if (!first || !second) return;
  if (first.value.trim() === '' || second.value.trim() === '') { result.textContent = 'Enter both values to see the result.'; return; }
  const a = Number(first.value);
  const b = Number(second.value);
  if (!Number.isFinite(a) || !Number.isFinite(b)) { result.textContent = 'Please enter valid numbers.'; return; }
  let answer;
  if (mode.value === 'of') answer = `${a}% of ${b} = ${b * a / 100}`;
  if (mode.value === 'is') answer = b === 0 ? null : `${a} is ${a / b * 100}% of ${b}`;
  if (mode.value === 'change') answer = a === 0 ? null : `${Math.abs((b - a) / a * 100)}% ${b >= a ? 'increase' : 'decrease'}`;
  if (mode.value === 'discount') answer = a < 0 ? 'Original price cannot be negative.' : b < 0 || b > 100 ? 'Discount must be between 0 and 100%.' : `You save ${a * b / 100}. Sale price: ${a - a * b / 100}`;
  result.textContent = answer || (mode.value === 'is' ? 'Cannot calculate a percentage of zero.' : 'Percentage change from zero is undefined.');
}

function localDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function dateFromInput(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]) ? date : null;
}
function renderAgeCalculator() {
  return `<div class="tool-form-grid"><label class="tool-field">Date of birth<input class="tool-input" id="age-birth" type="date" max="${localDateValue()}"></label><label class="tool-field">Age on<input class="tool-input" id="age-asof" type="date" value="${localDateValue()}"></label></div><div class="tool-result" id="age-result" aria-live="polite">Choose a valid date of birth.</div>`;
}
function updateAgeResult() {
  const output = document.querySelector('#age-result');
  if (!output) return;
  const birth = dateFromInput(document.querySelector('#age-birth').value);
  const asOf = dateFromInput(document.querySelector('#age-asof').value);
  if (!birth || !asOf || birth > asOf) { output.textContent = 'Choose valid dates, with the date of birth no later than the age-on date.'; return; }
  let years = asOf.getFullYear() - birth.getFullYear();
  const makeAnniversary = (year, month, day) => new Date(year, month, Math.min(day, new Date(year, month + 1, 0).getDate()));
  if (asOf < makeAnniversary(asOf.getFullYear(), birth.getMonth(), birth.getDate())) years -= 1;
  let cursor = makeAnniversary(birth.getFullYear() + years, birth.getMonth(), birth.getDate());
  let months = (asOf.getFullYear() - cursor.getFullYear()) * 12 + asOf.getMonth() - cursor.getMonth();
  if (asOf.getDate() < cursor.getDate()) months -= 1;
  cursor = makeAnniversary(cursor.getFullYear(), cursor.getMonth() + months, cursor.getDate());
  const days = Math.round((Date.UTC(asOf.getFullYear(), asOf.getMonth(), asOf.getDate()) - Date.UTC(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())) / 86400000);
  output.textContent = `${years} years, ${months} months, and ${days} days`;
}
function renderGstCalculator() {
  return `<div class="tool-form-grid"><label class="tool-field">Amount<input class="tool-input" id="gst-amount" type="number" min="0" step="any" placeholder="e.g. 100"></label><label class="tool-field">GST rate (%)<input class="tool-input" id="gst-rate" type="number" min="0" step="any" value="10"></label><label class="tool-field">Price type<select class="tool-select" id="gst-mode"><option value="add">Amount excludes GST (add GST)</option><option value="included">Amount includes GST (extract GST)</option></select></label></div><div class="tool-result" id="gst-result" aria-live="polite">Enter an amount and rate.</div>`;
}
function updateGstResult() {
  const output = document.querySelector('#gst-result');
  if (!output) return;
  const amountField = document.querySelector('#gst-amount'); const rateField = document.querySelector('#gst-rate');
  if (!amountField.value || !rateField.value) { output.textContent = 'Enter an amount and rate.'; return; }
  const amount = Number(amountField.value); const rate = Number(rateField.value);
  if (!Number.isFinite(amount) || !Number.isFinite(rate) || amount < 0 || rate < 0) { output.textContent = 'Amount and rate must be valid non-negative numbers.'; return; }
  const included = document.querySelector('#gst-mode').value === 'included';
  const tax = included ? amount * rate / (100 + rate) : amount * rate / 100;
  const total = included ? amount : amount + tax;
  output.textContent = `GST: ${tax.toFixed(2)} · ${included ? 'Before-GST amount' : 'Total including GST'}: ${(included ? amount - tax : total).toFixed(2)}`;
}
function renderDiscountCalculator() {
  return `<div class="tool-form-grid"><label class="tool-field">Original price<input class="tool-input" id="discount-price" type="number" min="0" step="any" placeholder="e.g. 79.99"></label><label class="tool-field">Discount (%)<input class="tool-input" id="discount-rate" type="number" min="0" max="100" step="any" placeholder="e.g. 20"></label></div><div class="tool-result" id="discount-result" aria-live="polite">Enter a price and discount.</div>`;
}
function updateDiscountResult() {
  const output = document.querySelector('#discount-result'); if (!output) return;
  const priceField = document.querySelector('#discount-price'); const rateField = document.querySelector('#discount-rate');
  if (!priceField.value || !rateField.value) { output.textContent = 'Enter a price and discount.'; return; }
  const price = Number(priceField.value); const rate = Number(rateField.value);
  if (!Number.isFinite(price) || !Number.isFinite(rate) || price < 0 || rate < 0 || rate > 100) { output.textContent = 'Enter a non-negative price and a discount from 0 to 100%.'; return; }
  output.textContent = `You save ${(price * rate / 100).toFixed(2)} · Sale price: ${(price * (1 - rate / 100)).toFixed(2)}`;
}
function renderDateDifference() {
  return `<div class="tool-form-grid"><label class="tool-field">Start date<input class="tool-input" id="date-start" type="date"></label><label class="tool-field">End date<input class="tool-input" id="date-end" type="date"></label></div><div class="tool-result" id="date-difference-result" aria-live="polite">Choose two dates.</div>`;
}
function updateDateDifference() {
  const output = document.querySelector('#date-difference-result'); if (!output) return;
  const start = dateFromInput(document.querySelector('#date-start').value); const end = dateFromInput(document.querySelector('#date-end').value);
  if (!start || !end) { output.textContent = 'Choose two valid dates.'; return; }
  const days = Math.abs(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000;
  output.textContent = `${days.toLocaleString()} days apart (${Math.floor(days / 7)} weeks and ${days % 7} days).`;
}
const storageFactors = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12 };
function renderStorageConverter() {
  const choices = '<option value="B">Bytes</option><option value="KB">Kilobytes (decimal)</option><option value="MB">Megabytes (decimal)</option><option value="GB">Gigabytes (decimal)</option><option value="TB">Terabytes (decimal)</option>';
  return `<div class="tool-form-grid"><label class="tool-field">Value<input class="tool-input" id="storage-value" type="number" min="0" step="any" value="1"></label><label class="tool-field">From<select class="tool-select" id="storage-from">${choices}</select></label><label class="tool-field">To<select class="tool-select" id="storage-to">${choices.replace('value="MB"', 'value="MB" selected')}</select></label></div><div class="tool-result" id="storage-result" aria-live="polite"></div><p class="tool-message">Uses decimal units (1 KB = 1,000 bytes), as commonly used for storage devices.</p>`;
}
function updateStorageResult() {
  const output = document.querySelector('#storage-result'); if (!output) return;
  const field = document.querySelector('#storage-value'); const value = Number(field.value);
  if (!field.value || !Number.isFinite(value) || value < 0) { output.textContent = 'Enter a valid non-negative value.'; return; }
  const from = document.querySelector('#storage-from').value; const to = document.querySelector('#storage-to').value;
  output.textContent = `${value} ${from} = ${(value * storageFactors[from] / storageFactors[to]).toPrecision(8)} ${to}`;
}
const cookingFactors = { tsp: 4.92892, tbsp: 14.7868, cup: 236.588, ml: 1, l: 1000, floz: 29.5735 };
function renderCookingConverter() {
  const choices = '<option value="tsp">Teaspoons (US)</option><option value="tbsp">Tablespoons (US)</option><option value="cup">Cups (US)</option><option value="ml">Milliliters</option><option value="l">Liters</option><option value="floz">Fluid ounces (US)</option>';
  return `<div class="tool-form-grid"><label class="tool-field">Amount<input class="tool-input" id="cooking-value" type="number" min="0" step="any" value="1"></label><label class="tool-field">From<select class="tool-select" id="cooking-from">${choices}</select></label><label class="tool-field">To<select class="tool-select" id="cooking-to">${choices.replace('value="ml"', 'value="ml" selected')}</select></label></div><div class="tool-result" id="cooking-result" aria-live="polite"></div><p class="tool-message">Approximate US customary liquid-volume conversions; ingredient weights vary by density.</p>`;
}
function updateCookingResult() {
  const output = document.querySelector('#cooking-result'); if (!output) return;
  const field = document.querySelector('#cooking-value'); const value = Number(field.value);
  if (!field.value || !Number.isFinite(value) || value < 0) { output.textContent = 'Enter a valid non-negative amount.'; return; }
  const from = document.querySelector('#cooking-from').value; const to = document.querySelector('#cooking-to').value;
  output.textContent = `${value} ${from} = ${(value * cookingFactors[from] / cookingFactors[to]).toPrecision(7)} ${to}`;
}
function renderDecisionPicker() {
  return `<label class="tool-field">Options (one per line or separated by commas)<textarea class="tool-textarea" id="decision-options" placeholder="Option 1\nOption 2\nOption 3"></textarea></label><div class="tool-actions"><button class="tool-button primary" type="button" data-tool-action="pick-decision">Pick for me</button></div><div class="tool-result" id="decision-result" aria-live="polite">Add at least two options.</div>`;
}
function renderQuickNotes() {
  return `<label class="tool-field">Your notes<textarea class="tool-textarea" id="quick-notes-text" placeholder="Notes save automatically on this device..."></textarea></label><div class="tool-actions"><button class="tool-button" type="button" data-tool-action="download-notes">Download .txt</button><button class="tool-button danger" type="button" data-tool-action="clear-notes">Clear notes</button></div><p class="tool-message" id="quick-notes-status" role="status">Notes are stored locally in this browser.</p>`;
}
function loadQuickNotes() {
  const area = document.querySelector('#quick-notes-text'); if (!area) return;
  try { area.value = localStorage.getItem('everyday-tools-quick-notes') || ''; }
  catch { document.querySelector('#quick-notes-status').textContent = 'Browser storage is unavailable; notes will not persist.'; }
}
function saveQuickNotes(value) {
  const status = document.querySelector('#quick-notes-status');
  try { localStorage.setItem('everyday-tools-quick-notes', value); status.textContent = 'Saved on this device.'; }
  catch { status.textContent = 'Could not save notes in browser storage.'; }
}
function renderPdfStudio() {
  return `<label class="tool-field">PDF task<select class="tool-select" id="pdf-mode">
    <option value="merge">Merge PDFs</option><option value="split">Split by page ranges</option><option value="extract">Extract selected pages</option><option value="reorder">Reorder pages</option><option value="rotate">Rotate selected pages</option><option value="images">Convert JPG / PNG images to PDF</option><option value="render">Render PDF pages as images</option><option value="text">Extract selectable text</option>
  </select></label>
  <p class="tool-message">Files are processed locally in your browser. PDF tasks use pdf-lib and PDF.js loaded from public CDNs.</p>
  <div class="pdf-mode-panel" data-pdf-panel="merge"><label class="tool-field">PDF files (select two or more)<input class="tool-input" id="pdf-merge-files" type="file" accept="application/pdf,.pdf" multiple></label><div class="tool-actions"><button class="tool-button primary" type="button" data-tool-action="pdf-merge">Merge and download</button></div></div>
  <div class="pdf-mode-panel" data-pdf-panel="split" hidden><label class="tool-field">PDF file<input class="tool-input" id="pdf-split-file" type="file" accept="application/pdf,.pdf"></label><label class="tool-field" style="margin-top:14px">Page ranges (comma-separated, e.g. 1-3, 4-6)<input class="tool-input" id="pdf-split-ranges" inputmode="text" placeholder="1-3, 4-6"></label><div class="tool-actions"><button class="tool-button primary" type="button" data-tool-action="pdf-split">Create range PDFs</button></div></div>
  <div class="pdf-mode-panel" data-pdf-panel="extract" hidden><label class="tool-field">PDF file<input class="tool-input" id="pdf-extract-file" type="file" accept="application/pdf,.pdf"></label><label class="tool-field" style="margin-top:14px">Pages to extract (e.g. 1, 3-5)<input class="tool-input" id="pdf-extract-pages" placeholder="1, 3-5"></label><div class="tool-actions"><button class="tool-button primary" type="button" data-tool-action="pdf-extract">Extract and download</button></div></div>
  <div class="pdf-mode-panel" data-pdf-panel="reorder" hidden><label class="tool-field">PDF file<input class="tool-input" id="pdf-reorder-file" type="file" accept="application/pdf,.pdf"></label><label class="tool-field" style="margin-top:14px">New page order (include every page exactly once, e.g. 3, 1, 2)<input class="tool-input" id="pdf-reorder-pages" placeholder="3, 1, 2"></label><div class="tool-actions"><button class="tool-button primary" type="button" data-tool-action="pdf-reorder">Reorder and download</button></div></div>
  <div class="pdf-mode-panel" data-pdf-panel="rotate" hidden><label class="tool-field">PDF file<input class="tool-input" id="pdf-rotate-file" type="file" accept="application/pdf,.pdf"></label><div class="tool-form-grid" style="margin-top:14px"><label class="tool-field">Pages (e.g. 1, 3-5)<input class="tool-input" id="pdf-rotate-pages" placeholder="1, 3-5"></label><label class="tool-field">Rotation<select class="tool-select" id="pdf-rotate-degrees"><option value="90">90° clockwise</option><option value="180">180°</option><option value="270">270° clockwise</option></select></label></div><div class="tool-actions"><button class="tool-button primary" type="button" data-tool-action="pdf-rotate">Rotate and download</button></div></div>
  <div class="pdf-mode-panel" data-pdf-panel="images" hidden><label class="tool-field">JPG / PNG images (each image becomes one PDF page)<input class="tool-input" id="pdf-image-files" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" multiple></label><div class="tool-actions"><button class="tool-button primary" type="button" data-tool-action="pdf-images">Create PDF</button></div></div>
  <div class="pdf-mode-panel" data-pdf-panel="render" hidden><label class="tool-field">PDF file<input class="tool-input" id="pdf-render-file" type="file" accept="application/pdf,.pdf"></label><div class="tool-form-grid" style="margin-top:14px"><label class="tool-field">Pages (e.g. 1-3; blank for all)<input class="tool-input" id="pdf-render-pages" placeholder="All pages"></label><label class="tool-field">Image format<select class="tool-select" id="pdf-render-format"><option value="image/png">PNG</option><option value="image/jpeg">JPG</option></select></label></div><div class="tool-actions"><button class="tool-button primary" type="button" data-tool-action="pdf-render">Render pages</button></div></div>
  <div class="pdf-mode-panel" data-pdf-panel="text" hidden><label class="tool-field">PDF file<input class="tool-input" id="pdf-text-file" type="file" accept="application/pdf,.pdf"></label><label class="tool-field" style="margin-top:14px">Pages (e.g. 1-3; blank for all)<input class="tool-input" id="pdf-text-pages" placeholder="All pages"></label><div class="tool-actions"><button class="tool-button primary" type="button" data-tool-action="pdf-text">Extract text</button></div></div>
  <p class="tool-message" id="pdf-status" role="status"></p><div class="tool-actions" id="pdf-output-links"></div><pre id="pdf-text-output" class="pdf-text-output" hidden></pre>`;
}

function releasePdfDownloads() {
  pdfDownloadUrls.forEach((url) => URL.revokeObjectURL(url));
  pdfDownloadUrls = [];
}

function setPdfStatus(message, type = '') {
  const node = document.querySelector('#pdf-status');
  if (node) { node.textContent = message; node.className = `tool-message${type ? ` ${type}` : ''}`; }
}

function addPdfDownload(blob, filename, label = `Download ${filename}`) {
  const url = URL.createObjectURL(blob);
  pdfDownloadUrls.push(url);
  const link = document.createElement('a');
  link.className = 'tool-button'; link.href = url; link.download = filename; link.textContent = label;
  document.querySelector('#pdf-output-links').append(link);
}

function requirePdfLibraries(rendering = false) {
  if (!window.PDFLib || (rendering && !window.pdfjsLib)) {
    throw new Error('PDF libraries could not load. Check your internet connection or CDN access, then reload this page.');
  }
  if (rendering) window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

async function loadPdfDocument(file) {
  if (!file) throw new Error('Choose a PDF file first.');
  if (file.type && file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) throw new Error('Choose a PDF file.');
  const { PDFDocument } = window.PDFLib;
  return PDFDocument.load(await file.arrayBuffer());
}

function parsePdfPageRanges(value, pageCount) {
  const source = value.trim();
  if (!source) throw new Error('Enter the page number(s) to process.');
  const ranges = source.split(',').map((part) => {
    const match = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(part);
    if (!match) throw new Error('Use page numbers or ranges such as 1, 3-5.');
    const first = Number(match[1]); const last = Number(match[2] || match[1]);
    if (first < 1 || last < first || last > pageCount) throw new Error(`Pages must be between 1 and ${pageCount}.`);
    return Array.from({ length: last - first + 1 }, (_, index) => first + index);
  });
  const flattened = ranges.flat();
  if (new Set(flattened).size !== flattened.length) throw new Error('A page cannot be selected more than once.');
  return { ranges, pages: flattened };
}

async function runPdfAction(action) {
  const output = document.querySelector('#pdf-output-links');
  const textOutput = document.querySelector('#pdf-text-output');
  releasePdfDownloads(); output.replaceChildren(); textOutput.hidden = true; textOutput.textContent = '';
  setPdfStatus('Working…');
  try {
    requirePdfLibraries(action === 'pdf-render' || action === 'pdf-text');
    const { PDFDocument, degrees } = window.PDFLib;
    if (action === 'pdf-merge') {
      const files = Array.from(document.querySelector('#pdf-merge-files').files);
      if (files.length < 2) throw new Error('Select at least two PDF files to merge.');
      const merged = await PDFDocument.create();
      for (const file of files) {
        const source = await loadPdfDocument(file);
        const copied = await merged.copyPages(source, source.getPageIndices());
        copied.forEach((page) => merged.addPage(page));
      }
      addPdfDownload(new Blob([await merged.save()], { type: 'application/pdf' }), 'merged-document.pdf');
    } else if (action === 'pdf-split') {
      const file = document.querySelector('#pdf-split-file').files[0];
      const source = await loadPdfDocument(file);
      const { ranges } = parsePdfPageRanges(document.querySelector('#pdf-split-ranges').value, source.getPageCount());
      for (let index = 0; index < ranges.length; index += 1) {
        const documentPart = await PDFDocument.create();
        const pages = await documentPart.copyPages(source, ranges[index].map((page) => page - 1));
        pages.forEach((page) => documentPart.addPage(page));
        addPdfDownload(new Blob([await documentPart.save()], { type: 'application/pdf' }), `pages-${ranges[index][0]}-${ranges[index][ranges[index].length - 1]}.pdf`);
      }
    } else if (action === 'pdf-extract') {
      const source = await loadPdfDocument(document.querySelector('#pdf-extract-file').files[0]);
      const { pages } = parsePdfPageRanges(document.querySelector('#pdf-extract-pages').value, source.getPageCount());
      const result = await PDFDocument.create();
      (await result.copyPages(source, pages.map((page) => page - 1))).forEach((page) => result.addPage(page));
      addPdfDownload(new Blob([await result.save()], { type: 'application/pdf' }), 'extracted-pages.pdf');
    } else if (action === 'pdf-reorder') {
      const source = await loadPdfDocument(document.querySelector('#pdf-reorder-file').files[0]);
      const { pages } = parsePdfPageRanges(document.querySelector('#pdf-reorder-pages').value, source.getPageCount());
      if (pages.length !== source.getPageCount()) throw new Error(`Enter all ${source.getPageCount()} page numbers exactly once to reorder the full PDF.`);
      const result = await PDFDocument.create();
      (await result.copyPages(source, pages.map((page) => page - 1))).forEach((page) => result.addPage(page));
      addPdfDownload(new Blob([await result.save()], { type: 'application/pdf' }), 'reordered-document.pdf');
    } else if (action === 'pdf-rotate') {
      const source = await loadPdfDocument(document.querySelector('#pdf-rotate-file').files[0]);
      const { pages } = parsePdfPageRanges(document.querySelector('#pdf-rotate-pages').value, source.getPageCount());
      const rotation = Number(document.querySelector('#pdf-rotate-degrees').value);
      pages.forEach((number) => {
        const page = source.getPage(number - 1);
        page.setRotation(degrees((page.getRotation().angle + rotation) % 360));
      });
      addPdfDownload(new Blob([await source.save()], { type: 'application/pdf' }), 'rotated-document.pdf');
    } else if (action === 'pdf-images') {
      const files = Array.from(document.querySelector('#pdf-image-files').files);
      if (!files.length) throw new Error('Choose at least one JPG or PNG image.');
      const result = await PDFDocument.create();
      for (const file of files) {
        const isPng = file.type === 'image/png' || /\.png$/i.test(file.name);
        const isJpg = file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name);
        if (!isPng && !isJpg) throw new Error(`${file.name} is not a JPG or PNG image.`);
        const bytes = await file.arrayBuffer();
        const image = isPng ? await result.embedPng(bytes) : await result.embedJpg(bytes);
        if (image.width * image.height > 40000000) throw new Error(`${file.name} is too large to place in a PDF.`);
        const page = result.addPage([image.width * 0.75, image.height * 0.75]);
        page.drawImage(image, { x: 0, y: 0, width: image.width * 0.75, height: image.height * 0.75 });
      }
      addPdfDownload(new Blob([await result.save()], { type: 'application/pdf' }), 'images-document.pdf');
    } else if (action === 'pdf-render') {
      const file = document.querySelector('#pdf-render-file').files[0];
      if (!file) throw new Error('Choose a PDF file first.');
      const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const rangeInput = document.querySelector('#pdf-render-pages').value;
      const pages = rangeInput.trim() ? parsePdfPageRanges(rangeInput, pdf.numPages).pages : Array.from({ length: pdf.numPages }, (_, index) => index + 1);
      const mime = document.querySelector('#pdf-render-format').value;
      for (const number of pages) {
        const page = await pdf.getPage(number);
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(1.5, 3500 / Math.max(base.width, base.height), Math.sqrt(12000000 / (base.width * base.height)));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, 0.92));
        if (!blob) throw new Error(`Could not render page ${number} as an image.`);
        addPdfDownload(blob, `page-${number}.${mime === 'image/png' ? 'png' : 'jpg'}`);
        canvas.width = 0; canvas.height = 0;
      }
      await pdf.destroy();
    } else if (action === 'pdf-text') {
      const file = document.querySelector('#pdf-text-file').files[0];
      if (!file) throw new Error('Choose a PDF file first.');
      const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const rangeInput = document.querySelector('#pdf-text-pages').value;
      const pages = rangeInput.trim() ? parsePdfPageRanges(rangeInput, pdf.numPages).pages : Array.from({ length: pdf.numPages }, (_, index) => index + 1);
      const pageTexts = [];
      for (const number of pages) {
        const page = await pdf.getPage(number);
        const content = await page.getTextContent();
        pageTexts.push(`--- Page ${number} ---\n${content.items.map((item) => item.str).join(' ')}`);
      }
      await pdf.destroy();
      const text = pageTexts.join('\n\n');
      textOutput.textContent = text || 'No selectable text was found in the selected pages.';
      textOutput.hidden = false;
      if (text) addPdfDownload(new Blob([text], { type: 'text/plain;charset=utf-8' }), 'extracted-text.txt');
    }
    setPdfStatus(action === 'pdf-split' ? 'Created one downloadable PDF for each requested page range.' : action === 'pdf-render' ? 'Rendered the selected pages. Download each image below.' : action === 'pdf-text' ? 'Text extraction complete.' : 'Done. Your file is ready to download.', 'success');
  } catch (error) {
    setPdfStatus(error?.message || 'The PDF task failed. Check that the selected file is valid and not password protected.', 'error');
  }
}

let audioState = { context: null, buffer: null, sourceUrl: null, previewUrl: null, exports: [], files: [] };

function renderAudioStudio() {
  return `<label class="tool-field">Audio task<select class="tool-select" id="audio-task"><option value="trim">Cutter and trimmer</option><option value="split">Splitter</option><option value="merge">Merger</option><option value="effects">Volume and fades</option><option value="speed">Playback speed</option></select></label>
    <p class="tool-message">Audio is decoded and processed locally when your browser supports its codec. Exports are genuine PCM WAV files; no filename-only format conversion is used.</p>
    <div id="audio-single-panel"><label class="tool-field">Choose an audio file<input class="tool-input" id="audio-file" type="file" accept="audio/*"></label>
      <audio id="audio-player" controls preload="metadata" style="display:block;width:100%;margin-top:14px"></audio>
      <div class="audio-info" id="audio-info" aria-live="polite">Choose a browser-decodable audio file to see its waveform and details.</div><canvas id="audio-waveform" width="900" height="130" aria-label="Audio waveform preview"></canvas>
      <div class="tool-form-grid audio-range-fields"><label class="tool-field">Start (seconds)<input class="tool-input" id="audio-start" type="number" min="0" step="0.01" value="0"></label><label class="tool-field">End (seconds)<input class="tool-input" id="audio-end" type="number" min="0" step="0.01" placeholder="Audio duration"></label></div>
      <label class="tool-field audio-split-field" id="audio-split-field" hidden>Split points in seconds (comma-separated)<input class="tool-input" id="audio-split-points" inputmode="decimal" placeholder="e.g. 12.5, 30"></label>
      <div class="tool-form-grid audio-effect-fields"><label class="tool-field">Volume <span><input id="audio-volume" type="range" min="0" max="200" value="100"> <span id="audio-volume-label">100%</span></span></label><label class="tool-field">Playback speed<select class="tool-select" id="audio-speed"><option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label><label class="tool-field">Fade in (seconds)<input class="tool-input" id="audio-fade-in" type="number" min="0" step="0.1" value="0"></label><label class="tool-field">Fade out (seconds)<input class="tool-input" id="audio-fade-out" type="number" min="0" step="0.1" value="0"></label></div>
      <p class="tool-message">Playback volume is capped by the browser at 100%; exported WAV gain supports up to 200%. Playback speed changes preview only.</p>
      <div class="tool-actions"><button class="tool-button" type="button" data-tool-action="audio-preview" disabled>Preview processing</button><button class="tool-button primary" type="button" data-tool-action="audio-export" disabled>Export trimmed WAV</button></div>
    </div>
    <div id="audio-merge-panel" hidden><label class="tool-field">Choose compatible audio files (two or more)<input class="tool-input" id="audio-merge-files" type="file" accept="audio/*" multiple></label><p class="tool-message">Files are concatenated in the order shown. All must be decodable by this browser.</p><ol id="audio-merge-order" class="audio-merge-order"></ol><div class="tool-actions"><button class="tool-button primary" type="button" data-tool-action="audio-merge" disabled>Merge and export WAV</button></div></div>
    <p class="tool-message" id="audio-status" role="status"></p><div class="tool-actions" id="audio-exports"></div>`;
}

function audioStatus(message, type = '') {
  const output = document.querySelector('#audio-status');
  if (output) { output.textContent = message; output.className = `tool-message${type ? ` ${type}` : ''}`; }
}

function clearAudioExports() {
  audioState.exports.forEach((url) => URL.revokeObjectURL(url));
  audioState.exports = [];
  document.querySelector('#audio-exports')?.replaceChildren();
}

function cleanupAudio() {
  const player = document.querySelector('#audio-player');
  if (player) { player.pause(); player.removeAttribute('src'); player.load(); }
  if (audioState.sourceUrl) URL.revokeObjectURL(audioState.sourceUrl);
  if (audioState.previewUrl) URL.revokeObjectURL(audioState.previewUrl);
  audioState.sourceUrl = null; audioState.previewUrl = null; audioState.buffer = null; audioState.files = [];
  clearAudioExports();
  if (audioState.context && audioState.context.state !== 'closed') audioState.context.close().catch(() => {});
  audioState.context = null;
}

async function decodeAudioFile(file) {
  if (!file) throw new Error('Choose an audio file first.');
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error('Web Audio is not available in this browser.');
  if (!audioState.context || audioState.context.state === 'closed') audioState.context = new AudioContextClass();
  try { return await audioState.context.decodeAudioData(await file.arrayBuffer()); }
  catch { throw new Error(`This browser cannot decode “${file.name}”. Try an audio file encoded with a browser-supported codec (such as WAV, MP3, or AAC).`); }
}

function drawAudioWaveform(buffer) {
  const canvas = document.querySelector('#audio-waveform');
  if (!canvas) return;
  const context = canvas.getContext('2d'); const width = canvas.width; const height = canvas.height;
  context.clearRect(0, 0, width, height); context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-soft'); context.fillRect(0, 0, width, height);
  if (!buffer) return;
  const samples = buffer.getChannelData(0); const step = Math.max(1, Math.floor(samples.length / width));
  context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(); context.lineWidth = 1;
  context.beginPath();
  for (let x = 0; x < width; x += 1) {
    const start = x * step; let low = 1; let high = -1;
    for (let i = start; i < Math.min(start + step, samples.length); i += 1) { low = Math.min(low, samples[i]); high = Math.max(high, samples[i]); }
    context.moveTo(x + .5, (1 + low) * height / 2); context.lineTo(x + .5, (1 + high) * height / 2);
  }
  context.stroke();
}

async function loadAudioFile(file) {
  cleanupAudio();
  if (!file) return;
  audioStatus('Loading and decoding audio locally…');
  try {
    const buffer = await decodeAudioFile(file);
    if (buffer.numberOfChannels > 2) throw new Error('Multichannel surround files are not supported for export; choose mono or stereo audio.');
    audioState.buffer = buffer;
    audioState.sourceUrl = URL.createObjectURL(file);
    const player = document.querySelector('#audio-player'); player.src = audioState.sourceUrl;
    document.querySelector('#audio-start').value = 0;
    document.querySelector('#audio-end').value = buffer.duration.toFixed(2);
    document.querySelector('#audio-start').max = buffer.duration;
    document.querySelector('#audio-end').max = buffer.duration;
    document.querySelector('[data-tool-action="audio-export"]').disabled = false;
    document.querySelector('[data-tool-action="audio-preview"]').disabled = false;
    const size = (file.size / 1024 / 1024).toFixed(2);
    document.querySelector('#audio-info').textContent = `${file.name} · ${buffer.duration.toFixed(2)} seconds · ${buffer.sampleRate.toLocaleString()} Hz · ${buffer.numberOfChannels} channel${buffer.numberOfChannels === 1 ? '' : 's'} · ${size} MB`;
    drawAudioWaveform(buffer);
    audioStatus('Ready. Select a task, preview with the player, then export the processed WAV.','success');
  } catch (error) {
    document.querySelector('[data-tool-action="audio-export"]').disabled = true;
    document.querySelector('[data-tool-action="audio-preview"]').disabled = true;
    audioStatus(error.message, 'error');
  }
}

function encodeAudioWav(buffer, startSeconds = 0, endSeconds = buffer.duration, volume = 1, fadeIn = 0, fadeOut = 0) {
  const start = Math.floor(startSeconds * buffer.sampleRate); const end = Math.floor(endSeconds * buffer.sampleRate);
  const frames = end - start; const channels = Math.min(buffer.numberOfChannels, 2);
  if (frames < 1) throw new Error('The selected audio range is empty.');
  const bytesPerSample = 2;   const dataSize = frames * channels * bytesPerSample;
  if (buffer.numberOfChannels > 2) throw new Error('Only mono and stereo audio can be exported.');
  if (dataSize > 256 * 1024 * 1024) throw new Error('This WAV export would be too large to process safely in the browser. Choose a shorter clip.');
  const output = new ArrayBuffer(44 + dataSize); const view = new DataView(output);
  const write = (offset, text) => Array.from(text, (character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  write(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); write(8, 'WAVE'); write(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true); view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, dataSize, true);
  const data = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
  let offset = 44;
  for (let frame = 0; frame < frames; frame += 1) {
    const time = frame / buffer.sampleRate;
    let envelope = volume;
    if (fadeIn > 0) envelope *= Math.min(1, time / fadeIn);
    if (fadeOut > 0) envelope *= Math.min(1, (frames / buffer.sampleRate - time) / fadeOut);
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, data[channel][start + frame] * envelope));
      view.setInt16(offset, sample < 0 ? sample * 32768 : sample * 32767, true); offset += bytesPerSample;
    }
  }
  return new Blob([output], { type: 'audio/wav' });
}

function addAudioDownload(blob, filename) {
  const url = URL.createObjectURL(blob); audioState.exports.push(url);
  const link = document.createElement('a'); link.className = 'tool-button'; link.href = url; link.download = filename; link.textContent = `Download ${filename}`;
  document.querySelector('#audio-exports').append(link);
}

function audioEffects(duration) {
  const volume = Number(document.querySelector('#audio-volume').value) / 100;
  const fadeIn = Number(document.querySelector('#audio-fade-in').value);
  const fadeOut = Number(document.querySelector('#audio-fade-out').value);
  if (![volume, fadeIn, fadeOut].every(Number.isFinite) || fadeIn < 0 || fadeOut < 0 || fadeIn > duration || fadeOut > duration) throw new Error('Volume and fade durations must be valid; fades cannot exceed the exported clip duration.');
  return { volume, fadeIn, fadeOut };
}

async function exportAudio() {
  const buffer = audioState.buffer;
  if (!buffer) throw new Error('Choose a supported audio file first.');
  clearAudioExports();
  const task = document.querySelector('#audio-task').value;
  const duration = buffer.duration;
  if (task === 'split') {
    const points = document.querySelector('#audio-split-points').value.split(',').map((part) => Number(part.trim()));
    if (!document.querySelector('#audio-split-points').value.trim() || points.some((point) => !Number.isFinite(point) || point <= 0 || point >= duration)) throw new Error(`Enter split points greater than 0 and less than ${duration.toFixed(2)} seconds.`);
    const cuts = [0, ...new Set(points.sort((a, b) => a - b)), duration];
    for (let index = 0; index < cuts.length - 1; index += 1) {
      const effects = audioEffects(cuts[index + 1] - cuts[index]);
      const wav = encodeAudioWav(buffer, cuts[index], cuts[index + 1], effects.volume, effects.fadeIn, effects.fadeOut);
      addAudioDownload(wav, `audio-part-${index + 1}.wav`);
    }
    audioStatus(`Created ${cuts.length - 1} WAV clips from the selected split points.`, 'success');
    return;
  }
  let start = 0; let end = duration;
  if (task === 'trim') {
    start = Number(document.querySelector('#audio-start').value); end = Number(document.querySelector('#audio-end').value);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > duration || end <= start) throw new Error(`Choose a valid range from 0 to ${duration.toFixed(2)} seconds; end must be after start.`);
  }
  const effects = audioEffects(end - start);
  addAudioDownload(encodeAudioWav(buffer, start, end, effects.volume, effects.fadeIn, effects.fadeOut), task === 'trim' ? 'trimmed-audio.wav' : 'processed-audio.wav');
  audioStatus(task === 'speed' ? 'Exported original-speed audio. Playback speed affects preview only.' : 'Audio processing complete. The download is an actual WAV export.', 'success');
}

function previewAudioProcessing() {
  const buffer = audioState.buffer;
  if (!buffer) throw new Error('Choose a supported audio file first.');
  const task = document.querySelector('#audio-task').value;
  let start = 0; let end = buffer.duration;
  if (task === 'trim') {
    start = Number(document.querySelector('#audio-start').value); end = Number(document.querySelector('#audio-end').value);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > buffer.duration || end <= start) throw new Error(`Choose a valid range from 0 to ${buffer.duration.toFixed(2)} seconds.`);
  } else if (task === 'split') {
    const firstPoint = Number(document.querySelector('#audio-split-points').value.split(',')[0]?.trim());
    if (document.querySelector('#audio-split-points').value.trim() && (!Number.isFinite(firstPoint) || firstPoint <= 0 || firstPoint >= buffer.duration)) throw new Error('The first split point must fall inside the audio duration.');
    if (document.querySelector('#audio-split-points').value.trim()) end = firstPoint;
  }
  const effect = audioEffects(end - start);
  const preview = encodeAudioWav(buffer, start, end, effect.volume, effect.fadeIn, effect.fadeOut);
  if (audioState.previewUrl) URL.revokeObjectURL(audioState.previewUrl);
  audioState.previewUrl = URL.createObjectURL(preview);
  const player = document.querySelector('#audio-player'); player.src = audioState.previewUrl; player.playbackRate = Number(document.querySelector('#audio-speed').value); player.currentTime = 0;
  player.play().then(() => audioStatus('Playing a processed preview. The speed control changes preview playback only.', 'success')).catch(() => audioStatus('Processed preview is ready in the player. Press Play to listen.', 'success'));
}

function renderAudioMergeOrder() {
  const list = document.querySelector('#audio-merge-order');
  if (!list) return;
  list.replaceChildren();
  audioState.files.forEach((file, index) => {
    const row = document.createElement('li'); row.className = 'audio-merge-row';
    const name = document.createElement('span'); name.textContent = `${index + 1}. ${file.name}`; row.append(name);
    ['↑', '↓'].forEach((label, direction) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'tool-button'; button.textContent = label;
      button.setAttribute('aria-label', `${direction === 0 ? 'Move up' : 'Move down'} ${file.name}`);
      button.disabled = direction === 0 ? index === 0 : index === audioState.files.length - 1;
      button.addEventListener('click', () => { const next = index + (direction === 0 ? -1 : 1); [audioState.files[index], audioState.files[next]] = [audioState.files[next], audioState.files[index]]; renderAudioMergeOrder(); });
      row.append(button);
    });
    list.append(row);
  });
  const button = document.querySelector('[data-tool-action="audio-merge"]');
  if (button) button.disabled = audioState.files.length < 2;
}

async function mergeAudioFiles() {
  if (audioState.files.length < 2) throw new Error('Choose at least two audio files to merge.');
  audioStatus('Decoding and merging files locally…'); clearAudioExports();
  const buffers = [];
  for (const file of audioState.files) {
    const decoded = await decodeAudioFile(file);
    if (decoded.numberOfChannels > 2) throw new Error(`“${file.name}” has more than two channels; only mono/stereo files can be merged.`);
    buffers.push(decoded);
  }
  const sampleRate = buffers[0].sampleRate;
  const channels = Math.min(2, Math.max(...buffers.map((buffer) => buffer.numberOfChannels)));
  const length = buffers.reduce((total, buffer) => total + Math.ceil(buffer.duration * sampleRate), 0);
  if (length * channels * 4 > 256 * 1024 * 1024) throw new Error('The merged audio would be too large to process safely in the browser; choose shorter files.');
  const merged = audioState.context.createBuffer(channels, length, sampleRate);
  let cursor = 0;
  buffers.forEach((buffer) => {
    const frames = Math.ceil(buffer.duration * sampleRate);
    for (let channel = 0; channel < channels; channel += 1) {
      const input = buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1)); const output = merged.getChannelData(channel);
      for (let frame = 0; frame < frames; frame += 1) {
        const position = frame * buffer.sampleRate / sampleRate; const lower = Math.floor(position); const fraction = position - lower;
        output[cursor + frame] = (input[lower] || 0) * (1 - fraction) + (input[Math.min(lower + 1, input.length - 1)] || 0) * fraction;
      }
    }
    cursor += frames;
  });
  addAudioDownload(encodeAudioWav(merged), 'merged-audio.wav');
  audioStatus(`Merged ${buffers.length} files (${merged.duration.toFixed(2)} seconds) in the displayed order.`, 'success');
}

function renderImageStudio() {
  return `<label class="tool-field">Choose an image<input class="tool-input" id="image-file" type="file" accept="image/*"></label>
    <div class="tool-form-grid" style="margin-top:15px"><label class="tool-field">Width (px)<input class="tool-input" id="image-width" type="number" min="1" max="8000" value="800"></label><label class="tool-field">Height (px)<input class="tool-input" id="image-height" type="number" min="1" max="8000" value="600"></label>
    <label class="tool-field">Output format<select class="tool-select" id="image-format"><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option><option value="image/svg+xml">SVG (embedded raster)</option></select></label><label class="tool-field">Quality (JPEG / WebP)<input class="tool-input" id="image-quality" type="range" min="10" max="100" value="85"></label></div>
    <label class="tool-field" style="display:flex;align-items:center;gap:8px;margin-top:12px"><span><input id="image-lock-ratio" type="checkbox" checked> Maintain aspect ratio</span></label>
    <p class="tool-message">Processing stays in your browser. JPEG does not support transparency; transparent areas become white. SVG output wraps the processed raster image in a valid SVG file; it is not vector tracing. SVG embedding preserves raster transparency.</p>
    <div class="tool-actions"><button class="tool-button primary" type="button" data-tool-action="process-image" disabled>Resize / convert</button><a class="tool-button" id="image-download" hidden download="everyday-tools-image">Download image</a></div>
    <p class="tool-message" id="image-status" role="status">Select an image to begin.</p><div id="image-preview" style="margin-top:14px;text-align:center"></div>`;
}
function cleanupImageUrls() {
  if (imageSourceUrl) URL.revokeObjectURL(imageSourceUrl);
  if (imageOutputUrl) URL.revokeObjectURL(imageOutputUrl);
  imageSourceUrl = null; imageOutputUrl = null; imageSource = null;
}
function loadImageFile(file) {
  const status = document.querySelector('#image-status'); const processButton = document.querySelector('[data-tool-action="process-image"]');
  cleanupImageUrls(); processButton.disabled = true; document.querySelector('#image-preview').replaceChildren();
  document.querySelector('#image-download').hidden = true;
  if (!file) { status.textContent = 'Select an image to begin.'; return; }
  if (!file.type.startsWith('image/')) { status.textContent = 'Choose a supported image file.'; return; }
  imageSourceUrl = URL.createObjectURL(file);
  const sourceUrl = imageSourceUrl;
  const image = new Image();
  image.onload = () => {
    if (imageSourceUrl !== sourceUrl) return;
    imageSource = image;
    document.querySelector('#image-width').value = image.naturalWidth;
    document.querySelector('#image-height').value = image.naturalHeight;
    const preview = document.createElement('img'); preview.src = imageSourceUrl; preview.alt = 'Original image preview'; preview.style.cssText = 'max-width:100%;max-height:260px;border-radius:10px';
    document.querySelector('#image-preview').replaceChildren(preview);
    processButton.disabled = false;
    status.textContent = `Original: ${image.naturalWidth} × ${image.naturalHeight} px · ${(file.size / 1024).toFixed(1)} KB`;
  };
  image.onerror = () => { status.textContent = 'This image could not be decoded by your browser.'; processButton.disabled = true; };
  image.src = imageSourceUrl;
}
async function processImage() {
  const status = document.querySelector('#image-status');
  if (!imageSource) { status.textContent = 'Select a valid image first.'; return; }
  let width = Number(document.querySelector('#image-width').value); let height = Number(document.querySelector('#image-height').value);
  if (document.querySelector('#image-lock-ratio').checked) height = Math.round(width * imageSource.naturalHeight / imageSource.naturalWidth);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 8000 || height > 8000 || width * height > 40000000) {
    status.textContent = 'Choose dimensions from 1 to 8,000 px and keep the image below 40 megapixels.'; return;
  }
  const format = document.querySelector('#image-format').value;
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d');
  if (format === 'image/jpeg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height); }
  context.drawImage(imageSource, 0, 0, width, height);
  const quality = Number(document.querySelector('#image-quality').value) / 100;
  let blob;
  if (format === 'image/svg+xml') {
    const raster = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!raster || raster.type !== 'image/png') { status.textContent = 'Could not encode the embedded PNG image for SVG.'; return; }
    const pngData = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(raster); });
    const svgText = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image href="${pngData}" width="${width}" height="${height}" preserveAspectRatio="none"/></svg>`;
    const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    if (parsed.querySelector('parsererror') || parsed.documentElement.localName !== 'svg') { status.textContent = 'The SVG document did not validate.'; return; }
    blob = new Blob([svgText], { type: 'image/svg+xml' });
  } else {
    blob = await new Promise((resolve) => canvas.toBlob(resolve, format, quality));
    if (!blob || blob.type !== format) { status.textContent = `Your browser could not encode ${format.split('/')[1].toUpperCase()} images.`; return; }
  }
  if (imageOutputUrl) URL.revokeObjectURL(imageOutputUrl);
  imageOutputUrl = URL.createObjectURL(blob);
  const preview = document.createElement('img'); preview.src = imageOutputUrl; preview.alt = format === 'image/svg+xml' ? 'SVG containing embedded raster image preview' : 'Processed image preview'; preview.style.cssText = 'max-width:100%;max-height:260px;border-radius:10px';
  document.querySelector('#image-preview').append(preview);
  const link = document.querySelector('#image-download'); link.href = imageOutputUrl; link.download = `everyday-tools-image.${format === 'image/svg+xml' ? 'svg' : format.split('/')[1]}`; link.hidden = false;
  status.textContent = format === 'image/svg+xml' ? `Created a valid SVG wrapper with embedded PNG raster pixels (not vectorized) · ${(blob.size / 1024).toFixed(1)} KB. Transparency is preserved in the embedded PNG.` : `Processed ${width} × ${height} px · ${(blob.size / 1024).toFixed(1)} KB (original ${(document.querySelector('#image-file').files[0].size / 1024).toFixed(1)} KB).`;
}

function renderClocks() {
  return `<div class="tool-tabs" role="tablist" aria-label="Clock mode"><button class="tool-tab ${timerMode === 'timer' ? 'is-active' : ''}" type="button" data-tool-action="timer-mode" role="tab" aria-selected="${timerMode === 'timer'}">Timer</button><button class="tool-tab ${timerMode === 'stopwatch' ? 'is-active' : ''}" type="button" data-tool-action="stopwatch-mode" role="tab" aria-selected="${timerMode === 'stopwatch'}">Stopwatch</button></div>
  <div id="clock-panel">${timerMode === 'timer' ? `<p class="tool-message" id="tool-message" role="status">Set a countdown. Keep this page open for the timer to update.</p><div class="tool-form-grid"><label class="tool-field">Hours<input class="tool-input timer-part" id="timer-hours" type="number" min="0" max="999" value="0"></label><label class="tool-field">Minutes<input class="tool-input timer-part" id="timer-minutes" type="number" min="0" max="59" value="1"></label><label class="tool-field">Seconds<input class="tool-input timer-part" id="timer-seconds" type="number" min="0" max="59" value="0"></label></div><div class="tool-clock" id="clock-display">00:01:00</div><div class="tool-actions" style="justify-content:center"><button class="tool-button primary" type="button" data-tool-action="clock-start">Start</button><button class="tool-button" type="button" data-tool-action="clock-pause">Pause</button><button class="tool-button" type="button" data-tool-action="clock-reset">Reset</button></div>` : `<p class="tool-message">The stopwatch uses elapsed time, so it stays accurate if the page is briefly delayed.</p><div class="tool-clock" id="clock-display">00:00:00.0</div><div class="tool-actions" style="justify-content:center"><button class="tool-button primary" type="button" data-tool-action="watch-start">Start</button><button class="tool-button" type="button" data-tool-action="watch-pause">Pause</button><button class="tool-button" type="button" data-tool-action="watch-lap">Lap</button><button class="tool-button" type="button" data-tool-action="watch-reset">Reset</button></div><ol class="tool-laps" id="watch-laps"></ol>`}</div>`;
}

function formatClock(milliseconds, tenths = false) {
  const total = Math.max(0, milliseconds);
  const hours = Math.floor(total / 3600000);
  const minutes = Math.floor(total / 60000) % 60;
  const seconds = Math.floor(total / 1000) % 60;
  const base = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return tenths ? `${base}.${Math.floor(total % 1000 / 100)}` : base;
}

function currentStopwatchTime() { return stopwatchElapsed + (stopwatchRunning ? Date.now() - stopwatchStartedAt : 0); }
function updateClockDisplay() {
  const display = document.querySelector('#clock-display');
  if (!display) return;
  if (timerMode === 'timer') {
    let remaining = countdownRunning ? Math.max(0, countdownRemaining - (Date.now() - countdownStartedAt)) : countdownRemaining;
    if (!countdownRunning && remaining === 0) {
      const hours = Number(document.querySelector('#timer-hours')?.value || 0);
      const minutes = Number(document.querySelector('#timer-minutes')?.value || 0);
      const seconds = Number(document.querySelector('#timer-seconds')?.value || 0);
      remaining = ((hours * 60 + minutes) * 60 + seconds) * 1000;
    }
    display.textContent = formatClock(remaining);
  } else display.textContent = formatClock(currentStopwatchTime(), true);
}
function startClockUpdates() {
  if (clockInterval) clearInterval(clockInterval);
  clockInterval = setInterval(() => {
    if (timerMode === 'timer' && countdownRunning) {
      countdownRemaining = Math.max(0, countdownRemaining - (Date.now() - countdownStartedAt));
      countdownStartedAt = Date.now();
      if (countdownRemaining === 0) {
        countdownRunning = false; clearInterval(clockInterval); clockInterval = null;
        ['hours', 'minutes', 'seconds'].forEach((name) => { const input = document.querySelector(`#timer-${name}`); if (input) input.value = 0; });
        setToolMessage('Time is up.');
      }
    }
    updateClockDisplay();
  }, 100);
}

function renderTaskList() {
  const list = document.querySelector('#task-list');
  if (!list) return;
  const shown = tasks.filter((task) => taskFilter === 'all' || (taskFilter === 'active' ? !task.done : task.done));
  const remaining = tasks.filter((task) => !task.done).length;
  document.querySelector('#task-count').textContent = `${remaining} ${remaining === 1 ? 'task' : 'tasks'} remaining`;
  list.innerHTML = shown.length ? shown.map((task) => `<li class="tool-task ${task.done ? 'done' : ''}" data-task-id="${escapeToolText(task.id)}">${editingTaskId === task.id ? `<form class="edit-task-form"><input class="tool-input" name="taskText" value="${escapeToolText(task.text)}" aria-label="Edit task"><button class="tool-button" type="submit">Save</button><button class="tool-button" type="button" data-tool-action="cancel-edit">Cancel</button></form>` : `<input type="checkbox" data-tool-action="toggle-task" ${task.done ? 'checked' : ''} aria-label="Mark ${escapeToolText(task.text)} ${task.done ? 'active' : 'completed'}"><span class="tool-task-text">${escapeToolText(task.text)}</span><button type="button" data-tool-action="edit-task">Edit</button><button type="button" data-tool-action="delete-task">Delete</button>`}</li>`).join('') : `<li class="tool-message">${tasks.length ? 'No tasks in this view.' : 'Nothing on your list yet — add a task to get started.'}</li>`;
  toolContent.querySelectorAll('.tool-tab').forEach((button) => {
    const isActive = button.dataset.filter === taskFilter;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function renderTodo() {
  return `<form id="add-task-form" class="tool-row"><label class="tool-field" style="flex:1">New task<input class="tool-input" name="taskText" maxlength="240" placeholder="What needs doing?" required></label><button class="tool-button primary" type="submit">Add task</button></form><div class="tool-row" style="justify-content:space-between;margin-top:17px"><div class="tool-tabs" role="group" aria-label="Filter tasks"><button class="tool-tab" type="button" data-filter="all">All</button><button class="tool-tab" type="button" data-filter="active">Active</button><button class="tool-tab" type="button" data-filter="completed">Completed</button></div><button class="tool-button" type="button" data-tool-action="clear-completed">Clear completed</button></div><p class="tool-message" id="task-count"></p><ul class="tool-task-list" id="task-list"></ul><p class="tool-message" id="tool-message" role="status"></p>`;
}

function renderFormatter() {
  return `<label class="tool-field">Text<textarea class="tool-textarea" id="formatter-text" placeholder="Type or paste text to format..."></textarea></label><div class="tool-actions"><button class="tool-button" type="button" data-tool-action="uppercase">UPPERCASE</button><button class="tool-button" type="button" data-tool-action="lowercase">lowercase</button><button class="tool-button" type="button" data-tool-action="titlecase">Title Case</button><button class="tool-button" type="button" data-tool-action="spaces">Remove extra spaces</button><button class="tool-button" type="button" data-tool-action="trim">Trim edges</button><button class="tool-button primary" type="button" data-tool-action="copy-formatted">Copy result</button><button class="tool-button danger" type="button" data-tool-action="clear-formatter">Clear</button></div><p class="tool-message" id="tool-message" role="status"></p>`;
}

function validHttpUrl(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url : null; }
  catch { return null; }
}

let scannerStream = null;
let scannerTimer = 0;
let scannerKind = '';
let scannerBusy = false;
let fallbackQrScanner = null;
let fallbackBarcodeReader = null;
let fallbackBarcodeControls = null;
let fallbackQrCleanup = Promise.resolve();
let scannerResultFound = false;

function renderScanner(kind) {
  const qr = kind === 'qr';
  return `<p class="tool-message">${qr ? 'Scans QR codes using native browser support when available, with a compatible fallback. If camera access is blocked, use image upload.' : 'Uses the browser’s native Barcode Detection API; available formats vary by browser and device.'} Camera permission is requested only when you press Start scanner. Camera scanning requires HTTPS (or localhost). Scanned content is not opened automatically.</p><div class="tool-form-grid"><label class="tool-field">Camera<select class="tool-select" id="scanner-camera"><option value="">Default camera</option></select></label><label class="tool-field">${qr ? 'Image with QR code' : 'Image with barcode'}<input class="tool-input" id="scanner-image" type="file" accept="image/*"></label></div><div class="tool-actions"><button class="tool-button primary" type="button" data-tool-action="start-scanner">Start scanner</button><button class="tool-button" type="button" data-tool-action="stop-scanner" disabled>Stop scanner</button></div><video id="scanner-video" playsinline muted style="display:block;width:100%;max-height:300px;margin-top:14px;border-radius:12px;background:#111" hidden></video><div id="scanner-fallback-reader" style="width:100%;max-width:520px;margin:14px auto" hidden></div><p class="tool-message" id="scanner-status" role="status">Choose Start scanner or upload an image.</p><div class="tool-result" id="scanner-result" hidden></div><p class="tool-message" id="scanner-format"></p><div class="tool-actions"><button class="tool-button" id="scanner-copy" data-tool-action="scanner-copy" type="button" disabled>Copy result</button><a class="tool-button" id="scanner-open" target="_blank" rel="noopener noreferrer" hidden>Open link</a><button class="tool-button" id="scanner-clear" data-tool-action="scanner-clear" type="button">Clear result</button></div>`;
}

function scannerStatus(message, error = false) {
  const node = document.querySelector('#scanner-status');
  if (node) { node.textContent = message; node.className = `tool-message${error ? ' error' : ''}`; }
}

async function scannerDetector() {
  const Detector = window.BarcodeDetector;
  if (!Detector || typeof Detector.getSupportedFormats !== 'function') return null;
  let formats;
  try { formats = await Detector.getSupportedFormats(); }
  catch (error) {
    if (scannerKind === 'barcode') return null;
    throw error;
  }
  if (scannerKind === 'qr') {
    if (!formats.includes('qr_code')) return null;
    const supported = document.querySelector('#scanner-format'); if (supported) supported.textContent = 'Browser-reported format: QR code';
    return new Detector({ formats: ['qr_code'] });
  }
  const barcodeFormats = formats.filter((format) => format !== 'qr_code');
  if (!barcodeFormats.length) return null;
  const supported = document.querySelector('#scanner-format');
  if (supported) supported.textContent = `Formats supported by this browser: ${barcodeFormats.join(', ')}`;
  return new Detector({ formats: barcodeFormats });
}

function showScanResult(result) {
  const output = document.querySelector('#scanner-result');
  const copy = document.querySelector('#scanner-copy'); const open = document.querySelector('#scanner-open');
  if (!output || !result || scannerResultFound) return;
  scannerResultFound = true;
  const rawValue = result.rawValue || '';
  if (!rawValue) return;
  output.textContent = rawValue;
  output.hidden = false;
  copy.disabled = false; copy.dataset.scanValue = rawValue;
  const valueUrl = validHttpUrl(rawValue);
  open.hidden = !valueUrl;
  if (valueUrl) open.href = valueUrl.href;
  const format = document.querySelector('#scanner-format');
  const type = /^(BEGIN:VCARD|MECARD:)/i.test(rawValue) ? 'Contact information' : /^mailto:/i.test(rawValue) ? 'Email address' : /^tel:/i.test(rawValue) ? 'Telephone number' : valueUrl ? 'URL' : 'Text or other encoded data';
  if (format) format.textContent = `${type}${result.format ? ` · ${result.format}` : ''}`;
  scannerStatus('Code detected. Review the content before copying or opening it.');
}

function stopScanner(message = 'Scanner stopped.') {
  if (scannerTimer) cancelAnimationFrame(scannerTimer);
  scannerTimer = 0; scannerBusy = false;
  if (scannerStream) scannerStream.getTracks().forEach((track) => track.stop());
  scannerStream = null;
  if (fallbackBarcodeControls) {
    try { fallbackBarcodeControls.stop(); } catch { /* Continue releasing remaining scanner resources. */ }
    fallbackBarcodeControls = null;
  }
  if (fallbackBarcodeReader) {
    try { fallbackBarcodeReader.reset(); } catch { /* The reader may already be stopped. */ }
    fallbackBarcodeReader = null;
  }
  const video = document.querySelector('#scanner-video');
  if (video) { video.pause(); video.srcObject = null; video.hidden = true; }
  const reader = document.querySelector('#scanner-fallback-reader');
  if (fallbackQrScanner) {
    const instance = fallbackQrScanner;
    fallbackQrScanner = null;
    fallbackQrCleanup = fallbackQrCleanup.then(async () => {
      if (instance.isScanning) await instance.stop();
      instance.clear();
    }).catch(() => {});
  }
  if (reader) reader.hidden = true;
  const start = document.querySelector('[data-tool-action="start-scanner"]');
  const stop = document.querySelector('[data-tool-action="stop-scanner"]');
  if (start) start.disabled = false;
  if (stop) stop.disabled = true;
  if (document.querySelector('#scanner-status')) scannerStatus(message);
}

function scannerCameraError(error) {
  if (error?.name === 'NotAllowedError' || /permission|denied/i.test(error?.message || '')) return 'Camera permission was denied. Allow camera access for this site in browser settings, then try again.';
  if (error?.name === 'NotFoundError' || /no camera|camera.*not found/i.test(error?.message || '')) return 'No camera was found. Connect or enable a camera, or scan an image instead.';
  if (!window.isSecureContext) return 'Camera access requires HTTPS (or localhost). Open this site securely, then try again.';
  return error?.message || 'Could not start the camera. Check browser permissions and device availability, or scan an image instead.';
}

async function startBarcodeFallback(cameraId) {
  const ZXing = window.ZXing;
  if (!ZXing?.BrowserMultiFormatReader || !ZXing?.BarcodeFormat || !ZXing?.DecodeHintType) {
    throw new Error('Barcode fallback could not load. Check your internet connection and reload the page.');
  }
  const formats = ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'CODE_128', 'CODE_39', 'ITF']
    .map((name) => ZXing.BarcodeFormat[name])
    .filter((format) => format !== undefined);
  const hints = new Map();
  hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
  hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
  fallbackBarcodeReader = new ZXing.BrowserMultiFormatReader(hints);
  const video = document.querySelector('#scanner-video');
  video.hidden = false;
  document.querySelector('#scanner-fallback-reader').hidden = true;
  scannerStatus('Camera permission will be requested. Allow access, then point the camera at a barcode.');
  try {
    fallbackBarcodeControls = await fallbackBarcodeReader.decodeFromVideoDevice(cameraId || undefined, video, (result, error) => {
      if (result) {
        showScanResult({ rawValue: result.getText(), format: result.getBarcodeFormat?.() });
        stopScanner('Code detected; camera stopped.');
      } else if (error && !['NotFoundException', 'ChecksumException', 'FormatException'].some((name) => error.name?.includes(name))) {
        scannerStatus(`Scanning error: ${error.message || 'Could not read camera frames.'}`, true);
      }
    });
  } catch (error) {
    try { fallbackBarcodeReader.reset(); } catch { /* The camera may not have initialized. */ }
    fallbackBarcodeReader = null;
    throw error;
  }
  document.querySelector('[data-tool-action="start-scanner"]').disabled = true;
  document.querySelector('[data-tool-action="stop-scanner"]').disabled = false;
  const supported = document.querySelector('#scanner-format');
  if (supported) supported.textContent = 'Barcode formats: EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, ITF';
  scannerStatus('Camera active. Point it at a supported product barcode.');
}

async function startScanner() {
  try {
    scannerKind = activeTool === 'QR Code Scanner' ? 'qr' : 'barcode';
    scannerResultFound = false;
    if (!window.isSecureContext) throw new Error('Camera access requires HTTPS (or localhost). Open this site securely, then try again.');
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is unavailable in this browser or page context.');
    const detector = await scannerDetector();
    const cameraId = document.querySelector('#scanner-camera').value;
    if (!detector && scannerKind === 'barcode') {
      await startBarcodeFallback(cameraId);
      return;
    }
    if (!detector && scannerKind === 'qr') {
      if (!window.Html5Qrcode) throw new Error('The QR fallback scanner could not load. Check network access to the scanner library, or upload a QR image in a supported browser.');
      await fallbackQrCleanup;
      const cameras = await window.Html5Qrcode.getCameras();
      if (!cameras.length) throw new Error('No camera was found. Connect or enable a camera, or scan an image instead.');
      const camera = document.querySelector('#scanner-camera');
      camera.replaceChildren(new Option('Default camera', ''));
      cameras.forEach((device, index) => camera.add(new Option(device.label || `Camera ${index + 1}`, device.id)));
      const reader = document.querySelector('#scanner-fallback-reader');
      reader.hidden = false;
      document.querySelector('#scanner-video').hidden = true;
      const instance = new window.Html5Qrcode('scanner-fallback-reader', { verbose: false });
      fallbackQrScanner = instance;
      await instance.start(cameraId || { facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } }, (decodedText) => {
        if (scannerResultFound) return;
        showScanResult({ rawValue: decodedText, format: 'QR code' });
        stopScanner('Code detected; camera stopped.');
      }, () => {});
      document.querySelector('[data-tool-action="start-scanner"]').disabled = true;
      document.querySelector('[data-tool-action="stop-scanner"]').disabled = false;
      document.querySelector('#scanner-format').textContent = 'QR scanner: compatible fallback';
      scannerStatus('Camera active. Point it at a QR code.');
      return;
    }
    scannerStream = await navigator.mediaDevices.getUserMedia({ video: cameraId ? { deviceId: { exact: cameraId } } : { facingMode: { ideal: 'environment' } }, audio: false });
    const video = document.querySelector('#scanner-video'); video.srcObject = scannerStream; video.hidden = false;
    await video.play();
    const devices = await navigator.mediaDevices.enumerateDevices();
    const camera = document.querySelector('#scanner-camera');
    const selected = cameraId || scannerStream.getVideoTracks()[0]?.getSettings().deviceId || '';
    camera.replaceChildren(new Option('Default camera', ''));
    devices.filter((device) => device.kind === 'videoinput').forEach((device, index) => camera.add(new Option(device.label || `Camera ${index + 1}`, device.deviceId)));
    if (selected) camera.value = selected;
    document.querySelector('[data-tool-action="start-scanner"]').disabled = true;
    document.querySelector('[data-tool-action="stop-scanner"]').disabled = false;
    scannerStatus(scannerKind === 'qr' ? 'Camera active. Point it at a QR code.' : 'Camera active. Point it at a supported barcode.');
    const scan = async () => {
      if (!scannerStream || !video.isConnected || video.readyState < 2 || scannerBusy) { if (scannerStream) scannerTimer = requestAnimationFrame(scan); return; }
      scannerBusy = true;
      try {
        const found = await detector.detect(video);
        if (found.length) { showScanResult(found[0]); stopScanner('Code detected; camera stopped.'); return; }
      } catch (error) { scannerStatus(`Scanning error: ${error.message || 'Could not read camera frames.'}`, true); stopScanner('Scanner stopped after an error.'); return; }
      scannerBusy = false;
      if (scannerStream) scannerTimer = requestAnimationFrame(scan);
    };
    scannerTimer = requestAnimationFrame(scan);
  } catch (error) {
    stopScanner();
    scannerStatus(scannerCameraError(error), true);
  }
}

async function scanImageFile(file) {
  if (!file) return;
  scannerKind = activeTool === 'QR Code Scanner' ? 'qr' : 'barcode';
  scannerResultFound = false;
  if (!file.type.startsWith('image/')) { scannerStatus('Choose a valid image file.', true); return; }
  try {
    const detector = await scannerDetector();
    if (detector) {
      if (!('createImageBitmap' in window)) throw new Error('This browser cannot decode uploaded images for scanning.');
      const bitmap = await createImageBitmap(file);
      try {
        const results = await detector.detect(bitmap);
        if (!results.length) throw new Error(scannerKind === 'qr' ? 'No QR code was found in this image. Try a clearer image.' : 'No supported code was found in this image. Try a clearer image.');
        showScanResult(results[0]);
      } finally { bitmap.close?.(); }
      return;
    }
    if (scannerKind === 'barcode') {
      const ZXing = window.ZXing;
      if (!ZXing?.BrowserMultiFormatReader || !ZXing?.BarcodeFormat || !ZXing?.DecodeHintType) {
        throw new Error('Barcode fallback could not load. Check your internet connection and reload the page.');
      }
      const formats = ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'CODE_128', 'CODE_39', 'ITF']
        .map((name) => ZXing.BarcodeFormat[name])
        .filter((format) => format !== undefined);
      const hints = new Map();
      hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
      hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
      const reader = new ZXing.BrowserMultiFormatReader(hints);
      const imageUrl = URL.createObjectURL(file);
      try {
        const result = await reader.decodeFromImageUrl(imageUrl);
        showScanResult({ rawValue: result.getText(), format: result.getBarcodeFormat?.() });
      } catch (error) {
        throw new Error(/notfound|checksum|format/i.test(error?.name || '') ? 'No readable product barcode was found in this image. Try a sharper, well-lit image with the full barcode visible.' : (error?.message || 'The barcode image could not be decoded.'));
      } finally {
        reader.reset();
        URL.revokeObjectURL(imageUrl);
      }
      return;
    }
    if (scannerKind !== 'qr' || !window.Html5Qrcode) throw new Error('QR scanning support could not load. Check network access and try a recent browser, or choose another image format.');
    await fallbackQrCleanup;
    const reader = document.querySelector('#scanner-fallback-reader');
    reader.hidden = false;
    const instance = new window.Html5Qrcode('scanner-fallback-reader', { verbose: false });
    fallbackQrScanner = instance;
    const decodedText = await instance.scanFile(file, true);
    if (!decodedText) throw new Error('No QR code was found in this image. Try a clearer, well-lit image.');
    showScanResult({ rawValue: decodedText, format: 'QR code' });
  } catch (error) {
    const message = /notfound|no qr|decode|could not find/i.test(error?.message || '') ? 'No readable QR code was found in this image. Try a clearer, well-lit image.' : error.message || 'The image could not be scanned.';
    scannerStatus(message, true);
  } finally {
    if (fallbackQrScanner && !fallbackQrScanner.isScanning) {
      const instance = fallbackQrScanner;
      fallbackQrScanner = null;
      fallbackQrCleanup = fallbackQrCleanup.then(() => instance.clear()).catch(() => {});
      await fallbackQrCleanup;
      const reader = document.querySelector('#scanner-fallback-reader');
      if (reader) reader.hidden = true;
    }
  }
}

function renderBarcodeGenerator() {
  return `<form id="barcode-generator-form"><div class="tool-form-grid"><label class="tool-field">Barcode data<input class="tool-input" id="barcode-value" maxlength="120" placeholder="Enter text or product code" required></label><label class="tool-field">Format<select class="tool-select" id="barcode-format"><option value="CODE128">Code 128</option><option value="CODE39">Code 39</option><option value="EAN13">EAN-13</option><option value="EAN8">EAN-8</option><option value="UPC">UPC-A</option><option value="ITF">ITF</option><option value="ITF14">ITF-14</option><option value="codabar">Codabar</option></select></label></div><div class="tool-actions"><button class="tool-button primary" type="submit">Generate barcode</button><button class="tool-button" type="button" data-tool-action="copy-barcode" disabled>Copy data</button><button class="tool-button" type="button" data-tool-action="download-barcode-svg" disabled>Download SVG</button><button class="tool-button" type="button" data-tool-action="download-barcode-png" disabled>Download PNG</button></div></form><p class="tool-message" id="barcode-status" role="status">Barcode output requires the JsBarcode library (loaded from jsDelivr).</p><div id="barcode-preview" style="max-width:100%;overflow:auto;text-align:center"></div>`;
}

function generateBarcode() {
  const value = document.querySelector('#barcode-value').value.trim();
  const format = document.querySelector('#barcode-format').value;
  const preview = document.querySelector('#barcode-preview'); const status = document.querySelector('#barcode-status');
  const buttons = ['copy-barcode', 'download-barcode-svg', 'download-barcode-png'].map((action) => document.querySelector(`[data-tool-action="${action}"]`));
  preview.replaceChildren(); buttons.forEach((button) => { button.disabled = true; });
  if (!value) { status.textContent = 'Enter data to encode.'; status.className = 'tool-message error'; return; }
  if (!window.JsBarcode) { status.textContent = 'Barcode generator library did not load. Check CDN access and reload.'; status.className = 'tool-message error'; return; }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  try {
    window.JsBarcode(svg, value, { format, displayValue: true, margin: 12, lineColor: '#171717', background: '#ffffff' });
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.style.maxWidth = '100%'; svg.style.height = 'auto';
    preview.append(svg); buttons.forEach((button) => { button.disabled = false; });
    status.textContent = `Generated a ${format} barcode encoding the entered value.`; status.className = 'tool-message success';
  } catch (error) { status.textContent = `Invalid ${format} data: ${error.message || 'The selected format rejected this value.'}`; status.className = 'tool-message error'; }
}

function barcodeSvgString() {
  const svg = document.querySelector('#barcode-preview svg');
  if (!svg) throw new Error('Generate a valid barcode first.');
  return new XMLSerializer().serializeToString(svg);
}

async function downloadBarcodePng() {
  const svgBlob = new Blob([barcodeSvgString()], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth * 2; canvas.height = image.naturalHeight * 2;
    const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Could not create a PNG image.');
    const pngUrl = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = pngUrl; link.download = 'barcode.png'; link.click(); setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
  } finally { URL.revokeObjectURL(url); }
}

function renderQr() {
  return `<form id="qr-form"><label class="tool-field">Text or URL<textarea class="tool-textarea" id="qr-text" maxlength="240" placeholder="Enter text or a URL (up to 78 UTF-8 bytes)"></textarea></label><div class="tool-actions"><button class="tool-button primary" type="submit">Generate QR code</button><button class="tool-button" type="button" data-tool-action="download-qr" disabled>Download PNG</button></div></form><p class="tool-message" id="tool-message" role="status">QR codes are generated entirely in your browser; entered text is not sent anywhere.</p><div id="qr-output"></div>`;
}

function setToolMessage(message, type = '') {
  const node = document.querySelector('#tool-message');
  if (!node) return;
  node.textContent = message;
  node.className = `tool-message${type ? ` ${type}` : ''}`;
}

function closeToolDialog() {
  if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
  if (countdownRunning) {
    countdownRemaining = Math.max(0, countdownRemaining - (Date.now() - countdownStartedAt));
    countdownRunning = false;
  }
  if (stopwatchRunning) {
    stopwatchElapsed = currentStopwatchTime();
    stopwatchRunning = false;
  }
  if (toolsDialog.open) toolsDialog.close();
}

toolCards.forEach((card) => {
  if (card === calculatorCard) return;
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-haspopup', 'dialog');
  card.setAttribute('aria-label', `Open ${card.dataset.name}`);
  card.addEventListener('click', () => openTool(card));
  card.addEventListener('keydown', (event) => {
    if (event.target !== card) return;
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openTool(card); }
  });
});

toolsDialog.addEventListener('close', () => {
  cleanupImageUrls();
  cleanupAudio();
  stopScanner();
  releasePdfDownloads();
  if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
  if (countdownRunning) {
    countdownRemaining = Math.max(0, countdownRemaining - (Date.now() - countdownStartedAt));
    countdownRunning = false;
  }
  if (stopwatchRunning) { stopwatchElapsed = currentStopwatchTime(); stopwatchRunning = false; }
  if (toolOpener && toolOpener.isConnected && !toolOpener.hidden) toolOpener.focus();
  else searchInput.focus();
  toolOpener = null;
});
toolsDialog.addEventListener('click', (event) => { if (event.target === toolsDialog) closeToolDialog(); });
toolContent.addEventListener('input', (event) => {
  if (activeTool === 'Image Studio' && imageSource && document.querySelector('#image-lock-ratio').checked) {
    const width = document.querySelector('#image-width'); const height = document.querySelector('#image-height');
    if (event.target === width && Number(width.value) > 0) height.value = Math.round(Number(width.value) * imageSource.naturalHeight / imageSource.naturalWidth);
    if (event.target === height && Number(height.value) > 0) width.value = Math.round(Number(height.value) * imageSource.naturalWidth / imageSource.naturalHeight);
  }
  if (activeTool === 'Unit Converter') updateConverter();
  if (activeTool === 'Word Counter') updateWordStats();
  if (activeTool === 'Percentage Calculator') calculatePercentage();
  if (activeTool === 'Age Calculator') updateAgeResult();
  if (activeTool === 'GST Calculator') updateGstResult();
  if (activeTool === 'Discount Calculator') updateDiscountResult();
  if (activeTool === 'Date Difference') updateDateDifference();
  if (activeTool === 'Data Storage Converter') updateStorageResult();
  if (activeTool === 'Cooking Converter') updateCookingResult();
  if (activeTool === 'Quick Notes' && event.target.id === 'quick-notes-text') saveQuickNotes(event.target.value);
  if (event.target.matches('.timer-part')) updateClockDisplay();
  if (event.target.id === 'audio-speed') {
    const player = document.querySelector('#audio-player');
    if (player) player.playbackRate = Number(event.target.value);
  }
  if (event.target.id === 'audio-volume') {
    const player = document.querySelector('#audio-player');
    if (player) player.volume = Math.min(1, Number(event.target.value) / 100);
  }
});
toolContent.addEventListener('change', (event) => {
  if (event.target.id === 'audio-file') loadAudioFile(event.target.files[0]);
  if (event.target.id === 'scanner-image') { stopScanner('Scanning uploaded image…'); scanImageFile(event.target.files[0]); }
  if (event.target.id === 'scanner-camera' && (scannerStream || fallbackQrScanner)) { stopScanner('Switching camera…'); startScanner(); }
  if (event.target.id === 'audio-merge-files') {
    audioState.files = Array.from(event.target.files || []);
    renderAudioMergeOrder();
    audioStatus(audioState.files.length ? `${audioState.files.length} file(s) selected. Arrange the order, then merge.` : 'Choose at least two compatible audio files.');
  }
  if (event.target.id === 'audio-task') {
    const mergeMode = event.target.value === 'merge';
    document.querySelector('#audio-single-panel').hidden = mergeMode;
    document.querySelector('#audio-merge-panel').hidden = !mergeMode;
    document.querySelector('#audio-split-field').hidden = event.target.value !== 'split';
    const exportButton = document.querySelector('[data-tool-action="audio-export"]');
    if (exportButton) exportButton.textContent = event.target.value === 'trim' ? 'Export trimmed WAV' : event.target.value === 'split' ? 'Split and export WAV clips' : event.target.value === 'effects' ? 'Export processed WAV' : 'Export WAV (original speed)';
    audioStatus(mergeMode ? 'Choose two or more files for a continuous WAV export.' : 'Choose a supported audio file to begin.');
  }
  if (event.target.id === 'pdf-mode') {
    toolContent.querySelectorAll('[data-pdf-panel]').forEach((panel) => { panel.hidden = panel.dataset.pdfPanel !== event.target.value; });
    releasePdfDownloads();
    document.querySelector('#pdf-output-links').replaceChildren();
    document.querySelector('#pdf-text-output').hidden = true;
    setPdfStatus('');
  }
  if (event.target.id === 'image-file') loadImageFile(event.target.files[0]);
  if (event.target.id === 'gst-mode') updateGstResult();
  if (event.target.id === 'storage-from' || event.target.id === 'storage-to') updateStorageResult();
  if (event.target.id === 'cooking-from' || event.target.id === 'cooking-to') updateCookingResult();
  if (event.target.id === 'unit-category') {
    converterCategory = event.target.value;
    updateConverterUnits();
    updateConverter();
  }
  if (event.target.id === 'percent-mode') { percentageFields(event.target.value); calculatePercentage(); }
  if (event.target.dataset.toolAction === 'toggle-task') {
    const task = tasks.find((item) => item.id === event.target.closest('[data-task-id]').dataset.taskId);
    if (task) { task.done = event.target.checked; saveTasks(); renderTaskList(); }
  }
});
toolContent.addEventListener('submit', (event) => {
  if (event.target.id === 'barcode-generator-form') {
    event.preventDefault(); generateBarcode();
  } else if (event.target.id === 'qr-form') {
    event.preventDefault(); generateQrCode();
  } else if (event.target.id === 'add-task-form') {
    event.preventDefault();
    const input = event.target.elements.taskText;
    const text = input.value.trim();
    if (!text) return;
    tasks.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, text, done: false });
    input.value = '';
    saveTasks(); renderTaskList();
    input.focus();
  } else if (event.target.matches('.edit-task-form')) {
    event.preventDefault();
    const item = event.target.closest('[data-task-id]');
    const task = tasks.find((entry) => entry.id === item.dataset.taskId);
    const text = new FormData(event.target).get('taskText').trim();
    if (task && text) { task.text = text; saveTasks(); }
    editingTaskId = null; renderTaskList();
  }
});
toolContent.addEventListener('click', async (event) => {
  const actionButton = event.target.closest('[data-tool-action]');
  if (!actionButton) {
    const filter = event.target.closest('[data-filter]');
    if (filter) { taskFilter = filter.dataset.filter; renderTaskList(); }
    return;
  }
  const action = actionButton.dataset.toolAction;
  if (action === 'back') { closeToolDialog(); return; }
  if (action === 'start-scanner') { await startScanner(); return; }
  if (action === 'stop-scanner') { stopScanner(); return; }
  if (action === 'scanner-clear') {
    scannerResultFound = false;
    const result = document.querySelector('#scanner-result'); if (result) { result.hidden = true; result.textContent = ''; }
    const format = document.querySelector('#scanner-format'); if (format) format.textContent = '';
    const copy = document.querySelector('#scanner-copy'); if (copy) { copy.disabled = true; copy.dataset.scanValue = ''; }
    const open = document.querySelector('#scanner-open'); if (open) { open.hidden = true; open.removeAttribute('href'); }
    scannerStatus('Result cleared. Ready to scan again.'); return;
  }
  if (action === 'scanner-copy') {
    try { await navigator.clipboard.writeText(actionButton.dataset.scanValue || ''); scannerStatus('Decoded content copied.'); }
    catch { scannerStatus('Clipboard access is unavailable in this browser.', true); }
    return;
  }
  if (action === 'copy-barcode') {
    try { await navigator.clipboard.writeText(document.querySelector('#barcode-value').value.trim()); document.querySelector('#barcode-status').textContent = 'Barcode data copied.'; }
    catch { document.querySelector('#barcode-status').textContent = 'Clipboard access is unavailable.'; }
    return;
  }
  if (action === 'download-barcode-svg') {
    try { const blob = new Blob([barcodeSvgString()], { type: 'image/svg+xml;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'barcode.svg'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    catch (error) { document.querySelector('#barcode-status').textContent = error.message; }
    return;
  }
  if (action === 'download-barcode-png') {
    try { await downloadBarcodePng(); }
    catch (error) { document.querySelector('#barcode-status').textContent = error.message || 'Could not create PNG.'; }
    return;
  }
  if (action.startsWith('pdf-')) { await runPdfAction(action); return; }
  if (action === 'audio-preview') {
    try { previewAudioProcessing(); }
    catch (error) { audioStatus(error?.message || 'Could not preview the selected audio.', 'error'); }
    return;
  }
  if (action === 'audio-export' || action === 'audio-merge') {
    actionButton.disabled = true;
    try {
      if (action === 'audio-merge') await mergeAudioFiles();
      else await exportAudio();
    } catch (error) { audioStatus(error?.message || 'Audio processing failed. Try another supported file.', 'error'); }
    finally { if (actionButton.isConnected) actionButton.disabled = action === 'audio-export' ? !audioState.buffer : audioState.files.length < 2; }
    return;
  }
  if (action === 'process-image') {
    actionButton.disabled = true;
    try { await processImage(); }
    catch { document.querySelector('#image-status').textContent = 'Image processing failed. Try a smaller image or different format.'; }
    finally { if (actionButton.isConnected) actionButton.disabled = !imageSource; }
  }
  if (action === 'pick-decision') {
    const options = document.querySelector('#decision-options').value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
    const result = document.querySelector('#decision-result');
    result.textContent = options.length < 2 ? 'Add at least two non-empty options.' : `Chosen: ${options[Math.floor(Math.random() * options.length)]}`;
  }
  if (action === 'clear-notes') {
    const area = document.querySelector('#quick-notes-text'); area.value = '';
    try { localStorage.removeItem('everyday-tools-quick-notes'); document.querySelector('#quick-notes-status').textContent = 'Notes cleared from this device.'; }
    catch { document.querySelector('#quick-notes-status').textContent = 'Could not clear browser storage.'; }
  }
  if (action === 'download-notes') {
    const text = document.querySelector('#quick-notes-text').value;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'everyday-tools-notes.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (action === 'swap-units') {
    const from = document.querySelector('#unit-from'); const to = document.querySelector('#unit-to');
    [from.value, to.value] = [to.value, from.value]; updateConverter();
  }
  if (action === 'copy-word' || action === 'copy-formatted') {
    const area = document.querySelector(action === 'copy-word' ? '#word-text' : '#formatter-text');
    try { await navigator.clipboard.writeText(area.value); setToolMessage(area.value ? 'Copied to clipboard.' : 'There is no text to copy.', area.value ? 'success' : 'error'); }
    catch { area.focus(); area.select(); setToolMessage('Clipboard access is unavailable. Select the text and copy it manually.', 'error'); }
  }
  if (action === 'select-word') { const area = document.querySelector('#word-text'); area.focus(); area.select(); }
  if (action === 'clear-word') { document.querySelector('#word-text').value = ''; updateWordStats(); setToolMessage('Text cleared.', 'success'); }
  if (action === 'timer-mode' || action === 'stopwatch-mode') {
    if (countdownRunning) { countdownRemaining = Math.max(0, countdownRemaining - (Date.now() - countdownStartedAt)); countdownRunning = false; }
    if (stopwatchRunning) { stopwatchElapsed = currentStopwatchTime(); stopwatchRunning = false; }
    timerMode = action === 'timer-mode' ? 'timer' : 'stopwatch';
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
    renderTool();
  }
  if (action === 'clock-start') {
    if (!countdownRunning && countdownRemaining <= 0) {
      const parts = ['hours', 'minutes', 'seconds'].map((name) => Number(document.querySelector(`#timer-${name}`).value));
      if (parts.some((number) => !Number.isInteger(number) || number < 0) || parts[0] > 999 || parts[1] > 59 || parts[2] > 59 || parts.every((number) => number === 0)) { setToolMessage('Set a valid duration greater than zero (minutes and seconds must be under 60).', 'error'); return; }
      countdownRemaining = ((parts[0] * 60 + parts[1]) * 60 + parts[2]) * 1000;
    }
    if (!countdownRunning) { countdownStartedAt = Date.now(); countdownRunning = true; startClockUpdates(); setToolMessage('Timer running.'); }
  }
  if (action === 'clock-pause' && countdownRunning) {
    countdownRemaining = Math.max(0, countdownRemaining - (Date.now() - countdownStartedAt)); countdownRunning = false;
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null; } setToolMessage('Timer paused.'); updateClockDisplay();
  }
  if (action === 'clock-reset') {
    countdownRunning = false; countdownRemaining = 0;
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
    ['hours', 'minutes', 'seconds'].forEach((name) => { const input = document.querySelector(`#timer-${name}`); if (input) input.value = name === 'minutes' ? 1 : 0; });
    setToolMessage('Timer reset.'); updateClockDisplay();
  }
  if (action === 'watch-start' && !stopwatchRunning) { stopwatchStartedAt = Date.now(); stopwatchRunning = true; startClockUpdates(); }
  if (action === 'watch-pause' && stopwatchRunning) { stopwatchElapsed = currentStopwatchTime(); stopwatchRunning = false; if (clockInterval) { clearInterval(clockInterval); clockInterval = null; } updateClockDisplay(); }
  if (action === 'watch-reset') { stopwatchRunning = false; stopwatchElapsed = 0; stopwatchLaps = []; if (clockInterval) { clearInterval(clockInterval); clockInterval = null; } renderTool(); }
  if (action === 'watch-lap' && (stopwatchRunning || stopwatchElapsed > 0)) {
    stopwatchLaps.unshift(currentStopwatchTime());
    document.querySelector('#watch-laps').innerHTML = stopwatchLaps.map((lap, index) => `<li>Lap ${stopwatchLaps.length - index}: ${formatClock(lap, true)}</li>`).join('');
  }
  if (action === 'edit-task') { editingTaskId = actionButton.closest('[data-task-id]').dataset.taskId; renderTaskList(); const input = document.querySelector('.edit-task-form input'); input.focus(); input.select(); }
  if (action === 'cancel-edit') { editingTaskId = null; renderTaskList(); }
  if (action === 'delete-task') { const id = actionButton.closest('[data-task-id]').dataset.taskId; tasks = tasks.filter((task) => task.id !== id); saveTasks(); renderTaskList(); }
  if (action === 'clear-completed') { tasks = tasks.filter((task) => !task.done); saveTasks(); renderTaskList(); }
  if (['uppercase', 'lowercase', 'titlecase', 'spaces', 'trim'].includes(action)) {
    const area = document.querySelector('#formatter-text');
    if (action === 'uppercase') area.value = area.value.toLocaleUpperCase();
    if (action === 'lowercase') area.value = area.value.toLocaleLowerCase();
    if (action === 'titlecase') area.value = area.value.toLocaleLowerCase().replace(/(^|[\s\p{P}])([\p{L}\p{N}])/gu, (_, boundary, letter) => boundary + letter.toLocaleUpperCase());
    if (action === 'spaces') area.value = area.value.split('\n').map((line) => line.replace(/[\t ]+/g, ' ').trim()).join('\n');
    if (action === 'trim') area.value = area.value.split('\n').map((line) => line.trim()).join('\n');
    setToolMessage('Text updated.', 'success');
  }
  if (action === 'clear-formatter') { document.querySelector('#formatter-text').value = ''; setToolMessage('Text cleared.', 'success'); }
  if (action === 'download-qr') downloadQr();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && toolsDialog.open) closeToolDialog();
});

function qrMultiply(x, y) {
  let result = 0;
  for (let i = 7; i >= 0; i -= 1) {
    result = (result << 1) ^ ((result >>> 7) * 0x11d);
    if ((y >>> i) & 1) result ^= x;
  }
  return result;
}
function qrGenerator(degree) {
  let polynomial = [1];
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    const next = Array(polynomial.length + 1).fill(0);
    polynomial.forEach((coefficient, index) => { next[index] ^= coefficient; next[index + 1] ^= qrMultiply(coefficient, root); });
    polynomial = next;
    root = qrMultiply(root, 2);
  }
  return polynomial;
}
function qrRemainder(data, degree) {
  const generator = qrGenerator(degree);
  const result = Array(degree).fill(0);
  data.forEach((byte) => {
    const factor = byte ^ result.shift();
    result.push(0);
    for (let index = 1; index < generator.length; index += 1) {
      result[index - 1] ^= qrMultiply(generator[index], factor);
    }
  });
  return result;
}
function qrEncode(text) {
  const bytes = Array.from(new TextEncoder().encode(text));
  const version = bytes.length <= 17 ? 1 : bytes.length <= 32 ? 2 : bytes.length <= 53 ? 3 : bytes.length <= 78 ? 4 : 0;
  if (!version) throw new Error('Text is too long. This offline QR generator supports up to 78 UTF-8 bytes.');
  const dataCapacity = [0, 19, 34, 55, 80][version];
  const eccCount = [0, 7, 10, 15, 20][version];
  const bits = [];
  const appendBits = (value, count) => { for (let bit = count - 1; bit >= 0; bit -= 1) bits.push((value >>> bit) & 1); };
  appendBits(4, 4); appendBits(bytes.length, 8); bytes.forEach((byte) => appendBits(byte, 8));
  for (let i = 0; i < Math.min(4, dataCapacity * 8 - bits.length); i += 1) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((value, bit) => value * 2 + bit, 0));
  for (let pad = 0; data.length < dataCapacity; pad += 1) data.push(pad % 2 ? 0x11 : 0xec);
  const codewords = data.concat(qrRemainder(data, eccCount));
  const size = version * 4 + 17;
  const matrix = Array.from({ length: size }, () => Array(size).fill(null));
  const set = (x, y, value) => { if (x >= 0 && x < size && y >= 0 && y < size) matrix[y][x] = Boolean(value); };
  function finder(left, top) {
    for (let dy = -1; dy <= 7; dy += 1) for (let dx = -1; dx <= 7; dx += 1) {
      const x = left + dx; const y = top + dy;
      const inside = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
      set(x, y, inside && (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4)));
    }
  }
  finder(0, 0); finder(size - 7, 0); finder(0, size - 7);
  for (let i = 8; i < size - 8; i += 1) { if (matrix[6][i] === null) set(i, 6, i % 2 === 0); if (matrix[i][6] === null) set(6, i, i % 2 === 0); }
  if (version >= 2) {
    const center = size - 7;
    for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) set(center + dx, center + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  const formatData = 8; // Error correction L, mask pattern 0.
  let format = formatData << 10;
  for (let bit = 14; bit >= 10; bit -= 1) if ((format >>> bit) & 1) format ^= 0x537 << (bit - 10);
  format = ((formatData << 10) | format) ^ 0x5412;
  for (let i = 0; i <= 5; i += 1) set(8, i, (format >>> i) & 1);
  set(8, 7, (format >>> 6) & 1); set(8, 8, (format >>> 7) & 1); set(7, 8, (format >>> 8) & 1);
  for (let i = 9; i < 15; i += 1) set(14 - i, 8, (format >>> i) & 1);
  for (let i = 0; i < 8; i += 1) set(size - 1 - i, 8, (format >>> i) & 1);
  for (let i = 8; i < 15; i += 1) set(8, size - 15 + i, (format >>> i) & 1);
  set(8, size - 8, true);
  let bitIndex = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let step = 0; step < size; step += 1) {
      const row = upward ? size - 1 - step : step;
      for (let offset = 0; offset < 2; offset += 1) {
        const col = right - offset;
        if (matrix[row][col] !== null) continue;
        const raw = bitIndex < codewords.length * 8 ? (codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1 : 0;
        bitIndex += 1;
        set(col, row, Boolean(raw ^ ((row + col) % 2 === 0)));
      }
    }
    upward = !upward;
  }
  return matrix;
}
function generateQrCode() {
  const text = document.querySelector('#qr-text').value;
  const output = document.querySelector('#qr-output');
  const download = document.querySelector('[data-tool-action="download-qr"]');
  output.innerHTML = '';
  download.disabled = true;
  if (!text.trim()) { setToolMessage('Enter some text or a URL first.', 'error'); return; }
  try {
    const matrix = qrEncode(text);
    const quiet = 4; const scale = 8; const size = (matrix.length + quiet * 2) * scale;
    const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, size, size); context.fillStyle = '#111111';
    matrix.forEach((row, y) => row.forEach((dark, x) => { if (dark) context.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale); }));
    canvas.className = 'tool-qr'; canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Generated QR code'); output.append(canvas);
    download.disabled = false;
    setToolMessage('QR code generated locally. Download the PNG or scan it with a camera.', 'success');
  } catch (error) { setToolMessage(error.message || 'Could not generate a QR code.', 'error'); }
}
function downloadQr() {
  const canvas = document.querySelector('#qr-output canvas');
  if (!canvas) { setToolMessage('Generate a QR code before downloading.', 'error'); return; }
  const link = document.createElement('a'); link.download = 'everyday-tools-qr.png'; link.href = canvas.toDataURL('image/png'); link.click();
}

document.querySelector('.hero-content').append(document.querySelector('.search-wrap'));
organizeToolSections();
if (activeCategory === 'all') updateTools();

const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const mobileMenu = document.querySelector('#mobile-section-menu');
mobileMenuToggle.addEventListener('click', () => {
  const expanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
  mobileMenuToggle.setAttribute('aria-expanded', String(!expanded));
  mobileMenu.hidden = expanded;
});
mobileMenu.addEventListener('click', (event) => {
  if (event.target.closest('a')) {
    mobileMenu.hidden = true;
    mobileMenuToggle.setAttribute('aria-expanded', 'false');
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && mobileMenuToggle.getAttribute('aria-expanded') === 'true') {
    mobileMenu.hidden = true;
    mobileMenuToggle.setAttribute('aria-expanded', 'false');
    mobileMenuToggle.focus();
  }
});
document.querySelectorAll('.section-menu-panel a').forEach((link) => {
  link.addEventListener('click', () => { document.querySelector('.section-menu').open = false; });
});

document.querySelectorAll('.main-nav a, .section-menu-panel a, .mobile-section-menu a').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.section-menu-panel a, .mobile-section-menu a, .main-nav-home').forEach((item) => item.classList.toggle('is-current', item.hash === link.hash));
    const section = document.querySelector(link.hash)?.dataset.toolSection;
    if (section || link.hash === '#home') {
      activeCategory = section || 'all';
      searchInput.value = '';
      filterButtons.forEach((button) => {
        const selected = button.dataset.filter === activeCategory;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      updateTools();
    }
  });
});
document.querySelectorAll('[data-home-tool]').forEach((button) => {
  button.addEventListener('click', () => {
    const card = Array.from(toolCards).find((item) => item.dataset.name === button.dataset.homeTool);
    if (card?.dataset.name === 'Calculator') openCalculator();
    else if (card) openTool(card);
  });
});
if ('IntersectionObserver' in window) {
  const sectionLinks = document.querySelectorAll('.main-nav a, .section-menu-panel a, .mobile-section-menu a');
  const sectionTargets = Array.from(sectionLinks).map((link) => link.hash === '#home' ? document.querySelector('.hero') : document.querySelector(link.hash)).filter(Boolean);
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    const hash = visible.target.matches('.hero') ? '#home' : `#${visible.target.id}`;
    sectionLinks.forEach((link) => link.classList.toggle('is-current', link.hash === hash));
  }, { rootMargin: '-22% 0px -68% 0px', threshold: [0, 0.1, 0.3, 0.6] });
  sectionTargets.forEach((target) => observer.observe(target));
}
