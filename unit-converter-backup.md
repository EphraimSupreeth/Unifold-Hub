# Unit Converter backup (before Part B update)

Affected original code from `script.js`:

```js
const unitSets = {
  length: { mm: ['Millimeters', 0.001], cm: ['Centimeters', 0.01], m: ['Meters', 1], km: ['Kilometers', 1000], in: ['Inches', 0.0254], ft: ['Feet', 0.3048], mi: ['Miles', 1609.344] },
  mass: { mg: ['Milligrams', 0.000001], g: ['Grams', 0.001], kg: ['Kilograms', 1], lb: ['Pounds', 0.45359237] },
  temperature: { C: ['Celsius'], F: ['Fahrenheit'], K: ['Kelvin'] },
  time: { s: ['Seconds', 1], min: ['Minutes', 60], h: ['Hours', 3600], d: ['Days', 86400] }
};

function renderConverter() {
  return `<div class="tool-form-grid">
    <label class="tool-field">Category<select class="tool-select" id="unit-category"><option value="length">Length</option><option value="mass">Mass</option><option value="temperature">Temperature</option><option value="time">Time</option></select></label>
    <label class="tool-field">Value<input class="tool-input" id="unit-value" type="number" step="any" value="1" inputmode="decimal"></label>
    <label class="tool-field">From<select class="tool-select" id="unit-from"></select></label>
    <label class="tool-field">To<select class="tool-select" id="unit-to"></select></label>
  </div><div class="tool-actions"><button class="tool-button" type="button" data-tool-action="swap-units">⇄ Swap units</button></div><div class="tool-result" id="unit-result" aria-live="polite"></div>`;
}

function updateConverterUnits() {
  const from = document.querySelector('#unit-from');
  const to = document.querySelector('#unit-to');
  const keys = Object.keys(unitSets[converterCategory]);
  const oldFrom = from.value || keys[0];
  const oldTo = to.value || keys[1] || keys[0];
  from.innerHTML = unitOptions(converterCategory, keys.includes(oldFrom) ? oldFrom : keys[0]);
  to.innerHTML = unitOptions(converterCategory, keys.includes(oldTo) ? oldTo : (keys[1] || keys[0]));
}

function updateConverter() {
  const input = document.querySelector('#unit-value');
  if (!input) return;
  const value = Number(input.value);
  if (input.value.trim() === '' || !Number.isFinite(value)) {
    document.querySelector('#unit-result').textContent = 'Enter a valid number to convert.';
    return;
  }
  const from = document.querySelector('#unit-from').value;
  const to = document.querySelector('#unit-to').value;
  let result;
  if (converterCategory === 'temperature') {
    const celsius = from === 'C' ? value : from === 'F' ? (value - 32) * 5 / 9 : value - 273.15;
    result = to === 'C' ? celsius : to === 'F' ? celsius * 9 / 5 + 32 : celsius + 273.15;
  } else {
    result = value * unitSets[converterCategory][from][1] / unitSets[converterCategory][to][1];
  }
  const precision = Number(result.toPrecision(10));
  const fromName = unitSets[converterCategory][from][0];
  const toName = unitSets[converterCategory][to][0];
  document.querySelector('#unit-result').textContent = `${value} ${fromName} = ${precision} ${toName}`;
}
```

Restore these snippets in `script.js` to revert the converter-specific changes. No other source files were altered for this Part B update.