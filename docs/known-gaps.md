# Known gaps

Intentionally not built yet, or built with a documented stand-in.

| Area | Status | Notes |
|---|---|---|
| Vehicle photos | Built | Hosts upload photos (local disk in development, S3-compatible in production). Sample/seed cars still use placeholders; no image resizing pipeline beyond Next.js image optimisation. |
| Payments | Built (Stripe) | Stripe PaymentIntents + Payment Element; the mock provider remains for development and tests. Needs your Stripe account keys. Tested against stripe-mock, not yet against live Stripe. |
| Owner payouts | Not built | Earnings are reported; transfers to hosts are not automated. |
| Email delivery | Built (SMTP) | Needs your SMTP provider credentials. Tested against Mailpit. |
| Deployment | Built (Docker) | Images, production compose with HTTPS, smoke test in CI. Needs a server, domain and the accounts above; not deployed anywhere yet. |
| Email verification, social login | Not built | Figma shows Google/Facebook buttons; omitted. |
| Favorites, messages, reviews, compare, blog, dealer/agent pages | Not built | Present in the Figma template but outside the rental scope agreed in the plan. Removed from navigation so there are no dead links. |
| Owner approval of bookings | Not needed | Bookings confirm instantly on payment (agreed). |
| Brand-colour contrast | Known issue | White on `#FF7101` is ≈2.9:1 (below WCAG AA 4.5:1 for normal text). Kept to match Figma by decision. |
| Pixel-level Figma comparison | Partial | Screens were compared visually against the frames at 1440px; differences are content adaptations (rental vs. sales copy), the "Car Rental" wordmark, and removed social/login extras. Not measured pixel-by-pixel. |
| Search exclusion by dates | Fine at current scale | Booked vehicle ids are passed to the catalog query; switch to an SQL anti-join if fleets grow to many thousands. |
| Query plans | Indexes added for every filter; not profiled with production-sized data. |
