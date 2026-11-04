# Redrive — Web-Based Car Rental System

MERN platform that connects renters with licensed rental companies in Palestine.

## Structure
- `server/` Node.js + Express + MongoDB (Mongoose), JWT, Socket.io, uploads (multer)
- `client/` React (Vite) — Arabic RTL UI built from the Figma design
- `ml/` price estimation model: `train_price_model.py` (scikit-learn) exports `price_model.json`, which the backend evaluates

## Run (development)
```bash
cd server && npm install && npm run dev     # API on http://localhost:5050
cd client && npm install && npm run dev     # Web on http://localhost:5173
```
Without `MONGO_URI` the API starts an in-memory MongoDB and fills it with test data (reset on every restart).

## Configuration
Copy `server/.env.example` to `server/.env`:
- `MONGO_URI` — MongoDB Atlas connection string
- `SMTP_*` — email provider (otherwise emails are printed in the server console)
- `SHOW_DEV_CODES=true` — OTP codes are shown on screen for testing; set `false` in production

- `STRIPE_SECRET_KEY` — Stripe test key (`sk_test_...`); empty = built-in payment simulation
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` — SMS for OTP codes (otherwise printed in the console)

`client/.env`:
- `VITE_GOOGLE_MAPS_KEY` — Google Maps JavaScript API key
- `VITE_STRIPE_PUBLISHABLE_KEY` — Stripe test publishable key (`pk_test_...`)

Payments: with Stripe the renter is charged when sending the request; refunds go through the Stripe Refund API. Payouts to companies are recorded in the platform (Stripe Connect is not available to merchants in Palestine).

## Test accounts (seed data, password `Test1234!`)
| Role | Email |
|---|---|
| Admin | admin@redrive.ps |
| Rental company | najma@redrive.ps, riyada@redrive.ps, sahel@redrive.ps |
| Renter (verified) | omar@redrive.ps, layan@redrive.ps |
| Renter (pending review) | yousef@redrive.ps |

Sandbox card: any number like `4242 4242 4242 4242`; numbers ending in `0002` are declined.

## Business rules (from the design)
- Renter pays the full amount online; it is held by the gateway.
- Company must respond within 12 hours, otherwise the request is rejected and refunded automatically.
- Accepting a request auto-rejects overlapping pending requests.
- Renter cancellation: free before acceptance and for 6 hours after; then 60% is retained.
- Company cancels a confirmed rental → full refund.
- Company confirms pick-up → payment transferred to the company minus 10% commission.
- No-show (2 hours after start) → 60% retained.
- Rental contract is signed at the company office.
