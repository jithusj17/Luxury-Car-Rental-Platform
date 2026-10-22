# Known gaps

Intentionally not built yet, or built with a documented stand-in.

| Area | Status | Notes |
|---|---|---|
| Vehicle photos | Placeholders | `VehicleImage` keeps every aspect ratio; `imageUrls` is in the data model and API. Needs licensed images, upload endpoint (type/size validation), object storage, and `images.remotePatterns` in `next.config.ts`. |
| Real payment provider | Mock provider | Implement `PaymentProvider` (e.g. Stripe PaymentIntents + hosted fields), set its webhook secret, remove the mock card step from checkout. |
| Owner payouts | Not built | Earnings are reported; transfers to hosts are not automated. |
| Email delivery | Logged only | Swap `createLogEmailSender` for an SMTP/API sender. |
| Email verification, social login | Not built | Figma shows Google/Facebook buttons; omitted. |
| Favorites, messages, reviews, compare, blog, dealer/agent pages | Not built | Present in the Figma template but outside the rental scope agreed in the plan. Removed from navigation so there are no dead links. |
| Owner approval of bookings | Not needed | Bookings confirm instantly on payment (agreed). |
| Brand-colour contrast | Known issue | White on `#FF7101` is ≈2.9:1 (below WCAG AA 4.5:1 for normal text). Kept to match Figma by decision. |
| Pixel-level Figma comparison | Partial | Screens were compared visually against the frames at 1440px; differences are content adaptations (rental vs. sales copy), the "Car Rental" wordmark, and removed social/login extras. Not measured pixel-by-pixel. |
| Search exclusion by dates | Fine at current scale | Booked vehicle ids are passed to the catalog query; switch to an SQL anti-join if fleets grow to many thousands. |
| Query plans | Indexes added for every filter; not profiled with production-sized data. |
