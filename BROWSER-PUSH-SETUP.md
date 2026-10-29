# Browser push deployment notes

## Current implementation status

This workspace is a static HTML/CSS/JavaScript site. It contains no Vercel Function/API routes, database, authentication, server-side environment configuration, VAPID key, or existing push subscription endpoint. Therefore **real background Web Push delivery is not enabled**. The page deliberately does not create a subscription or show an enabled state.

The frontend provides an explicit permission button, accurate permission status, and a local notification test after permission has been granted. The test only verifies this browser/device can display a local notification; it does not verify push delivery while the site is closed. The root-scoped service worker is prepared to receive push events and safely open only same-origin destinations, but no sender can currently deliver an event to it.

## Minimum backend needed before enabling real push

Recommended fit for the current Vercel deployment:

1. Add Vercel serverless functions under `/api/push/` for configuration, subscription creation/deletion, and authorized sending.
2. Use a database (a free-tier Supabase/Postgres project is one option) to store Push API subscription endpoint, `p256dh` and `auth` keys, creation time, and a revocable ownership token. Treat the full subscription as sensitive; never put it in local storage or logs.
3. Generate a VAPID key pair. Keep the private key server-only. Deliver the public key to the browser from a same-origin API endpoint; it is not a secret.
4. Use a server-side Web Push implementation (for example, the standard `web-push` package in a Node Vercel Function) to sign and encrypt messages. Restrict the send function to trusted authenticated server events, validate payloads and same-origin destinations, cap payload sizes, and rate-limit subscription operations. Never expose an unrestricted anonymous send endpoint.
5. Delete/unlink subscriptions on unsubscribe. Remove subscriptions after push service responses such as HTTP 404/410. Return explicit errors when required configuration or storage is unavailable.
6. Decide whether anonymous installation subscriptions are appropriate. Without site accounts, provide a random revocation token held only by the client and require it for deletion; this does not authorize sending. Do not associate file contents or tool inputs with notifications.

No backend, database, package, endpoint, or secret was added in this change. Do not interpret the service worker or local test as actual background delivery.

## Vercel environment variables (for the future server implementation)

Add variables in the **existing Vercel project** under **Settings → Environment Variables**, scoped to Production and Preview as intended, then redeploy. Suggested server-only names:

- `VAPID_PUBLIC_KEY` — public key, exposed to the browser only through a same-origin API response.
- `VAPID_PRIVATE_KEY` — private signing key; server-only, never use a `NEXT_PUBLIC_`/client-exposed prefix.
- `VAPID_SUBJECT` — a `mailto:` contact or valid site URL used for VAPID identification.
- `PUSH_DATABASE_URL` and any database service credential required by the chosen storage layer — server-only.

These are documentation names only; this static project currently reads none of them. Never commit populated `.env` files. Missing configuration must make API setup fail with a clear error and must not report notifications as enabled.

## Manual deployment checks still required

After deploying to the existing HTTPS Vercel domain, verify `/service-worker.js` returns JavaScript (not the HTML fallback), `navigator.serviceWorker.register('/service-worker.js', {scope: '/'})` has scope `/`, and the worker can display the local test notification after explicit permission. Real background push, persistence, delivery, expiry cleanup, and unsubscribe verification require the backend described above and cannot be tested from this static workspace.
