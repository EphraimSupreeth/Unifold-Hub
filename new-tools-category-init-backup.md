# Backup: `new-tools.js` category initialization

Saved before the targeted initialization fix.

```js
(() => {
  const categories = {
    design: ['Design Tools', 'Color, typography, gradients, and vector utilities'],
    developer: ['Developer Tools', 'Format, inspect, and generate common developer data'],
    security: ['Security Tools', 'Generate sensitive values locally; never save them'],
    learning: ['Learning & Reference', 'Locally stored keyboard shortcut reference']
  };
  const tools = [
    ['Color Palette Studio','design','Generate harmonious palettes, lock colors, and export CSS.','color hex rgb hsl complementary analogous triadic monochromatic random'],
    ['Font Pairing Playground','design','Preview system-font pairings and export the selected CSS.','font typography heading body size weight line height letter spacing'],
    ['Image Color Picker','image','Pick pixel colors from an image using the browser canvas.','image pixel eyedropper sample color hex rgb hsl'],
    ['CSS Gradient Generator','design','Build linear or radial gradients with editable color stops.','css background linear radial gradient angle color stop'],
    ['CSS Shadow Generator','design','Tune a box shadow visually and copy its CSS.','css box shadow inset blur spread opacity color'],
    ['Favicon Generator','image','Create common favicon image sizes from an uploaded image.','favicon icon png resize website'],
    ['SVG Optimizer & Viewer','design','Safely preview and clean SVG markup in this browser.','svg vector optimize sanitize viewer'],
    ['JSON Formatter & Validator','developer','Validate, format, or minify JSON.','json parse pretty print minify syntax'],
    ['Regex Tester','developer','Test JavaScript regular expressions with match highlighting.','regex regexp regular expression pattern groups flags'],
    ['UUID Generator','developer','Generate cryptographically random UUID v4 values.','uuid guid unique random'],
    ['Cron Expression Builder','developer','Build five-field cron expressions with a plain-language summary.','cron schedule scheduler minutes hours days month weekday'],
    ['Markdown Editor & Preview','text','Edit Markdown and preview a safe HTML rendering.','markdown md preview editor headings lists links tables code'],
    ['ASCII Art Generator','text','Turn short text into readable text banners.','ascii art banner text font block'],
    ['Text Diff Checker','text','Compare two texts line by line.','diff compare original modified changes additions deletions'],
    ['Secure Password Generator','security','Generate random passwords or passphrases with browser crypto.','password passphrase secure random generator'],
    ['Keyboard Shortcut Explorer','learning','Browse a built-in reference of common keyboard shortcuts.','keyboard shortcut hotkey windows mac linux browser editor'],
    ['Focus Session Planner','utilities','Plan focus and break sessions with an elapsed-time countdown.','pomodoro focus timer break work productivity'],
    ['Team & Group Generator','utilities','Randomly split participants into balanced teams.','team group random split participants people'],
    ['Aspect Ratio Calculator','utilities','Calculate image and video dimensions without distortion.','aspect ratio width height dimensions 16:9 4:3'],
    ['Time Zone Meeting Planner','utilities','Compare local times across time zones using browser time-zone data.','timezone time zone meeting cities daylight saving schedule']
  ];
  window.UNIFOLD_TOOL_CATEGORIES = Object.fromEntries(tools.map(([name, category]) => [name, category]));
  window.UNIFOLD_CATEGORY_LABELS = Object.fromEntries(Object.entries(categories).map(([key, [label]]) => [key, label]));

  const sectionIds = { design: 'design-section', developer: 'developer-section', security: 'security-section', learning: 'learning-section' };
  const toolsGrid = document.querySelector('#tool-grid');
  const filters = document.querySelector('.filters');
  const sectionMenu = document.querySelector('.section-menu-panel');
  const mobileMenu = document.querySelector('#mobile-section-menu');
  Object.entries(categories).forEach(([key, [label, description]]) => {
    const filter = document.createElement('button');
    filter.className = 'filter-button'; filter.type = 'button'; filter.dataset.filter = key;
    filter.setAttribute('aria-pressed', 'false'); filter.textContent = label; filters.append(filter);
    const section = document.createElement('section');
    section.className = 'tool-category-section'; section.id = sectionIds[key]; section.dataset.toolSection = key;
    section.innerHTML = `<div class="shelf-heading"><h3>${label}</h3><span>${description}</span></div><div class="tool-grid" data-category-grid="${key}"></div>`;
    document.querySelector('#web-section').after(section);
    [[sectionMenu, `#${sectionIds[key]}`],[mobileMenu, `#${sectionIds[key]}`]].forEach(([menu, href]) => {
      if (!menu) return;
      const link = document.createElement('a'); link.href = href; link.textContent = label; menu.append(link);
    });
  });
  tools.forEach(([name, category, description, keywords], index) => {
    const card = document.createElement('article');
    card.className = 'tool-card'; card.dataset.name = name; card.dataset.category = category; card.dataset.keywords = keywords;
    card.innerHTML = `<div class="card-top"><span class="tool-icon ${['icon-violet','icon-blue','icon-cyan','icon-indigo'][index % 4]}">${icons[category] || icons.utilities}</span><span class="coming-soon">Open Tool →</span></div><h3>${name}</h3><p>${description}</p>`;
    toolsGrid.append(card);
  });
```

The backup records the affected category construction and append path; no other code was changed here.
