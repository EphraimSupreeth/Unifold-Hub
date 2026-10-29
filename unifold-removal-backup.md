# Targeted pre-edit backup

This file preserves the exact portions of the working page and app logic that are being changed for the Favorites / Recently Used removal. The supplied logo image was not present among the workspace files, so the brand markup is not changed in this edit.

## `index.html` — previous brand and navigation

```html
<a class="brand" href="#home" aria-label="Unifold home">
  <span class="brand-mark" aria-hidden="true">
    <svg viewBox="0 0 64 64" role="img"><defs><linearGradient id="unifold-base" x1="10" y1="54" x2="53" y2="8" gradientUnits="userSpaceOnUse"><stop stop-color="#29245f"/><stop offset="1" stop-color="#171d3b"/></linearGradient><linearGradient id="unifold-purple" x1="23" y1="4" x2="43" y2="38" gradientUnits="userSpaceOnUse"><stop stop-color="#7048f5"/><stop offset="1" stop-color="#5138d2"/></linearGradient><linearGradient id="unifold-lilac" x1="34" y1="25" x2="61" y2="41" gradientUnits="userSpaceOnUse"><stop stop-color="#b08aff"/><stop offset="1" stop-color="#a77df5"/></linearGradient></defs><path d="M24 2h16a8 8 0 0 1 8 8v12h8a8 8 0 0 1 8 8v4a8 8 0 0 1-8 8H42v12a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8V42H10a8 8 0 0 1-8-8v-4a8 8 0 0 1 8-8h12V10a8 8 0 0 1 2-8Z" fill="url(#unifold-base)"/><path d="M24 2h16a8 8 0 0 1 8 8v22H30a8 8 0 0 1-8-8V10a8 8 0 0 1 2-8Z" fill="url(#unifold-purple)"/><path d="M40 22h16a8 8 0 0 1 8 8v4a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8v-4a8 8 0 0 1 8-8Z" fill="url(#unifold-lilac)"/><path d="M22 34a8 8 0 0 1 8-8h12v28a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8V42H10a8 8 0 0 1-8-8Z" fill="url(#unifold-base)"/></svg>
  </span>
  <span>Unifold</span>
</a>

<nav class="main-nav" aria-label="Main navigation">
  <a class="main-nav-home" href="#home">Home</a>
  <a href="#utilities-section">Utilities</a>
  <a href="#image-section">Image</a>
  <a href="#audio-section">Audio</a>
  <details class="section-menu">
    <summary>More</summary>
    <div class="section-menu-panel">
      <a href="#pdf-section">PDF &amp; Documents</a>
      <a href="#text-section">Text &amp; OCR Studio</a>
      <a href="#web-section">Web &amp; Link Tools</a>
      <a href="#favorites-section">Favorites</a>
      <a href="#recent-section">Recently Used</a>
      <a href="#about">About</a>
    </div>
  </details>
</nav>
<a class="header-favorites" href="#favorites-section" aria-label="Go to favorites">☆ <span>Favorites</span></a>
```

This targeted backup does not include the unchanged tool-card markup or the complete pre-edit page.

## `script.js` — previous favorites and recent state/helpers

```js
const favoritesSection = document.querySelector('#favorites-section');
const favoritesGrid = document.querySelector('#favorites-grid');
const recentSection = document.querySelector('#recent-section');
const recentGrid = document.querySelector('#recent-grid');
const favoriteStorageKey = 'everyday-tools-favorites';
const recentStorageKey = 'everyday-tools-recent';
const recentLimit = 5;

function readToolList(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(stored)) return [];
    const validNames = new Set(Array.from(toolCards, (card) => card.dataset.name));
    return [...new Set(stored.filter((name) => typeof name === 'string' && validNames.has(name)))];
  } catch { return []; }
}

let favorites = readToolList(favoriteStorageKey);
let recentTools = readToolList(recentStorageKey).slice(0, recentLimit);

function saveToolList(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* Keep the current page usable without storage. */ }
}

function updateFavoriteButton(button, isFavorite) {
  button.textContent = isFavorite ? '★' : '☆';
  button.setAttribute('aria-pressed', String(isFavorite));
  button.setAttribute('aria-label', `${isFavorite ? 'Remove from' : 'Add to'} favorites: ${button.parentElement.dataset.name}`);
  button.title = isFavorite ? 'Remove from favorites' : 'Add to favorites';
}

function addFavoriteButton(card) {
  if (card.querySelector('.favorite-toggle')) return;
  const button = document.createElement('button');
  button.className = 'favorite-toggle';
  button.type = 'button';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const name = card.dataset.name;
    favorites = favorites.includes(name) ? favorites.filter((item) => item !== name) : [...favorites, name];
    saveToolList(favoriteStorageKey, favorites);
    renderToolShelves();
  });
  card.append(button);
  updateFavoriteButton(button, favorites.includes(card.dataset.name));
}

function bindShelfCard(card) {
  addFavoriteButton(card);
  card.addEventListener('click', () => {
    if (card.dataset.name === 'Calculator') openCalculator();
    else openTool(card);
  });
  card.addEventListener('keydown', (event) => {
    if (event.target !== card) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (card.dataset.name === 'Calculator') openCalculator();
      else openTool(card);
    }
  });
}

function renderShelf(grid, section, names) {
  grid.replaceChildren();
  section.hidden = false;
  if (names.length === 0) {
    const message = document.createElement('p');
    message.className = 'empty-state';
    message.textContent = section.id === 'favorites-section' ? 'Save a tool with the star button and it will appear here.' : 'Open a tool to start your recent history.';
    grid.append(message);
  }
  names.forEach((name) => {
    const source = Array.from(toolCards).find((card) => card.dataset.name === name);
    if (!source) return;
    const card = source.cloneNode(true);
    card.hidden = false;
    card.querySelector('.favorite-toggle')?.remove();
    bindShelfCard(card);
    grid.append(card);
  });
}

function renderToolShelves() {
  renderShelf(favoritesGrid, favoritesSection, favorites);
  renderShelf(recentGrid, recentSection, recentTools);
  document.querySelectorAll('.tool-card .favorite-toggle').forEach((button) => {
    updateFavoriteButton(button, favorites.includes(button.parentElement.dataset.name));
  });
}

function recordRecent(name) {
  recentTools = [name, ...recentTools.filter((item) => item !== name)].slice(0, recentLimit);
  saveToolList(recentStorageKey, recentTools);
  renderToolShelves();
}
```
