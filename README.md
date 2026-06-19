# Student Finance Tracker

A vanilla HTML/CSS/JS web app for tracking student expenses. Built for the ALU Front-End Summative Assignment.

**Live site:** [GitHub Pages URL here]

## Chosen Theme

Student Finance Tracker — track budgets, transactions, and search spending history.

## Features

- Add, edit, and delete transactions with description, amount, category, and date
- Dashboard with total count, total spent, top category, and 7-day trend chart
- Budget cap with remaining/overage alerts (ARIA live regions)
- Regex-powered live search with match highlighting
- Sort records by date, description, or amount
- Multi-currency display: RWF (default), USD, UGX with manual exchange rates
- Editable categories
- Import/export data as JSON with structure validation
- Auto-save to localStorage
- Mobile-first responsive design (360px, 768px, 1024px breakpoints)
- Fully keyboard accessible

## Regex Catalog

| Rule | Pattern | Example Match | Example Reject |
|------|---------|---------------|----------------|
| Description (no leading/trailing/double spaces) | `^\S(?:.*\S)?$` and `\s{2,}` | `Lunch at cafe` | `  Lunch`, `Lunch  at` |
| Duplicate words (advanced, back-reference) | `\b(\w+)\s+\1\b` | `the the` | `the theater` |
| Amount (positive, up to 2 decimals) | `^(0\|[1-9]\d*)(\.\d{1,2})?$` | `12.50`, `0`, `100` | `01`, `12.500`, `-5` |
| Date (YYYY-MM-DD) | `^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$` | `2025-09-25` | `25-09-2025`, `2025-13-01` |
| Category (letters, spaces, hyphens) | `^[A-Za-z]+(?:[ -][A-Za-z]+)*$` | `Fast Food`, `Self-care` | `Food2`, `!Food` |

### Search Patterns

- Cents present: `\.\d{2}\b`
- Beverage keyword: `(coffee|tea)`
- Duplicate words: `\b(\w+)\s+\1\b`

## Keyboard Map

| Key | Action |
|-----|--------|
| Tab / Shift+Tab | Navigate between interactive elements |
| Enter | Activate buttons, submit forms, follow links |
| Space | Toggle checkboxes, activate buttons |
| Escape | No custom bindings (browser default) |

The skip-to-content link appears on first Tab press and jumps to the main content area.

## Accessibility Notes

- Semantic HTML landmarks: `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`
- Proper heading hierarchy (h1 > h2 > h3 > h4)
- All form inputs have associated `<label>` elements
- `aria-live="polite"` for status messages, `aria-live="assertive"` for budget overage and errors
- Visible focus styles on all interactive elements (`outline: 3px solid`)
- Skip-to-content link for keyboard users
- Table and card views both use `aria-label`
- Color contrast meets WCAG AA (dark text on light backgrounds)
- Mobile-first responsive design with 3 breakpoints

## How to Run

1. Clone the repository
2. Open `index.html` in a browser (no build step required)
3. To load seed data: go to Settings > Import JSON > select `seed.json`

## How to Run Tests

Open `tests.html` in a browser. It runs 30 assertions covering all regex validation rules and the search compiler.

## File Structure

```
index.html          Main app page
tests.html          Regex validation test suite
seed.json           12 sample transaction records
README.md           This file
styles/
  main.css          All styles (mobile-first, responsive)
scripts/
  storage.js        localStorage persistence, JSON import/export
  state.js          App state, CRUD operations, currency conversion
  validators.js     Regex validation rules
  search.js         Regex compiler, highlighting, filtering, sorting
  ui.js             DOM manipulation, event handling, rendering
assets/             Images and icons
```

## Currency Rates (Fixed)

- 1 USD = 1,300 RWF
- 1 UGX = 0.35 RWF

Rates are manually set in Settings and do not auto-update.
