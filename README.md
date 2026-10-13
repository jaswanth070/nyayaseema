# NyayaSeema — Customs Shield Pass (Razorpay POC)

Proof of concept of the NyayaSeema arrival journey with **Razorpay payments confirmed by webhook**.
Built with **Next.js (React, TypeScript)** only — no separate backend or database. A webhook needs a
public HTTPS endpoint, so it is implemented as a Next.js route handler rather than a standalone server.

## Journey

```
Arrival: Indian | Foreign  →  Category: Tourist | OCI holder  →  Services
├─ Receipt Scanner            profile → scan receipts → duty summary → pay → signed CustomsQR pass
├─ Legal Assistance           choose lawyer → fill documents → pay (fee + duty → ICEGATE)
├─ Lawyer for ODR             case details + bills → choose lawyer → pay → lawyer ready
└─ Lawyer for Offline         fill document → jurisdiction → lawyer → pay → lawyer assigned
```

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
```

With no keys it runs in **demo mode**: a simulated gateway signs a webhook and POSTs it to
`/api/razorpay/webhook`, so the real verification and state machine are exercised end to end.

### Switch to real Razorpay

1. `cp .env.example .env.local` and fill in `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (test keys first).
2. Razorpay Dashboard → Settings → Webhooks → add `https://<public-host>/api/razorpay/webhook`,
   events `payment.captured`, `payment.failed`, `order.paid`, and set the same secret as `RAZORPAY_WEBHOOK_SECRET`.
   On localhost, expose the port with a tunnel (ngrok, cloudflared).
3. Restart. The checkout button now opens Razorpay Checkout.

## How payments work

1. `POST /api/orders` — the **server prices the order** from the catalogue (the client never sends an amount),
   creates a Razorpay order (`/v1/orders`) and returns the order id + public key id.
2. The browser opens Razorpay Checkout. Its success callback only navigates to `/status/:id`.
3. `POST /api/razorpay/webhook` verifies `X-Razorpay-Signature` (HMAC-SHA256 over the raw body), de-duplicates by
   `X-Razorpay-Event-Id`, checks the amount matches the order, and only then marks it paid. A paid order is terminal.
4. `/status/:id` polls `GET /api/orders/:id` until the webhook has landed, then shows the outcome
   (CustomsQR pass, lawyer connected / ready / assigned, receipt).

`npm run build && npm start`, then `npm run test:webhook` runs 13 checks against the running server
(bad signature, amount mismatch, duplicates, failed → retry → paid, etc.).

## POC limitations (replace before production)

| Area | POC | Production |
| --- | --- | --- |
| Order store | In-memory, lost on restart | DB: orders + processed webhook events |
| ICEGATE | Simulated reference after payment | Needs an ICEGATE-authorised duty payment channel; Razorpay cannot pay ICEGATE directly |
| Receipt scan | Demo extraction (sample items) | Vision/OCR model + FX rate feed |
| Duty rules | Illustrative: ₹50,000 / ₹15,000 allowance, gold 20 g / 40 g, flat 38.5% (`src/lib/duty.ts`) | Statutory Baggage Rules engine |
| Lawyers | Fictitious sample data (`src/lib/catalog.ts`) | Real marketplace + availability |
| Uploads | File names only | Object storage + virus scan |
| Certificate | HMAC-signed (`CERT_SIGNING_SECRET`) | Proper asymmetric signing + verification endpoint |
| Auth | None | Passenger and lawyer accounts |

## Layout

- `src/app/**` — pages (`arrival`, `category`, `services`, `scanner`, `legal-assistance`, `odr`, `offline`, `checkout`, `status/[id]`)
- `src/app/api/**` — `orders`, `razorpay/webhook`, `mock/pay` (demo mode only)
- `src/lib/` — `catalog` (flows, fees, lawyers), `duty`, `pricing`, `razorpay`, `webhook`, `store`, `case` (client state)
- Branding tokens (navy, gold, cream, Georgia serif) and artwork come from the pitch deck: `src/app/globals.css`, `public/brand/`
