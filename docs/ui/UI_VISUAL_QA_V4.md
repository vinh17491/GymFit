# UI Visual QA V4

## P16_PUBLIC_VISUAL_QA_PASS (public shell and controls)

- Browser: Codex In-app Browser against the local Vite server at `http://127.0.0.1:5173`.
- Public Home was opened and inspected at `375x812`, `768x1024`, and `1440x900`.
- At all three sizes: no horizontal overflow, header remains within the viewport, hamburger remains visible/clickable, and the public drawer width stays within the requested limit.
- The 375px screenshot was inspected with the drawer open: overlay, tonal surfaces, icon menu items, active Home state, and account group are visible without clipping.
- Drawer interaction verified: hamburger opens, overlay closes, Escape closes, body scroll is restored, focus returns to the hamburger, and the drawer contains Home, Shop, Exercises, Coaches, Videos, Pricing, Blog, About, Kênh người bán, and Dashboard with the source routes.
- Edge hover was intentionally skipped for usability; hamburger remains the primary and predictable open gesture on desktop and touch.
- SPA history verified: drawer Shop navigates to `/products`; browser Back returns to `/`; browser Forward returns to `/products`.
- Public login controls were inspected at `375x812`: email/password controls have dark background, readable primary text, visible border, and muted placeholder; no white-on-white control was observed.
- Browser console contained only existing React Router future-flag warnings; no runtime error was observed for the public shell.

## Protected-page limitation

- The browser had no authenticated test session and no credentials were provided. Opening `/settings` rendered the existing login guard, so authenticated visual verification of Complaint, Seller Application, Referral, Settings, and Member/Coach/Admin/Seller Dashboard content was not possible without transmitting credentials or changing auth state.
- Those pages were reviewed through source and shared styling changes; their API/submit/business flows were not exercised.

## QA result

- Public responsive shell: PASS
- Public drawer interaction: PASS
- Public form-control visibility: PASS
- Authenticated target-page visual QA: NOT RUN — requires a supplied test session
- Full P16 verdict: PARTIALLY_COMPLETE because protected target pages require a supplied test session.

## V5 left-edge hover hardening

- Branch: `fix/vinh-left-edge-hover-hardening`, based on `update-giao-dien-coach`.
- Edge hotspot contract: fixed 12px left rail, desktop-only through `(hover: hover) and (pointer: fine)` plus the 1024px desktop breakpoint. The hamburger remains the primary drawer trigger.
- Source behavior: `button` opens with focus trap and does not auto-close on mouseleave; `edge` opens after 210ms, retains the current input focus, and closes after a 320ms grace period only after both hotspot and drawer are left. Entering the drawer cancels that close timer.
- Route lifecycle: pathname/search/hash changes clear timers and close the drawer without moving focus; Escape, backdrop, close button, and navigation links retain the existing close/focus-return behavior.
- Active matching: Home and account routes use exact matching where needed, while section routes use prefix matching. `/seller/apply` therefore cannot also activate the `/seller` dashboard item.
- Authenticated mobile shell: the topbar now exposes a direct SPA Home link labeled `Về trang chủ GymFit`.
- CSS hardening: the broad `[class*="bg-slate-*"]`, `[class*="text-slate-*"]`, and related border substring bridges were removed. The remaining legacy dark utility bridges are exact selectors mapped to semantic theme variables; `gradient-dark` and `bg-premium` now use the shared tonal palette.

### V5 QA status

- Public responsive matrix: PASS for `375x812`, `768x1024`, and `1440x900`; no horizontal overflow was observed. The edge rail is `display:none` at 375/768 and `display:block` at 1440 with computed width `12px`.
- Hamburger behavior: PASS; the drawer remains open after the button source is opened and the pointer leaves, body scroll lock is applied while open, Escape restores focus to the hamburger, and a SPA navigation to `/products` closes the drawer and restores body scrolling.
- Active state: PASS for `/products`; the drawer Shop link exposes `aria-current="page"` without activating unrelated account routes. Edge open/close mouse movement itself was not directly exercised because this browser runtime did not report `:hover` after its CUA pointer move; source/runtime checks cover the 210ms open and 320ms grace-close implementation without claiming a false interaction pass.
- Authenticated visual QA: `AUTHENTICATED_VISUAL_QA_NOT_RUN` unless a supplied authenticated browser session is available; no auth state is fabricated.
