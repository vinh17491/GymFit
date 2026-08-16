# UI visual QA report

## Pages checked

- Complaint views for buyer, seller and admin.
- Seller Application.
- Referral Program.
- Settings and password dialog.
- Shared-pattern Profile, Members, Support Tickets and Loyalty pages.

## Viewports

| Viewport | Responsive layout review | Browser measurement |
| --- | --- | --- |
| 375x812 | Single-column forms/cards; full-width mobile CTAs; referral action stacks; complaint panes stack. | Login shell: document width 375, no horizontal overflow, no clipped interactive controls. |
| 768x900 | Seller/Complaint forms move to two columns; cards keep readable gaps; no fixed-width form controls. | Login shell: document width 768, no horizontal overflow, no clipped interactive controls. |
| 1440x1000 | Complaint form uses three columns; Settings uses profile/security columns; content remains max-width constrained. | Login shell: document width 1440, no horizontal overflow, no clipped interactive controls. |

## Issues found and fixed

- Restored missing global definitions for `input`, `input-field`, `btn-*`, `card`, `page-title`, `section-title` and `stat-card`.
- Added explicit dark backgrounds, readable text/placeholders/select options, visible borders/focus rings, autofill protection and legible disabled/read-only states.
- Added persistent labels and label associations to shared Input, Complaint, Seller Application, Referral and Support Ticket controls.
- Prevented Referral link/action squeeze on mobile by making the Input wrapper flexible and stacking the CTA.
- Grouped Seller fields into business, contact and operations sections with desktop/mobile column behavior.
- Added polished Complaint list/detail/empty states, visible warning treatment and styled admin action controls without changing actions.
- Clarified Settings profile/security hierarchy and retained the existing focus trap, Escape handling and submit rules.

## Remaining visual limitations

- The in-app browser reached the local frontend, but protected routes redirected to Login. The documented seed login reached the backend and returned HTTP 500 while creating the auth session. That backend/runtime issue is outside this UI-only scope, so authenticated screenshots and live focus/action checks for the four protected target pages remain pending.
- Production build reports the existing large JavaScript chunk warning; build output is otherwise successful.

## Verdict

`P5_VISUAL_QA_PARTIAL`
