---
name: accessibility-runtime-review
description: Review and retest web UI accessibility through browser interaction, keyboard journeys, focus checks and code evidence. Use for accessibility reviews of running interfaces or UI changes and PR verification summaries; supports a source-only fallback when runtime access is unavailable.
---

# Accessibility runtime review

Help developers find accessibility issues during implementation. Target WCAG 2.2 A and AA unless the user specifies another target. Review actual user journeys and relevant shared components, without expanding a focused review into an unrelated whole-site audit.

Developers are not expected to use a screen reader for this workflow. Verify keyboard behaviour, rendered semantics and accessibility implementation with the tools available. Actual screen-reader speech remains unverified unless directly tested; never infer it from ARIA, accessibility snapshots or screenshots.

## Establish scope and access

- Use the supplied story, diff, component, URL or issue description. For a numbered retest, read the original issue and acceptance criteria first; do not guess from its ID.
- Identify available browser interaction, source access and test execution tools. Prefer the user's existing signed-in browser when requested and accessible. Follow the browser tool's own operating instructions; this skill does not supply browser access.
- Inspect relevant project instructions and existing test conventions when source is available. Identify affected shared components and representative consumers. Follow AGENTS.md and other applicable project restrictions on test execution, scan scope and timing; this skill does not authorise broader test runs.
- If runtime access is unavailable, complete useful source checks and provide proposed runnable test snippets or precise manual keyboard steps. Do not create or change repository files unless requested. Label the result **source review only**. If login blocks a journey, report the blocked coverage without claiming a runtime pass.
- Review by default. Implement fixes or update trackers only when requested. Do not submit records merely to complete an audit unless saving test data is within the user's authorised scope. When saving is authorised, verify the outcome and report what was created.

## Exercise representative journeys

Choose applicable states: initial, loading, empty, populated, selected, expanded, validation error, server error and success. Include entry, cancellation and return paths, nested overlays and conditional fields where present. Do not stop after scanning the initial page.

Use real keyboard input to test Tab, Shift+Tab, Enter, Space and the relevant widget keys. Pointer actions may establish a starting state, but do not use clicks, forced focus or injected handlers to claim a keyboard journey passed.

For each important transition, record the starting control, action and actual focus destination. Check:

- All essential controls are reachable, operable and escapable, with visible, unobscured focus and logical forward/backward order.
- Opening and returning from views or dialogs preserves orientation. Initial focus suits the content and task; do not prescribe a heading or first field universally.
- Modal dialogs contain focus and make background content unavailable while open. Non-modal drawers, panels and dialogs must not trap focus just because they overlay content.
- Closing, cancelling and completing nested dialogs restores focus to the appropriate trigger or logical successor. Removed triggers need an intentional fallback.
- Async updates, selection, filtering, loading more and deletion do not lose focus or unexpectedly relocate it. Selection alone does not automatically justify moving focus.
- Radios, checkboxes, buttons and composite widgets match the interaction they represent. Tab normally enters/exits a radio group; arrow keys move within it. Apply roving tabindex only to a suitable composite pattern, not every collection of buttons.
- Iframes are tested in their actual context. A missing iframe tabindex alone is not proof of a keyboard failure: reproduce entry, operation and exit.

## Inspect semantics and presentation

Inspect the rendered DOM and accessibility tree where available, together with relevant source. Check accessible names, label activation, role/state/value, groups, headings, landmarks, lists and tables. Verify dynamically generated controls as well as initial content.

For forms, check instructions, required indicators, error identification and associations, invalid state, recovery and submission feedback. Test both keyboard and pointer activation of labels when relevant.

For dynamic updates, check status semantics, live-region lifecycle, hidden ancestors, busy states and timing. A region inserted with its message or removed quickly can be a risk; record the evidence without inventing the spoken result. Avoid duplicate announcements and unnecessary live regions. Not every update needs an announcement.

Use this minimum presentation checklist for the scoped views and applicable states:

