# NyayaSeema — Customs Shield Pass (Razorpay POC)

Proof of concept of the NyayaSeema arrival journey with **Razorpay payments verified server-side (no webhook)**.
Built with **Next.js (React, TypeScript)** only — no separate backend or database.

## Journey

```
Arrival: Indian | Foreign  →  Category: Tourist | OCI holder  →  Services
├─ Item Scanner               FREE, no forms: scan item → duty summary
├─ Legal Assistance           choose lawyer → fill documents → pay (fee + duty → ICEGATE)
├─ Lawyer for ODR             case details + bills → choose lawyer → pay → lawyer ready
└─ Lawyer for Offline         fill document → jurisdiction → lawyer → pay → lawyer assigned
```

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
```

With no keys it runs in **demo mode**: a simulated gateway returns a signed payment result that goes through
the same server-side verification as a real Razorpay payment.

## Pricing

Every lawyer service (Legal Assistance, ODR, Offline) costs a flat **₹999 NyayaSeema platform fee + the lawyer's fee**
(`PLATFORM_FEE` in `src/lib/catalog.ts`). Legal Assistance also collects the declared duty. The Item Scanner is free.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `RAZORPAY_KEY_ID` | for live payments | Razorpay API key id (`rzp_test_…` / `rzp_live_…`) |
| `RAZORPAY_KEY_SECRET` | for live payments | Razorpay API key secret. Server only; never exposed to the browser |
| `SIGNING_SECRET` | recommended | Long random string that signs order and receipt tokens. Falls back to `RAZORPAY_KEY_SECRET` |

**There is no webhook and no `RAZORPAY_WEBHOOK_SECRET`.** On Vercel: Project → Settings → Environment Variables,
add the three above for Production (and Preview if needed), then **redeploy** — env changes only apply to new deployments.
Without the Razorpay keys the deployed site stays in demo mode.

## How payments work (no webhook)

1. `POST /api/orders` — the **server prices the order** from the catalogue (the client never sends an amount),
   creates a Razorpay order (`/v1/orders`) and returns the public key id plus an HMAC-signed `orderToken`
   holding the order details.
2. The browser opens Razorpay Checkout. On success Razorpay hands the browser
   `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`.
3. `POST /api/payments/verify` checks `HMAC-SHA256("<order_id>|<payment_id>", key_secret)` against the signature,
   and that the order id matches the signed `orderToken`. Only then does it issue a signed receipt token.
4. `/receipt?t=…` verifies the token via `GET /api/receipt` and shows the outcome (lawyer connected /
   ready / assigned, receipt).

The app is **stateless** (signed tokens instead of a database), so it works on Vercel's serverless functions.

`npm run build && npm start` (no Razorpay keys), then `npm run test:payment` runs 14 checks: forged or swapped
signatures, tampered tokens, a payment replayed against another order, receipt integrity, and more.

## POC limitations (replace before production)

| Area | POC | Production |
| --- | --- | --- |
| Order state | Signed tokens, no database; a verified payment can be replayed to mint another receipt for the same payment | DB with a unique constraint on `payment_id`; reconcile with Razorpay's payments API or a webhook |
| ICEGATE | Simulated reference after payment | Needs an ICEGATE-authorised duty payment channel; Razorpay cannot pay ICEGATE directly |
| Receipt scan | Demo extraction (sample items) | Vision/OCR model + FX rate feed |
| Duty rules | Illustrative: ₹50,000 / ₹15,000 allowance, gold 20 g / 40 g, flat 38.5% (`src/lib/duty.ts`) | Statutory Baggage Rules engine |
| Lawyers | Fictitious sample data (`src/lib/catalog.ts`) | Real marketplace + availability |
| Uploads | File names only | Object storage + virus scan |
| Certificate | HMAC-signed (`CERT_SIGNING_SECRET`) | Proper asymmetric signing + verification endpoint |
| Auth | None | Passenger and lawyer accounts |

## Layout

- `src/app/**` — pages (`arrival`, `category`, `services`, `scanner`, `legal-assistance`, `odr`, `offline`, `checkout`, `receipt`)
- `src/app/api/**` — `orders`, `payments/verify`, `receipt`, `mock/pay` (demo mode only)
- `src/lib/` — `catalog` (flows, fees, lawyers), `duty`, `pricing`, `razorpay` (verification + signed tokens), `order`, `case` (client state)
- Branding tokens (navy, gold, cream, Georgia serif) and artwork come from the pitch deck: `src/app/globals.css`, `public/brand/`
