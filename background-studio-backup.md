# Background Studio change backup

Targeted recovery snapshot created before editing `index.html`.

## Original stylesheet references in `index.html`

```html
    <link rel="stylesheet" href="color-studio.css" />
    <link rel="stylesheet" href="theme.css" />
```

## Original script references in `index.html`

```html
    <script src="color-studio.js"></script>
    <script src="chess-research.js"></script>
    <script src="script.js"></script>
```

To revert the integration, remove only the `background-studio.css` link and `background-studio.js` script reference. Existing website files and features are otherwise untouched.