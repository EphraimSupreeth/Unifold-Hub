/* Root-scoped notification worker. No caches or offline behavior are changed. */
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let payload = {};
    try {
      if (event.data) {
        const raw = event.data.text();
        try {
          const parsed = JSON.parse(raw);
          payload = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        } catch {
          payload = { body: raw };
        }
      }
    } catch {
      payload = {};
    }

    const title = typeof payload.title === 'string' && payload.title.trim()
      ? payload.title.trim().slice(0, 80)
      : 'Unifold Hub';
    const body = typeof payload.body === 'string' && payload.body.trim()
      ? payload.body.trim().slice(0, 240)
      : 'You have a notification.';
    let target = new URL('/', self.location.origin).href;
    if (typeof payload.url === 'string') {
      try {
        const candidate = new URL(payload.url, self.location.origin);
        if (candidate.origin === self.location.origin && candidate.protocol === self.location.protocol) {
          target = candidate.href;
        }
      } catch {
        // Ignore malformed destinations and use the site home page.
      }
    }
    const tag = typeof payload.id === 'string' && /^[\w-]{1,64}$/.test(payload.id)
      ? `unifold-${payload.id}`
      : 'unifold-push';

    await self.registration.showNotification(title, {
      body,
      tag,
      data: { url: target },
      renotify: false
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    let target = new URL('/', self.location.origin);
    try {
      const candidate = new URL(event.notification.data?.url || '/', self.location.origin);
      if (candidate.origin === self.location.origin && candidate.protocol === self.location.protocol) target = candidate;
    } catch {
      // Use the safe same-origin home URL.
    }
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      try {
        if (typeof client.navigate === 'function') await client.navigate(target.href);
        return await client.focus();
      } catch {
        // Continue searching for a usable same-origin window, or open one below.
      }
    }
    return self.clients.openWindow(target.href);
  })());
});
