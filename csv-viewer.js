(() => {
  const name = 'CSV Viewer & Converter';
  const categories = window.UNIFOLD_TOOL_CATEGORIES || (window.UNIFOLD_TOOL_CATEGORIES = {});
  categories[name] = 'developer';

  const card = document.createElement('article');
  card.className = 'tool-card';
  card.dataset.name = name;
  card.dataset.category = 'developer';
  card.dataset.keywords = 'csv comma separated values parser spreadsheet quoted fields json tsv local file';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-haspopup', 'dialog');
  card.setAttribute('aria-label', `Open ${name}`);
  card.innerHTML = '<div class="card-top"><span class="tool-icon icon-blue" aria-hidden="true">CSV</span><span class="coming-soon">Open Tool →</span></div><h3>CSV Viewer &amp; Converter</h3><p>Preview, search, sort, and convert local CSV data to JSON or TSV.</p>';
  document.querySelector('#tool-grid')?.append(card);

  const priorRender = window.UnifoldNewTools?.render;
  if (typeof priorRender === 'function') {
    window.UnifoldNewTools.render = function (toolName) {
      if (toolName === name) return renderCsvTool();
      return priorRender.call(this, toolName);
    };
  }

  let model = null;
  let sortColumn = -1;
  let sortDirection = 1;
  const MAX_TEXT_SIZE = 12 * 1024 * 1024;
  const PREVIEW_LIMIT = 300;
  const esc = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));

  function renderCsvTool() {
    return `<p class="tool-message">Your file and pasted data are processed locally in this browser; nothing is uploaded.</p>
      <label class="tool-field">Choose a CSV file<input class="tool-input" id="csv-file" type="file" accept=".csv,text/csv"></label>
      <label class="tool-field csv-source-field">Or paste CSV text<textarea class="tool-textarea" id="csv-source" rows="8" placeholder="Name,Note\nAda,\"comma, inside quotes\""></textarea></label>
      <div class="tool-actions"><button class="tool-button primary" type="button" data-csv-action="parse">Parse CSV</button><button class="tool-button" type="button" data-csv-action="json" disabled>Export JSON</button><button class="tool-button" type="button" data-csv-action="tsv" disabled>Export TSV</button><button class="tool-button" type="button" data-csv-action="clear">Clear</button></div>
      <p class="tool-message" id="csv-status" role="status" aria-live="polite">Select a .csv file or paste CSV text to begin.</p>
      <div class="csv-tools-row"><strong id="csv-summary">No data loaded</strong><label class="tool-field">Filter rows<input class="tool-input" id="csv-search" type="search" placeholder="Search any cell…" disabled></label></div>
      <div class="csv-table-wrap" id="csv-table-wrap" aria-label="CSV preview"></div>`;
  }

  function parseCsv(text) {
    if (text.length > MAX_TEXT_SIZE) throw new Error('CSV text exceeds the 12 MB safety limit.');
    const source = text.replace(/^\uFEFF/, '');
    const rows = [];
    let row = [], cell = '', quoted = false, closedQuote = false;
    for (let i = 0; i < source.length; i += 1) {
      const ch = source[i];
      if (quoted) {
        if (ch === '"' && source[i + 1] === '"') { cell += '"'; i += 1; }
        else if (ch === '"') { quoted = false; closedQuote = true; }
        else cell += ch;
        continue;
      }
      if (closedQuote && ch !== ',' && ch !== '\r' && ch !== '\n' && ch !== ' ' && ch !== '\t') {
        throw new Error(`Unexpected character after a closing quote near character ${i + 1}.`);
      }
      if (ch === '"' && !closedQuote) {
        if (cell.length === 0) { quoted = true; continue; }
        throw new Error(`A quote appeared inside an unquoted field near character ${i + 1}.`);
      }
      if (ch === ',') { row.push(cell); cell = ''; closedQuote = false; continue; }
      if (ch === '\r' || ch === '\n') {
        row.push(cell); rows.push(row); row = []; cell = ''; closedQuote = false;
        if (ch === '\r' && source[i + 1] === '\n') i += 1;
        if (rows.length > 100000) throw new Error('This CSV has more than 100,000 rows; reduce its size and try again.');
        continue;
      }
      if (!closedQuote) cell += ch;
    }
    if (quoted) throw new Error('A quoted field was not closed. Check the final line and escaped quotes.');
    if (cell.length || row.length || closedQuote) { row.push(cell); rows.push(row); }
    if (rows.length > 100000) throw new Error('This CSV has more than 100,000 rows; reduce its size and try again.');
    const headers = rows.shift() || [];
    const width = rows.reduce((maximum, values) => Math.max(maximum, values.length), headers.length);
    while (headers.length < width) headers.push('');
    rows.forEach((values) => { while (values.length < width) values.push(''); });
    return { headers, rows, width };
  }

  function setStatus(text, error = false) {
    const status = document.querySelector('#csv-status');
    if (status) { status.textContent = text; status.classList.toggle('error', error); }
  }
  function showCsvError(message) {
    model = null;
    document.querySelectorAll('[data-csv-action="json"], [data-csv-action="tsv"]').forEach((button) => { button.disabled = true; });
    const search = document.querySelector('#csv-search'); if (search) search.disabled = true;
    document.querySelector('#csv-summary').textContent = 'No data loaded';
    document.querySelector('#csv-table-wrap').replaceChildren();
    setStatus(message, true);
  }
  function loadCsv(text, fileName = 'Pasted CSV') {
    const parsed = parseCsv(text);
    model = { ...parsed, fileName };
    sortColumn = -1; sortDirection = 1;
    document.querySelectorAll('[data-csv-action="json"], [data-csv-action="tsv"]').forEach((button) => { button.disabled = false; });
    document.querySelector('#csv-search').disabled = false;
    setStatus(parsed.width ? 'CSV parsed locally. Select a column heading to sort.' : 'The file is empty; paste or load another CSV.');
    renderTable();
  }

  function renderTable() {
    const host = document.querySelector('#csv-table-wrap');
    if (!host || !model) return;
    const summary = document.querySelector('#csv-summary');
    summary.textContent = `${model.fileName} · ${model.rows.length} data row${model.rows.length === 1 ? '' : 's'} · ${model.width} column${model.width === 1 ? '' : 's'}`;
    if (!model.width) { host.innerHTML = '<p class="tool-message">No columns to preview.</p>'; return; }
    const query = (document.querySelector('#csv-search').value || '').toLocaleLowerCase();
    let rows = model.rows.map((values, index) => ({ values, index }));
    if (query) rows = rows.filter(({ values }) => values.some((value) => value.toLocaleLowerCase().includes(query)));
    if (sortColumn >= 0) rows.sort((a, b) => {
      const result = a.values[sortColumn].localeCompare(b.values[sortColumn], undefined, { numeric: true, sensitivity: 'base' });
      return (result || a.index - b.index) * sortDirection;
    });
    const shown = rows.slice(0, PREVIEW_LIMIT);
    const table = document.createElement('table');
    table.className = 'csv-table';
    const caption = document.createElement('caption');
    caption.textContent = `${rows.length} matching row${rows.length === 1 ? '' : 's'}${rows.length > PREVIEW_LIMIT ? ` · showing first ${PREVIEW_LIMIT}` : ''}`;
    table.append(caption);
    const thead = document.createElement('thead'), headRow = document.createElement('tr');
    model.headers.forEach((header, index) => {
      const th = document.createElement('th'), sort = document.createElement('button');
      th.scope = 'col';
      if (sortColumn === index) th.setAttribute('aria-sort', sortDirection === 1 ? 'ascending' : 'descending');
      sort.type = 'button'; sort.className = 'csv-sort';
      sort.textContent = `${header || `Column ${index + 1}`}${sortColumn === index ? (sortDirection === 1 ? ' ↑' : ' ↓') : ''}`;
      sort.setAttribute('aria-label', `Sort by ${header || `column ${index + 1}`} ${sortColumn === index && sortDirection === 1 ? 'descending' : 'ascending'}`);
      sort.dataset.csvSort = String(index); th.append(sort); headRow.append(th);
    });
    thead.append(headRow); table.append(thead);
    const tbody = document.createElement('tbody');
    shown.forEach(({ values }) => {
      const tr = document.createElement('tr');
      values.forEach((value) => { const td = document.createElement('td'); td.textContent = value; tr.append(td); });
      tbody.append(tr);
    });
    table.append(tbody); host.replaceChildren(table);
    if (!rows.length) { const empty = document.createElement('p'); empty.className = 'tool-message'; empty.textContent = 'No rows match this search.'; host.append(empty); }
  }

  function exportTsv() {
    const rows = [model.headers, ...model.rows];
    const cell = (value) => /[\t\r\n"]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    return rows.map((row) => row.map(cell).join('\t')).join('\r\n');
  }
  function download(text, fileName, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement('a'); link.href = url; link.download = fileName; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  document.addEventListener('change', async (event) => {
    if (event.target.id !== 'csv-file') return;
    const file = event.target.files?.[0]; if (!file) return;
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') { showCsvError('Choose a .csv file.'); return; }
    if (file.size > MAX_TEXT_SIZE) { showCsvError('This file exceeds the 12 MB safety limit.'); return; }
    try { loadCsv(await file.text(), file.name); }
    catch (error) { showCsvError(error.message || 'Could not read this CSV file.'); }
  });
  document.addEventListener('input', (event) => {
    if (event.target.id === 'csv-search' && model) renderTable();
  });
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-csv-action], [data-csv-sort]');
    if (!button) return;
    if (button.dataset.csvSort !== undefined && model) {
      const column = Number(button.dataset.csvSort);
      sortDirection = sortColumn === column ? -sortDirection : 1;
      sortColumn = column; renderTable(); return;
    }
    const action = button.dataset.csvAction;
    if (action === 'parse') {
      try { loadCsv(document.querySelector('#csv-source').value); }
      catch (error) { showCsvError(error.message || 'Could not parse this CSV.'); }
    } else if (action === 'json' && model) {
      download(JSON.stringify({ headers: model.headers, rows: model.rows }, null, 2), 'converted-data.json', 'application/json;charset=utf-8');
    } else if (action === 'tsv' && model) download(exportTsv(), 'converted-data.tsv', 'text/tab-separated-values;charset=utf-8');
    else if (action === 'clear') {
      model = null; sortColumn = -1; sortDirection = 1;
      document.querySelector('#csv-source').value = ''; document.querySelector('#csv-file').value = '';
      document.querySelector('#csv-search').value = ''; document.querySelector('#csv-search').disabled = true;
      document.querySelectorAll('[data-csv-action="json"], [data-csv-action="tsv"]').forEach((item) => { item.disabled = true; });
      document.querySelector('#csv-summary').textContent = 'No data loaded'; document.querySelector('#csv-table-wrap').replaceChildren();
      setStatus('CSV data cleared. Choose a file or paste CSV text.');
    }
  });
})();
