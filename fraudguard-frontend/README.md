# SafeSwipe

SafeSwipe is a React + Vite front-end for managing payment links and monitoring transaction risk. It uses Firebase for auth and Firestore for real-time data.

## Features

- Create and share payment links with auto-expiry and one-time use status
- Payment page with simulated card flow and expiry validation (MM/YY)
- Real-time dashboard: completed/review/declined counts, recent transactions, customer totals
- Transactions and customers stored in Firestore; payment link status updates to used/expired
- Auth screens (login/signup) branded as SafeSwipe; signup includes a mock email OTP flow (console logged)

## Tech Stack

- React 19, Vite
- Firebase Auth and Firestore
- Tailwind CSS, Radix UI primitives, Lucide icons

## Setup

1. Install deps

```bash
cd fraudguard-frontend
npm install
```

2. Configure Firebase (public keys are in [src/lib/firebase.js](src/lib/firebase.js)). Update with your project values if needed.

3. Run the app

```bash
npm run dev
```

## Project Structure (key paths)

- App entry: [src/main.jsx](src/main.jsx)
- Dashboard: [src/pages/Dashboard.jsx](src/pages/Dashboard.jsx)
- Payment flow: [src/pages/PaymentPage.jsx](src/pages/PaymentPage.jsx)
- Payment links: [src/pages/PaymentLinks.jsx](src/pages/PaymentLinks.jsx)
- Auth pages: [src/pages/Login.jsx](src/pages/Login.jsx), [src/pages/Signup.jsx](src/pages/Signup.jsx)
- Firebase config: [src/lib/firebase.js](src/lib/firebase.js)

## Notes

- OTP on signup is currently a mock (logs the 6-digit code to the console). Wire it to an email service (e.g., SendGrid/SES/Resend) for production.
- Payment link expiry uses the stored `expiresAt` timestamp; links are marked used after a successful payment.
