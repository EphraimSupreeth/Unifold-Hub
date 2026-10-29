# Part A targeted backup

Before Part A changes, `index.html` included these assets in the document head:

```html
<link rel="stylesheet" href="background-studio.css" />
<link rel="stylesheet" href="theme.css" />
```

And these local scripts at the end of the body:

```html
<script src="new-tools.js"></script>
<script src="color-studio.js"></script>
<script src="chess-research.js"></script>
<script src="background-studio.js"></script>
<script src="script.js"></script>
```

These are the only existing `index.html` lines changed for Part A. Remove the added `part-a-tools.css` stylesheet and `part-a-tools.js` script references to restore the prior integration. No existing JavaScript or CSS file is edited by this Part A change; the new implementation is isolated in `part-a-tools.js` and `part-a-tools.css`.
