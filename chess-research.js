(() => {
  const categories = window.UNIFOLD_TOOL_CATEGORIES || (window.UNIFOLD_TOOL_CATEGORIES = {});
  categories['Chess Studio'] = 'learning';
  categories['Research Explorer'] = 'web';
  const descriptions = {
    'Chess Studio': 'Play through legal chess positions, review moves, and edit FEN locally.',
    'Research Explorer': 'Search real Wikipedia articles or open a Google web search.'
  };
  const keywords = {
    'Chess Studio': 'chess board game legal moves FEN analysis learning reference checkmate castling',
    'Research Explorer': 'research topic wikipedia articles search web google reference learning'
  };
  Object.entries(descriptions).forEach(([name, description], index) => {
    if (document.querySelector(`.tool-card[data-name="${name}"]`)) return;
    const card = document.createElement('article');
    card.className = 'tool-card';
    card.dataset.name = name;
    card.dataset.category = categories[name];
    card.dataset.keywords = keywords[name];
    card.setAttribute('role', 'button');
    card.setAttribute('aria-haspopup', 'dialog');
    card.setAttribute('aria-label', `Open ${name}`);
    card.tabIndex = 0;
    const icon = index === 0 ? '♟' : '⌕';
    card.innerHTML = `<div class="card-top"><span class="tool-icon icon-violet" aria-hidden="true">${icon}</span><span class="coming-soon">Open Tool →</span></div><h3></h3><p></p>`;
    card.querySelector('h3').textContent = name;
    card.querySelector('p').textContent = description;
    document.querySelector('#tool-grid').append(card);
  });

  const originalRender = window.UnifoldNewTools?.render;
  if (typeof originalRender === 'function') {
    window.UnifoldNewTools.render = function (name) {
      if (name === 'Chess Studio') return renderChess();
      if (name === 'Research Explorer') return renderResearch();
      return originalRender.call(this, name);
    };
  }

  function renderChess() {
    return `<p class="tool-message">Chess rules use the open-source chess.js library loaded on demand when Chess Studio opens. Engine analysis is not included.</p>
      <div class="chess-layout">
        <div><div id="chess-status" class="tool-result" aria-live="polite">Loading chess rules…</div><div id="chess-board" class="chess-board" role="grid" aria-label="Chess board"></div></div>
        <aside class="chess-side"><div class="tool-actions"><button class="tool-button" type="button" data-chess-action="undo">Undo</button><button class="tool-button" type="button" data-chess-action="redo">Redo</button><button class="tool-button" type="button" data-chess-action="restart">Restart game</button><button class="tool-button danger" type="button" data-chess-action="clear">Clear position</button></div>
          <h3 class="chess-subheading">Move history</h3><ol id="chess-history" class="chess-history" aria-live="polite"></ol>
          <label class="tool-field" for="chess-fen-input">Load FEN position</label><textarea class="tool-textarea chess-fen" id="chess-fen-input" rows="3" spellcheck="false" aria-label="FEN position input"></textarea>
          <div class="tool-actions"><button class="tool-button primary" type="button" data-chess-action="load-fen">Load position</button><button class="tool-button" type="button" data-chess-action="copy-fen">Copy current FEN</button></div><p class="tool-message" id="chess-message" role="status"></p>
          <label class="tool-field" for="chess-fen-output">Current FEN</label><textarea class="tool-textarea chess-fen" id="chess-fen-output" rows="3" readonly spellcheck="false"></textarea>
        </aside></div>`;
  }

  function renderResearch() {
    return `<p class="tool-message">Wikipedia searches require an internet connection. Queries are sent only to the selected search provider when you press Search.</p>
      <form id="research-form" class="research-form"><label class="tool-field" for="research-query">Search a topic</label><div class="research-search-row"><input class="tool-input" id="research-query" type="search" placeholder="e.g. renewable energy" autocomplete="off" required><button class="tool-button primary" type="submit">Search</button></div>
      <label class="tool-field" for="research-source">Search source</label><select class="tool-select" id="research-source"><option value="wikipedia">Wikipedia</option><option value="google">Google Web Search</option></select></form>
      <div class="tool-actions"><button class="tool-button" id="research-google" type="button">Search Google</button></div><p id="research-status" class="tool-message" role="status" aria-live="polite"></p><div id="research-results" class="research-results" aria-live="polite"></div>`;
  }

  let chessInstance = null;
  let chessLoading = false;
  let chessRedo = [];
  let selectedSquare = null;
  let legalTargets = [];
  const pieces = { wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙', bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟' };
  const squares = 'abcdefgh';

  function startChess() {
    const host = document.querySelector('#chess-board');
    if (!host || chessInstance || chessLoading) return;
    chessLoading = true;
    setChessMessage('Loading chess rules…');
    const ready = (Chess) => {
      chessLoading = false;
      if (!document.querySelector('#chess-board')) return;
      chessInstance = new Chess();
      chessRedo = [];
      drawChess();
    };
    if (ChessClass) { ready(ChessClass); return; }
    import('https://cdn.jsdelivr.net/npm/chess.js@1.4.0/dist/esm/chess.js').then(({ Chess }) => {
      ChessClass = Chess;
      ready(Chess);
    }).catch(() => {
      chessLoading = false;
      setChessMessage('Chess rules could not be loaded. Check your internet connection and close and reopen Chess Studio to retry.');
      const status = document.querySelector('#chess-status');
      if (status) status.textContent = 'Chess rules are unavailable.';
    });
  }
  function setChessMessage(text) { const el = document.querySelector('#chess-message'); if (el) el.textContent = text; }
  function drawChess() {
    if (!chessInstance) return;
    const board = document.querySelector('#chess-board');
    if (!board) return;
    board.replaceChildren();
    const position = chessInstance.board();
    position.forEach((row, rankIndex) => row.forEach((piece, fileIndex) => {
      const rank = 8 - rankIndex;
      const file = squares[fileIndex];
      const squareName = `${file}${rank}`;
      const square = document.createElement('button');
      square.type = 'button';
      square.className = `chess-square ${(rankIndex + fileIndex) % 2 ? 'dark' : 'light'}${selectedSquare === squareName ? ' selected' : ''}${legalTargets.includes(squareName) ? ' legal-target' : ''}`;
      square.dataset.square = squareName;
      square.setAttribute('role', 'gridcell');
      square.setAttribute('aria-label', `${squareName}${piece ? ` ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}`);
      if (piece) { const glyph = document.createElement('span'); glyph.className = `chess-piece ${piece.color === 'w' ? 'white-piece' : 'black-piece'}`; glyph.textContent = pieces[piece.color + piece.type]; glyph.draggable = true; glyph.dataset.from = squareName; square.append(glyph); }
      if (fileIndex === 0) { const coordinate = document.createElement('span'); coordinate.className = 'chess-coordinate rank'; coordinate.textContent = String(rank); square.append(coordinate); }
      if (rank === 1) { const coordinate = document.createElement('span'); coordinate.className = 'chess-coordinate file'; coordinate.textContent = file; square.append(coordinate); }
      board.append(square);
    }));
    document.querySelector('#chess-fen-output').value = chessInstance.fen();
    document.querySelector('#chess-fen-input').value = chessInstance.fen();
    const turn = chessInstance.turn() === 'w' ? 'White to move' : 'Black to move';
    const piecesOnBoard = position.flat().filter(Boolean);
    const hasBothKings = ['w', 'b'].every((color) => piecesOnBoard.some((piece) => piece.color === color && piece.type === 'k'));
    const ending = !hasBothKings ? 'Position cleared or missing a king — load a complete FEN position to play.' : chessInstance.isCheckmate() ? `Checkmate — ${chessInstance.turn() === 'w' ? 'Black' : 'White'} wins.` : chessInstance.isStalemate() ? 'Draw by stalemate.' : chessInstance.isDraw() ? 'Draw.' : chessInstance.isCheck() ? `${turn} · Check.` : turn;
    document.querySelector('#chess-status').textContent = ending;
    const history = chessInstance.history();
    const list = document.querySelector('#chess-history');
    list.replaceChildren();
    for (let i = 0; i < history.length; i += 2) { const item = document.createElement('li'); item.textContent = `${Math.floor(i / 2) + 1}. ${history[i]}${history[i + 1] ? ` ${history[i + 1]}` : ''}`; list.append(item); }
    list.scrollTop = list.scrollHeight;
  }
  function chooseChessSquare(square) {
    if (!chessInstance) return;
    if (selectedSquare && legalTargets.includes(square)) { makeChessMove(selectedSquare, square); return; }
    const piece = chessInstance.get(square);
    if (piece && piece.color === chessInstance.turn()) {
      selectedSquare = square;
      legalTargets = chessInstance.moves({ square, verbose: true }).map((move) => move.to);
    } else { selectedSquare = null; legalTargets = []; }
    drawChess();
  }
  function makeChessMove(from, to) {
    try {
      const piece = chessInstance.get(from);
      const move = { from, to };
      if (piece?.type === 'p' && (to.endsWith('8') || to.endsWith('1'))) {
        const choice = (window.prompt('Promote pawn to (q, r, b, n):', 'q') || 'q').toLowerCase();
        move.promotion = ['q', 'r', 'b', 'n'].includes(choice) ? choice : 'q';
      }
      chessInstance.move(move);
      chessRedo = [];
      selectedSquare = null; legalTargets = [];
      setChessMessage('');
      drawChess();
    } catch { setChessMessage('That move is not legal in this position.'); }
  }
  function copyText(value, messageId, success) {
    const status = document.querySelector(messageId);
    const fallback = () => { const helper = document.createElement('textarea'); helper.value = value; helper.style.position = 'fixed'; helper.style.opacity = '0'; document.body.append(helper); helper.select(); const ok = document.execCommand('copy'); helper.remove(); if (status) status.textContent = ok ? success : 'Clipboard unavailable; select and copy the text manually.'; };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(value).then(() => { if (status) status.textContent = success; }).catch(fallback); else fallback();
  }
  function chessAction(action) {
    if (!chessInstance) return;
    if (action === 'undo') { const move = chessInstance.undo(); if (move) chessRedo.push(move); }
    if (action === 'redo') { const move = chessRedo.pop(); if (move) { const replay = { from: move.from, to: move.to }; if (move.promotion) replay.promotion = move.promotion; chessInstance.move(replay); } }
    if (action === 'restart') { if (!window.confirm('Restart the game from the standard position? Current moves will be discarded.')) return; chessInstance.reset(); chessRedo = []; }
    if (action === 'clear') { if (!window.confirm('Clear the current chess position? This will discard its move history.')) return; chessInstance.clear(); chessRedo = []; }
    if (action === 'load-fen') {
      const fen = document.querySelector('#chess-fen-input').value.trim();
      try {
        const { Chess } = awaitChessConstructor();
        const loadedPosition = new Chess(fen);
        chessInstance = loadedPosition;
        chessRedo = []; selectedSquare = null; legalTargets = [];
        setChessMessage('FEN position loaded.');
      } catch (error) { setChessMessage(`Invalid FEN: ${error.message || 'check the board, active color, castling, en passant, and counters.'}`); return; }
    }
    if (action === 'copy-fen') { copyText(chessInstance.fen(), '#chess-message', 'Current FEN copied.'); return; }
    selectedSquare = null; legalTargets = []; drawChess();
  }
  let ChessClass = null;
  function awaitChessConstructor() { if (!ChessClass) throw new Error('Chess rules library is not ready.'); return { Chess: ChessClass }; }

  document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-chess-action]');
    if (action) { event.preventDefault(); chessAction(action.dataset.chessAction); return; }
    const square = event.target.closest('#chess-board [data-square]');
    if (square) chooseChessSquare(square.dataset.square);
    if (event.target.closest('#research-google')) openGoogleSearch();
  });
  document.addEventListener('dragstart', (event) => {
    const piece = event.target.closest('#chess-board [data-from]');
    if (!piece || !chessInstance) return;
    event.dataTransfer.setData('text/plain', piece.dataset.from);
    event.dataTransfer.effectAllowed = 'move';
    selectedSquare = piece.dataset.from;
    legalTargets = chessInstance.moves({ square: selectedSquare, verbose: true }).map((move) => move.to);
    drawChess();
  });
  document.addEventListener('dragover', (event) => { if (event.target.closest('#chess-board [data-square]')) event.preventDefault(); });
  document.addEventListener('drop', (event) => {
    const target = event.target.closest('#chess-board [data-square]');
    if (!target) return;
    event.preventDefault();
    const from = event.dataTransfer.getData('text/plain');
    if (from) makeChessMove(from, target.dataset.square);
  });
  document.addEventListener('submit', (event) => {
    if (event.target.id !== 'research-form') return;
    event.preventDefault();
    searchResearch();
  });
  const researchState = { request: 0 };
  function openGoogleSearch() {
    const input = document.querySelector('#research-query');
    if (!input?.value.trim()) { const status = document.querySelector('#research-status'); if (status) status.textContent = 'Enter a topic first.'; input?.focus(); return; }
    const url = `https://www.google.com/search?q=${encodeURIComponent(input.value.trim())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  async function searchResearch() {
    const input = document.querySelector('#research-query');
    const source = document.querySelector('#research-source');
    const status = document.querySelector('#research-status');
    const results = document.querySelector('#research-results');
    if (!input || !status || !results) return;
    const query = input.value.trim();
    if (!query) { status.textContent = 'Enter a topic to search.'; return; }
    if (source.value === 'google') { openGoogleSearch(); return; }
    const request = ++researchState.request;
    results.replaceChildren();
    status.textContent = 'Searching Wikipedia…';
    try {
      const response = await fetch(`https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=10`, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Wikipedia returned HTTP ${response.status}.`);
      const data = await response.json();
      if (request !== researchState.request || !document.querySelector('#research-results')) return;
      const pages = Array.isArray(data.pages) ? data.pages : [];
      if (!pages.length) { status.textContent = 'No Wikipedia articles found. Try a broader topic or search again.'; return; }
      pages.forEach((page) => {
        const card = document.createElement('article'); card.className = 'research-card';
        if (page.thumbnail?.url) { const image = document.createElement('img'); image.src = page.thumbnail.url; image.alt = ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer'; card.append(image); }
        const body = document.createElement('div'); body.className = 'research-card-body';
        const title = document.createElement('h3'); title.textContent = page.title || page.key || 'Wikipedia article'; body.append(title);
        if (page.description) { const description = document.createElement('p'); description.textContent = page.description; body.append(description); }
        const key = typeof page.key === 'string' ? page.key : '';
        let articleUrl = '';
        if (typeof page.url === 'string' && page.url) { try { const candidate = new URL(page.url, 'https://en.wikipedia.org'); if (candidate.protocol === 'https:' && candidate.hostname === 'en.wikipedia.org') articleUrl = candidate.href; } catch {} }
        if (!articleUrl && key) articleUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(key).replace(/%20/g, '_')}`;
        if (articleUrl) { const link = document.createElement('a'); link.className = 'tool-button primary research-link'; link.href = articleUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Open Article'; body.append(link); }
        card.append(body); results.append(card);
      });
      status.textContent = `${pages.length} Wikipedia result${pages.length === 1 ? '' : 's'} for “${query}”.`;
    } catch (error) {
      if (request !== researchState.request) return;
      const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'tool-button'; retry.textContent = 'Retry'; retry.addEventListener('click', searchResearch);
      results.replaceChildren(retry);
      status.textContent = `Could not search Wikipedia: ${error.message || 'network error'}. Check your connection and retry.`;
    }
  }

  document.addEventListener('click', (event) => {
    const back = event.target.closest('[data-tool-action="back"]');
    if (back) { chessInstance = null; chessRedo = []; selectedSquare = null; legalTargets = []; }
  });
  document.querySelector('#tool-dialog')?.addEventListener('close', () => {
    chessInstance = null;
    chessRedo = [];
    selectedSquare = null;
    legalTargets = [];
    researchState.request += 1;
  });
  const content = document.querySelector('#tool-content');
  if (content) new MutationObserver(() => {
    if (document.querySelector('#chess-board')) startChess();
  }).observe(content, { childList: true });

})();