- **Contrast:** inspect rendered text and meaningful controls/icons, including focus and error states, against the relevant text and non-text contrast requirements (1.4.3 and 1.4.11). Class names alone do not prove the rendered colours or indicator.
- **Text resizing and reflow:** check text at 200% and reflow at 320 CSS pixels, such as 400% zoom from a 1280 CSS-pixel viewport. Assess loss of content/function and the applicable exceptions, including content requiring two-dimensional layout (1.4.4 and 1.4.10). Record browser zoom, viewport dimensions and any text-only resize setting; changing viewport width alone is not evidence of text resizing.
- **Focus:** verify a visible indicator and that focused controls are not entirely hidden by author-created content (2.4.7 and 2.4.11). Distinguish the AA requirement from stronger recommendations about partial obscuring or indicator appearance.
- **Dragging:** where present, test a single-pointer alternative that does not require dragging, or establish the applicable exception (2.5.7). Keyboard operation alone does not establish this pointer alternative.
- **Target size:** assess pointer targets against the 24 by 24 CSS-pixel minimum or an applicable spacing/other exception (2.5.8); do not fail every smaller target without assessing those exceptions.
- **Motion:** check relevant reduced-motion behaviour, pause/stop controls and content that could flash. Apply the criterion appropriate to the actual behaviour rather than treating every animation as an AA failure.

Record the settings and evidence for each applicable check. Explain material non-applicability or blocked coverage rather than silently omitting a check; this checklist does not replace other criteria relevant to the scoped journey.

Prefer native semantics and logical DOM order. Distinguish WCAG failures from recommended patterns and usability improvements. Do not automatically report a failure for a skipped heading level, missing H1 in each view, or lack of a particular ARIA attribute without establishing the relevant requirement and user impact.

## Automation and evidence

Run available accessibility scans, such as axe through the project's existing tools, in relevant rendered states and within the permitted test scope. Record the engine/version, selected rule tags or rules, exclusions and scanned views/states. Check whether that configuration covers the declared WCAG target; a project scan configured for an earlier version does not establish coverage of newer criteria. Report configuration gaps and manual checks still needed. Browser keyboard checks and focus assertions complement scans; a clean scan cannot prove full accessibility.

When requested to implement fixes or tests, add focused regression coverage using the existing test stack. Use realistic keyboard interaction and observable focus/state assertions. Do not suppress violations or change expected behaviour simply to obtain a passing test.

Separate evidence into:

- **Runtime verified:** directly observed interaction or rendered state; name the environment and steps.
- **Source demonstrated:** supported by precise implementation evidence, without implying runtime verification.
- **Needs verification:** plausible concern with the missing check stated.

Use PASS only for an executed, defined check; FAIL for a demonstrated defect; NOT TESTED/BLOCKED for missing coverage. Do not equate a DOM status-region check with verified speech. Report scan engine limitations, inaccessible frames and untested states where material. Do not claim full WCAG conformance from this review.

## Deliver findings and PR summary

Lead with confirmed findings, ordered by user impact. For each, include a succinct developer-facing issue title, user impact, affected view/state, evidence and proposed correction. Add reproduction steps, expected versus actual behaviour, criterion rationale and verification steps where useful, scaling detail to the issue. Identify the applicable WCAG criterion when established; otherwise label the concern as needing verification or as a usability recommendation rather than guessing a conformance failure.

Use severity **1 - High**, **2 - Medium**, **3 - Low**, based on task obstruction, scope and available workarounds. Keep severity separate from status. Do not invent tracker IDs. When retesting, preserve the original issue description and place new evidence in retest notes; follow any user-specified tracker format.

Finish with a compact PR-ready summary:

- Scope, environment and date tested.
- Journeys and checks actually executed, with outcomes.
- Outstanding issues and blocked or unverified coverage.
- Focused next checks, if any; do not assign developers screen-reader testing as a prerequisite.

Do not write the summary to a PR or external tracker unless requested.

## References

This workflow is informed by the published [Accessibility Runtime Tester](https://github.com/github/awesome-copilot/blob/main/agents/accessibility-runtime-tester.agent.md), with scoped modal behaviour, explicit evidence limits and no developer screen-reader requirement. It does not depend on that agent's tool configuration.

Consult primary references when resolving uncertain criteria or patterns:

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) — pattern guidance, not itself a WCAG conformance checklist.
- [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing) — automated scans alongside interaction testing.
