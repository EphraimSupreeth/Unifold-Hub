# Backup: obsolete Favorites / Recently Used references in `script.js`

Saved before editing. These are the affected snippets from the current file.

```js
// Favorites and Recently Used shelves were removed from the interface.
function renderToolShelves() {}
function recordRecent() {}
```

```js
function openCalculator() {
  recordRecent('Calculator');
  calculatorDialog.showModal();
```

```js
function openTool(card) {
  toolOpener = card;
  activeTool = card.dataset.name;
  recordRecent(activeTool);
```

```js
const homeShelves = document.querySelector('#home-shelves');
homeShelves.append(favoritesSection, recentSection);
organizeToolSections();
toolCards.forEach(addFavoriteButton);
renderToolShelves();
if (activeCategory === 'all') updateTools();

document.querySelector('#clear-recent').addEventListener('click', () => {
  recentTools = [];
  saveToolList(recentStorageKey, recentTools);
  renderToolShelves();
});
```

```js
document.querySelectorAll('.main-nav a, .section-menu-panel a, .mobile-section-menu a, .header-favorites').forEach((link) => {
```

```js
const sectionLinks = document.querySelectorAll('.main-nav a, .section-menu-panel a, .mobile-section-menu a, .header-favorites');
```
