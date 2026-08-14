# Delizza public website

Next.js public client for `appId: d_lizza`, backed by the existing WLHORIZON Firebase project and Functions.

## Runtime configuration

Use `.env.example` as the non-secret template. Production must provide:

- Firebase public browser variables: `NEXT_PUBLIC_FIREBASE_*`
- `NEXT_PUBLIC_WL_APP_ID=d_lizza`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` from the existing live Stripe account
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` for Firebase App Check
- `NEXT_PUBLIC_COMING_SOON=true` until real acceptance testing is complete
- server-side Firebase Admin variables only in private deployment environment storage

Never commit Stripe secret keys, webhook secrets, Firebase service account keys, tokens, or private keys.

## Checkout invariants

- The catalogue and cart are displayed client-side, but `createOrder` recalculates prices server-side.
- The checkout attempt key is stored in `sessionStorage` and is tied to cart, pickup slot, customer profile, and reward usage.
- Changing cart, slot, or essential order data produces a different idempotency fingerprint.
- The public web checkout sends only scheduled V2 pickup payloads from `previewContinuousPickupWindows`.
- Stripe payment uses the existing WLHORIZON `createPaymentIntent` Function and signed `stripeWebhook`.
- The confirmation page reads the backend order/payment status; URL parameters are never proof of payment.

## Coming Soon

`NEXT_PUBLIC_COMING_SOON=true` keeps the public site locked. The middleware still allows:

- static assets, robots, sitemap, and the maintenance page
- `/auth?mode=resetPassword&oobCode=...` so Firebase password reset links work
- `/order-confirmation` so Stripe browser returns can be inspected during recette

Do not remove Coming Soon before manual real-world acceptance testing.

## External checks before recette

Firebase Console:

- Authorized domains include the public Delizza domain.
- Password reset email template, sender, language, action URL, and redirect domain are correct.
- App Check and reCAPTCHA Enterprise are enabled for the web app.
- Firestore Rules and required indexes are deployed.
- Production Functions variables/secrets are set in Firebase, not in Git.

Stripe Dashboard live:

- Publishable key used by the site matches the live account used by `STRIPE_SECRET_KEY`.
- The existing webhook endpoint points to WLHORIZON `stripeWebhook`.
- Webhook signature secret is configured.
- PaymentIntents from the site contain `orderId`, `appId: d_lizza`, and the expected metadata.
- No test/live key mix exists.
- Retries do not create duplicate active PaymentIntents for one order.
