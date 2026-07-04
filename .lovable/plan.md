Problem: the AI chat widget button is fixed at `bottom-6 right-6` with a 56×56 px circular button. On mobile, the footer’s bottom bar places the “Вход для владельца” link on the right, so it sits under the chat button and becomes hard to tap.

Scope: a single presentation change in the footer bottom bar. No backend, no chat logic changes.

Change:
- In `src/components/site-footer.tsx`, reorder the bottom bar so the owner login link is on the left and the copyright text is on the right.
- Keep the same row on desktop (`justify-between`), and ensure the right-side text has enough safe clearance from the chat button on mobile by adding a small right padding reserve on the copyright span or by stacking gracefully when space is tight (`flex-wrap`).
- Preserve existing colors, font sizes, and hover state.

Implementation detail:
```text
before: [copyright] ............................ [login]
after:  [login] .................................. [copyright]
        ^ safe, away from fixed chat button      ^ may sit near chat button but is non-interactive
```

Verification: open the preview in mobile viewport, scroll to the footer, and confirm the “Вход для владельца” link is fully visible and tappable on the left side.