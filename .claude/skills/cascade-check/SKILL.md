---
name: cascade-check
description: Use this before adding a height, width, position, background or border to any element, and whenever a style you wrote appears to have no effect or an element renders a size you did not ask for. A global stylesheet or a utility framework may already be styling that element, and your local rule is arriving into a fight you did not know about. Trigger it for bare elements written without a class (header, nav, aside, footer), for any className that collides with a utility name (fixed, container, grid, hidden), and any time the fix you are reaching for is !important.
---

# Check what is already styling this element

## The rule

**Before you set a dimension on an element, find out what already sets it.**
A local rule does not arrive on a blank element. It arrives into a cascade that
may already have opinions, and the losing side of that fight is silent — no
error, no warning, just a box that is the wrong size or a colour that never
changes.

Two greps, before writing the rule:

```
grep -n "^header{\|^nav{\|[^-]header{" app/globals.css     # bare-element rules
grep -n "\.the-class-i-am-about-to-use" app/*.css app/**/*.css
```

## The three ways it goes wrong here

### 1. A bare element already has a global rule

`app/globals.css` styles bare elements site-wide. `header` is the dangerous
one: it is given a **fixed `height:38px`**, not `height:auto`.

This matters because `min-height` does not undo it. `min-height` raises a
floor; it does not make a fixed box auto-size to its content. So a header with
wrapping content silently overflows its own bottom edge instead of growing.

**Twice, same root cause.** The part-number prompt's header picked up the
site-wide dark banner styling and had to be given a class. Later the Fixed
Repairs feed header, with `min-height:54px`, rendered a wrapped button row
**37.5px past its own bottom edge** — measured, invisible in the source. The
fix both times was an explicit `height:auto` alongside the `min-height`.

If you write `min-height` on a bare element, ask whether a fixed `height` is
already set. If it is, you need `height:auto` too.

### 2. A later, broader selector overrides your specific one

**Real case.** `.log-card` was given its own `--log-card-border` so the bus
group outline could be darker than everything else. It had no effect. Further
down the file, a broader list —
`.log-summary>div,.log-controls,.log-feed,.log-card,.log-search{border-color:var(--log-border)}`
— still named `.log-card` and won on source order.

The fix is not `!important`. It is pulling the element out of the shared list
so one rule owns it. **Reaching for `!important` is the signal that you have
not found the rule you are actually fighting** — go find it.

### 3. A utility framework owns the class name you chose

Tailwind is loaded here. A `className="fixed"` once lost to Tailwind's own
`.fixed` and broke a tile at every width.

Before using a single common word as a class — `fixed`, `container`, `grid`,
`hidden`, `block`, `static` — check that the framework does not already define
it. Prefer a name scoped to the surface: `log-card-fixed`, not `fixed`.

## What to do, in order

**1. Grep before writing.** Bare-element rules and the class name you intend
to use. Ten seconds.

**2. If the style has no visible effect, find the winner before adding
anything.** In the browser: inspect the element and read which rule actually
applied. Adding specificity blind is how a stylesheet accumulates rules nobody
can remove later.

**3. If the box is the wrong size, ask whether something set a fixed
dimension.** `min-height` and `max-height` cannot fix a wrong `height`; only
`height:auto` releases it.

**4. Measure, do not read.** A cascade problem is invisible in the source of
the rule you just wrote — it lives in the interaction. See the
`browser-verification` skill: `getBoundingClientRect()`, and check whether the
box extends past its parent.

**5. Leave the reason in the file.** `height:auto` next to a `min-height`
looks redundant and will be deleted by somebody tidying up, unless a comment
says the global `header` rule is why it is there.

## Note on scope

The specific traps above are this repository's — `globals.css` styling bare
elements, the `.log-card` override, Tailwind being present. The discipline
generalises to any project with a global stylesheet or a utility framework:
find out what already styles the element before you add a rule, and treat a
rule with no visible effect as a question about the cascade rather than an
invitation to add specificity.
