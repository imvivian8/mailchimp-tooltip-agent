# Tooltip Audit — Full Site

Run a full Mailchimp tooltip audit across all pages.

## What this does

Crawls all ~25 Mailchimp page types and identifies every metric displayed without a tooltip explaining what it means or how it's calculated. Produces two reports:

1. **Markdown report** — structured per-page findings with metric names, locations, and recommended tooltip copy
2. **Visual HTML report** — annotated screenshots with numbered red dots showing exactly where each tooltip should be placed, plus a table with the recommended copy

## Steps

1. Make sure you have dependencies installed: `npm install` in `mailchimp-tooltip-agent/`
2. Make sure Chrome is open and you're logged into Mailchimp
3. Run from the `mailchimp-tooltip-agent/` directory:

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && node audit.mjs
```

4. When complete, open the visual report:
```bash
open reports/tooltip_visual_$(date +%Y-%m-%d).html
```

## Scope options

To audit specific sections only:
```bash
node audit.mjs --sections=audience,campaigns,analytics
```

To audit just the current page:
```bash
node audit.mjs --page
```
