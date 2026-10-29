(() => {
  if (window.notify) return;

  const icons = {
    success: '✓', error: '!', warning: '⚠', info: 'i', loading: '', validation: '•', completion: '✓'
  };
  const labels = {
    success: 'Success', error: 'Error', warning: 'Warning', info: 'Information',
    loading: 'In progress', validation: 'Check your input', completion: 'Complete'
  };
  const defaults = { success: 4200, error: 0, warning: 6500, info: 4800, loading: 0, validation: 5000, completion: 5200 };
  const maxVisible = 4;
  const active = new Map();
  const queue = [];
  const recent = new Map();
  let host;
  let sequence = 0;

  function ensureHost() {
    if (host?.isConnected) return host;
    host = document.createElement('div');
    host.className = 'notification-stack';
    host.setAttribute('aria-label', 'Notifications');
    document.body.append(host);
    return host;
  }

  function clearTimer(item) {
    if (item.timer) clearTimeout(item.timer);
    item.timer = null;
  }

  function removeItem(item) {
    clearTimer(item);
    active.delete(item.id);
    const node = item.node;
    if (node) {
      node.classList.add('notification-exit');
      setTimeout(() => node.remove(), 160);
    }
    promote();
  }

  function makeNode(item) {
    const card = document.createElement('section');
    card.className = `app-notification notification-${item.type}`;
    card.setAttribute('role', item.type === 'error' && item.persistent ? 'alert' : 'status');
    card.setAttribute('aria-live', item.type === 'error' && item.persistent ? 'assertive' : 'polite');
    card.dataset.notificationId = item.id;

    const symbol = document.createElement('span');
    symbol.className = `notification-icon${item.type === 'loading' ? ' is-loading' : ''}`;
    symbol.setAttribute('aria-hidden', 'true');
    symbol.textContent = icons[item.type];

    const content = document.createElement('div');
    content.className = 'notification-content';
    const title = document.createElement('strong');
    title.className = 'notification-title';
    title.textContent = item.title || labels[item.type];
    const message = document.createElement('p');
    message.className = 'notification-message';
    message.textContent = item.message;
    content.append(title, message);

    const controls = document.createElement('div');
    controls.className = 'notification-controls';
    if (item.action && typeof item.action.onClick === 'function') {
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'notification-action';
      action.textContent = item.action.label || 'Action';
      action.addEventListener('click', () => {
        try { item.action.onClick(); } catch (error) { console.error('Notification action failed:', error); }
      });
      controls.append(action);
    }
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'notification-dismiss';
    close.setAttribute('aria-label', `Dismiss ${item.title || labels[item.type]} notification`);
    close.textContent = '×';
    close.addEventListener('click', () => removeItem(item));
    controls.append(close);
    card.append(symbol, content, controls);
    card.addEventListener('mouseenter', () => clearTimer(item));
    card.addEventListener('mouseleave', () => startTimer(item));
    card.addEventListener('focusin', () => clearTimer(item));
    card.addEventListener('focusout', (event) => {
      if (!card.contains(event.relatedTarget)) startTimer(item);
    });
    item.node = card;
    return card;
  }

  function startTimer(item) {
    clearTimer(item);
    if (item.duration > 0 && !item.persistent && active.has(item.id)) {
      item.timer = setTimeout(() => removeItem(item), item.duration);
    }
  }

  function promote() {
    while (queue.length && active.size < maxVisible) {
      const item = queue.shift();
      if (!item.dismissed) display(item);
    }
  }

  function display(item) {
    active.set(item.id, item);
    ensureHost().append(makeNode(item));
    startTimer(item);
  }

  function show(type, message, options = {}) {
    try {
      options = options && typeof options === 'object' ? options : {};
      if (!document.body) return `notification-${++sequence}`;
      const text = String(message ?? '').trim();
      if (!text) return '';
      const now = Date.now();
      const dedupeKey = options.dedupeKey || `${type}:${options.title || ''}:${text}`;
      const previous = recent.get(dedupeKey);
      if (previous && now - previous.time < 1200) return previous.id;
      const id = options.id || `unifold-notification-${++sequence}`;
      const item = {
        id, type, message: text, title: options.title || '',
        duration: options.duration ?? defaults[type],
        persistent: options.persistent ?? (type === 'error' && options.duration === undefined),
        action: options.action, timer: null, node: null, dismissed: false
      };
      recent.set(dedupeKey, { id, time: now });
      for (const [key, entry] of recent) if (now - entry.time > 10000) recent.delete(key);
      if (active.has(id)) {
        update(id, { type, message: text, title: item.title, duration: item.duration, persistent: item.persistent, action: item.action });
        return id;
      }
      if (active.size < maxVisible) display(item);
      else queue.push(item);
      return id;
    } catch (error) {
      console.error('Unable to display notification:', error);
      return '';
    }
  }

  function update(id, changes = {}) {
    changes = changes && typeof changes === 'object' ? changes : {};
    const item = active.get(id) || queue.find((entry) => entry.id === id);
    if (!item) return false;
    Object.assign(item, changes);
    item.type = changes.type || item.type;
    if (item.node) {
      const previousNode = item.node;
      const replacement = makeNode(item);
      previousNode.replaceWith(replacement);
      startTimer(item);
    }
    return true;
  }

  function dismiss(id) {
    const visible = active.get(id);
    if (visible) { removeItem(visible); return true; }
    const index = queue.findIndex((item) => item.id === id);
    if (index >= 0) { queue[index].dismissed = true; queue.splice(index, 1); return true; }
    return false;
  }

  window.notify = Object.freeze({
    success: (message, options) => show('success', message, options),
    error: (message, options) => show('error', message, options),
    warning: (message, options) => show('warning', message, options),
    info: (message, options) => show('info', message, options),
    loading: (message, options) => show('loading', message, { ...options, duration: 0, persistent: true }),
    validation: (message, options) => show('validation', message, options),
    completion: (message, options) => show('completion', message, options),
    update, dismiss
  });
})();
