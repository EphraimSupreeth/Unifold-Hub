# QR Code Designer change backup

Before the QR Designer update, the existing QR generator card was:

```html
<article class="tool-card" data-name="QR Code Generator" data-category="utilities" data-keywords="qr code barcode scan link url share generate">
  …
  <h3>QR Code Generator</h3><p>Turn a link or a little bit of information into a scannable code.</p>
</article>
```

The existing `script.js` tool registration used these entries:

```js
'QR Code Generator': 'web',
'QR Code Generator': renderQr,
```

These are the complete original snippets touched by this update, preserved here for a focused rollback. The separate QR Code Scanner registration and implementation are not changed. New files for the designer can be removed to roll back the added UI and styles.
