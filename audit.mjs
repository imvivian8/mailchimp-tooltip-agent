#!/usr/bin/env node

/**
 * Mailchimp Tooltip Audit Agent
 *
 * Crawls your Mailchimp account and identifies every metric that lacks a
 * tooltip explaining what it means or how it's calculated. Produces:
 *
 *   1. A structured markdown report with per-page findings
 *   2. A visual HTML report with annotated screenshots showing exactly
 *      WHERE tooltips should go and WHAT copy they should contain
 *
 * Usage:
 *   node audit.mjs                    # Full audit (all pages)
 *   node audit.mjs --page             # Audit current page only
 *   node audit.mjs --sections=audience,campaigns
 *
 * Output:
 *   reports/tooltip_audit_YYYY-MM-DD.md
 *   reports/tooltip_visual_YYYY-MM-DD.html  ← annotated screenshot report
 *   reports/screenshots/
 */

import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function today() {
  return new Date().toISOString().split("T")[0];
}

function loadMetricDefinitions() {
  const raw = readFileSync(
    join(__dirname, "knowledge", "metric-definitions.md"),
    "utf-8"
  );
  const metrics = [];
  let current = null;

  for (const line of raw.split("\n")) {
    if (line.startsWith("### ")) {
      if (current) metrics.push(current);
      current = {
        name: line.replace("### ", "").trim(),
        definition: "",
        tooltip: "",
        searchTerms: [],
      };
    } else if (current) {
      if (line.startsWith("- **Definition**:"))
        current.definition = line.replace("- **Definition**:", "").trim();
      else if (line.startsWith("- **Tooltip**:"))
        current.tooltip = line.replace("- **Tooltip**:", "").trim();
      else if (line.startsWith("- **Search Terms**:"))
        current.searchTerms = line
          .replace("- **Search Terms**:", "")
          .trim()
          .split(",")
          .map((s) => s.trim());
    }
  }
  if (current) metrics.push(current);
  return metrics;
}

function loadSitemap() {
  const raw = readFileSync(
    join(__dirname, "knowledge", "mailchimp-sitemap.md"),
    "utf-8"
  );
  const pages = [];
  const tableRowRe = /^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/;
  let currentSection = "";

  for (const line of raw.split("\n")) {
    if (line.startsWith("## ") && !line.includes("Navigation Strategy")) {
      currentSection = line.replace("## ", "").trim();
    }
    const match = line.match(tableRowRe);
    if (match) {
      const [, pageName, rawRoute, notes] = match;
      if (pageName === "Page" || pageName.includes("---") || rawRoute.includes("---")) continue;
      const route = rawRoute.trim().replace(/`/g, "").split(" or ")[0].trim();
      if (!route.startsWith("/")) continue;
      pages.push({
        section: currentSection,
        name: pageName.trim(),
        route,
        notes: notes.trim(),
        needsEntity: route.includes("<ID>"),
      });
    }
  }
  return pages;
}

// ---------------------------------------------------------------------------
// Metric tooltip scanner
// ---------------------------------------------------------------------------

async function scanForMetrics(page, metrics) {
  const findings = [];

  for (const metric of metrics) {
    for (const term of metric.searchTerms) {
      try {
        const elements = await page
          .getByText(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"))
          .all();

        if (elements.length === 0) continue;

        for (const el of elements.slice(0, 3)) {
          const hasTitle = await el.evaluate((e) => {
            return !!(
              e.getAttribute("title") ||
              e.closest("[title]") ||
              e.getAttribute("aria-describedby") ||
              e.closest("[aria-describedby]")
            );
          });

          const hasInfoIcon = await el.evaluate((e) => {
            const parent = e.closest("div, td, th, li, section, article") || e.parentElement;
            if (!parent) return false;
            const icons = parent.querySelectorAll(
              '[class*="info"], [class*="help"], [class*="tooltip"], [class*="question"], [aria-label*="info"], [aria-label*="help"], svg[class*="icon"]'
            );
            return icons.length > 0;
          });

          const hasDataTooltip = await el.evaluate((e) => {
            return !!(
              e.getAttribute("data-tooltip") ||
              e.getAttribute("data-tip") ||
              e.closest("[data-tooltip]") ||
              e.closest("[data-tip]")
            );
          });

          const hasTooltip = hasTitle || hasInfoIcon || hasDataTooltip;

          // Get position for annotation
          const position = await el.evaluate((e) => {
            const rect = e.getBoundingClientRect();
            return {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              tag: e.tagName.toLowerCase(),
              text: e.textContent?.trim().substring(0, 50) || "",
            };
          }).catch(() => null);

          findings.push({
            metric: metric.name,
            searchTerm: term,
            hasTooltip,
            tooltipType: hasTitle ? "title/aria" : hasInfoIcon ? "info icon" : hasDataTooltip ? "data attribute" : "none",
            recommendedTooltip: metric.tooltip,
            definition: metric.definition,
            position,
            severity: hasTooltip ? "OK" : "Major",
          });

          break;
        }
        break;
      } catch {
        // continue
      }
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Per-page audit
// ---------------------------------------------------------------------------

async function auditPage(page, metrics, name, url) {
  const result = { name, url, metricFindings: [], screenshotPath: null, error: null };

  try {
    const screenshotDir = join(__dirname, "reports", "screenshots");
    mkdirSync(screenshotDir, { recursive: true });
    const safeName = name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const screenshotPath = join(screenshotDir, `${safeName}_${today()}.png`);

    await page.screenshot({ path: screenshotPath, fullPage: false });
    result.screenshotPath = screenshotPath;

    console.log(`    🔎 Scanning for metric tooltips...`);
    result.metricFindings = await scanForMetrics(page, metrics);

    const missing = result.metricFindings.filter((f) => !f.hasTooltip).length;
    const found = result.metricFindings.filter((f) => f.hasTooltip).length;
    console.log(`    ${result.metricFindings.length} metrics found: ${found} have tooltips, ${missing} missing`);
    console.log(`    ✅ Done\n`);
  } catch (err) {
    console.log(`    ❌ Error: ${err.message}\n`);
    result.error = err.message;
  }

  return result;
}

// ---------------------------------------------------------------------------
// HTML visual report with annotated screenshots
// ---------------------------------------------------------------------------

function imageToBase64(imagePath) {
  if (!imagePath || !existsSync(imagePath)) return null;
  const buffer = readFileSync(imagePath);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function generateVisualReport(pageResults) {
  const allMissing = pageResults.flatMap((pr) =>
    pr.metricFindings.filter((f) => !f.hasTooltip).map((f) => ({ ...f, page: pr.name }))
  );

  // Unique metrics count
  const uniqueMetrics = new Set(allMissing.map((f) => f.metric));

  // Build metric → pages index
  const metricPages = {};
  for (const f of allMissing) {
    if (!metricPages[f.metric]) metricPages[f.metric] = [];
    if (!metricPages[f.metric].includes(f.page)) metricPages[f.metric].push(f.page);
  }

  const pageCards = pageResults
    .filter((pr) => !pr.error && pr.metricFindings.filter((f) => !f.hasTooltip).length > 0)
    .map((pr) => {
      const missing = pr.metricFindings.filter((f) => !f.hasTooltip);
      const imgData = imageToBase64(pr.screenshotPath);

      // Build annotation markers HTML
      const annotations = missing
        .filter((f) => f.position && f.position.x !== undefined)
        .map((f, i) => {
          const x = f.position.x;
          const y = f.position.y;
          return `<div class="annotation-marker" style="left:${x}px;top:${y}px;" data-index="${i}" title="${f.metric}">
            <span class="marker-number">${i + 1}</span>
          </div>`;
        })
        .join("");

      const tooltipRows = missing.map((f, i) => `
        <tr>
          <td class="num">${i + 1}</td>
          <td><strong>${f.metric}</strong></td>
          <td class="location">${f.position ? `${f.position.tag} near (${f.position.x}, ${f.position.y})` : "—"}</td>
          <td class="tooltip-copy">${f.recommendedTooltip}</td>
          <td class="definition">${f.definition}</td>
        </tr>`).join("");

      return `
    <section class="page-card" id="page-${pr.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}">
      <div class="page-header">
        <h2>${pr.name}</h2>
        <span class="url">${pr.url}</span>
        <span class="badge badge-missing">${missing.length} missing tooltip${missing.length !== 1 ? "s" : ""}</span>
      </div>

      <div class="page-body">
        ${imgData ? `
        <div class="screenshot-container">
          <div class="screenshot-wrapper">
            <img src="${imgData}" alt="Screenshot of ${pr.name}" class="page-screenshot" />
            <div class="annotations">${annotations}</div>
          </div>
          <p class="screenshot-caption">Circled numbers show where tooltips should be placed (hover for metric name)</p>
        </div>` : `<div class="no-screenshot">Screenshot not available</div>`}

        <div class="tooltip-table-container">
          <h3>Tooltips to Add</h3>
          <table class="tooltip-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Metric</th>
                <th>Location</th>
                <th>Recommended Tooltip Copy</th>
                <th>Full Definition</th>
              </tr>
            </thead>
            <tbody>
              ${tooltipRows}
            </tbody>
          </table>
        </div>
      </div>
    </section>`;
    })
    .join("\n");

  // Consolidated table
  const consolidatedRows = Object.entries(metricPages)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([metric, pages]) => {
      const sample = allMissing.find((f) => f.metric === metric);
      return `<tr>
        <td><strong>${metric}</strong></td>
        <td>${pages.length}</td>
        <td class="pages-list">${pages.join(", ")}</td>
        <td class="tooltip-copy">${sample?.recommendedTooltip || "—"}</td>
      </tr>`;
    })
    .join("\n");

  const totalMissing = allMissing.length;
  const pagesWithIssues = pageResults.filter((pr) => pr.metricFindings.filter((f) => !f.hasTooltip).length > 0).length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mailchimp Tooltip Audit — ${today()}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f6fa; color: #2d3748; }

  /* Header */
  .report-header { background: #2E5B8A; color: white; padding: 40px 48px; }
  .report-header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
  .report-header .subtitle { opacity: 0.8; font-size: 14px; }
  .report-header .meta { margin-top: 24px; display: flex; gap: 32px; flex-wrap: wrap; }
  .report-header .stat { background: rgba(255,255,255,0.15); padding: 12px 20px; border-radius: 8px; }
  .report-header .stat .number { font-size: 32px; font-weight: 700; }
  .report-header .stat .label { font-size: 12px; opacity: 0.8; margin-top: 2px; }

  /* Navigation */
  .toc { background: white; border-bottom: 1px solid #e2e8f0; padding: 16px 48px; position: sticky; top: 0; z-index: 100; }
  .toc h2 { font-size: 12px; color: #718096; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
  .toc-links { display: flex; gap: 8px; flex-wrap: wrap; }
  .toc-links a { font-size: 12px; color: #2E5B8A; text-decoration: none; padding: 4px 10px; background: #EBF4FF; border-radius: 4px; white-space: nowrap; }
  .toc-links a:hover { background: #BEE3F8; }

  /* Summary section */
  .summary-section { max-width: 1400px; margin: 32px auto; padding: 0 48px; }
  .summary-section h2 { font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #2E5B8A; }
  .consolidated-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .consolidated-table th { background: #2E5B8A; color: white; padding: 12px 16px; text-align: left; font-size: 13px; }
  .consolidated-table td { padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; vertical-align: top; }
  .consolidated-table tr:last-child td { border-bottom: none; }
  .consolidated-table tr:nth-child(even) td { background: #f7fafc; }

  /* Page cards */
  .pages-container { max-width: 1400px; margin: 0 auto 48px; padding: 0 48px; }
  .page-card { background: white; border-radius: 12px; overflow: hidden; margin-bottom: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .page-header { padding: 20px 28px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .page-header h2 { font-size: 18px; font-weight: 600; color: #1a202c; }
  .url { font-size: 12px; color: #718096; font-family: monospace; flex: 1; }
  .badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  .badge-missing { background: #FEF3C7; color: #92400E; }

  .page-body { padding: 24px 28px; }

  /* Screenshot with annotations */
  .screenshot-container { margin-bottom: 24px; }
  .screenshot-wrapper { position: relative; display: inline-block; max-width: 100%; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 8px; }
  .page-screenshot { display: block; max-width: 100%; height: auto; }
  .annotations { position: absolute; top: 0; left: 0; pointer-events: none; }
  .annotation-marker {
    position: absolute;
    width: 24px; height: 24px;
    background: #E53E3E;
    border: 2px solid white;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    transform: translate(-50%, -50%);
    cursor: pointer;
    pointer-events: all;
    box-shadow: 0 2px 4px rgba(0,0,0,0.4);
    z-index: 10;
  }
  .annotation-marker .marker-number { color: white; font-size: 11px; font-weight: 700; line-height: 1; }
  .screenshot-caption { font-size: 12px; color: #718096; margin-top: 8px; font-style: italic; }
  .no-screenshot { background: #f7fafc; border: 1px dashed #e2e8f0; border-radius: 8px; padding: 32px; text-align: center; color: #718096; margin-bottom: 24px; }

  /* Tooltip table */
  .tooltip-table-container h3 { font-size: 15px; font-weight: 600; margin-bottom: 12px; color: #2d3748; }
  .tooltip-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .tooltip-table th { background: #2E5B8A; color: white; padding: 10px 14px; text-align: left; }
  .tooltip-table td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  .tooltip-table tr:last-child td { border-bottom: none; }
  .tooltip-table tr:nth-child(even) td { background: #f7fafc; }
  .tooltip-table .num { width: 32px; color: #E53E3E; font-weight: 700; text-align: center; }
  .tooltip-table .location { color: #718096; font-family: monospace; font-size: 11px; width: 180px; }
  .tooltip-table .tooltip-copy { background: #FFFBEB; font-style: italic; }
  .tooltip-table .definition { color: #4a5568; font-size: 12px; }
  .pages-list { color: #4a5568; font-size: 12px; }

  /* Responsive */
  @media (max-width: 768px) {
    .report-header, .toc, .summary-section, .pages-container { padding-left: 16px; padding-right: 16px; }
    .report-header .meta { flex-direction: column; gap: 12px; }
    .screenshot-wrapper { max-width: 100%; }
  }
</style>
</head>
<body>

<header class="report-header">
  <h1>Mailchimp Tooltip Audit</h1>
  <div class="subtitle">Visual report — metrics missing explanatory tooltips</div>
  <div class="meta">
    <div class="stat">
      <div class="number">${totalMissing}</div>
      <div class="label">Missing Tooltips</div>
    </div>
    <div class="stat">
      <div class="number">${uniqueMetrics.size}</div>
      <div class="label">Unique Metrics</div>
    </div>
    <div class="stat">
      <div class="number">${pagesWithIssues}</div>
      <div class="label">Pages Affected</div>
    </div>
    <div class="stat">
      <div class="number">${pageResults.length}</div>
      <div class="label">Pages Audited</div>
    </div>
    <div class="stat">
      <div class="number">${today()}</div>
      <div class="label">Audit Date</div>
    </div>
  </div>
</header>

<nav class="toc">
  <h2>Jump to page</h2>
  <div class="toc-links">
    ${pageResults
      .filter((pr) => !pr.error && pr.metricFindings.filter((f) => !f.hasTooltip).length > 0)
      .map((pr) => `<a href="#page-${pr.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}">${pr.name} (${pr.metricFindings.filter((f) => !f.hasTooltip).length})</a>`)
      .join("")}
  </div>
</nav>

<div class="summary-section">
  <h2>All Metrics Missing Tooltips — Sorted by Most Pages Affected</h2>
  <table class="consolidated-table">
    <thead>
      <tr>
        <th>Metric</th>
        <th># Pages Missing</th>
        <th>Pages</th>
        <th>Recommended Tooltip Copy</th>
      </tr>
    </thead>
    <tbody>
      ${consolidatedRows}
    </tbody>
  </table>
</div>

<div class="pages-container">
  ${pageCards}
</div>

</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Markdown report
// ---------------------------------------------------------------------------

function generateMarkdownReport(pageResults, startTime) {
  const allMissing = pageResults.flatMap((pr) =>
    pr.metricFindings.filter((f) => !f.hasTooltip).map((f) => ({ ...f, page: pr.name }))
  );

  let md = `# Mailchimp Tooltip Audit Report\n`;
  md += `## Date: ${today()}\n`;
  md += `## Pages Audited: ${pageResults.length}\n`;
  md += `## Duration: ${Math.round((Date.now() - startTime) / 1000 / 60)} minutes\n\n---\n\n`;

  md += `### Summary\n\n`;
  md += `| | Count |\n|--|--|\n`;
  md += `| Total missing tooltips | ${allMissing.length} |\n`;
  md += `| Unique metrics missing tooltips | ${new Set(allMissing.map((f) => f.metric)).size} |\n`;
  md += `| Pages with missing tooltips | ${pageResults.filter((pr) => pr.metricFindings.filter((f) => !f.hasTooltip).length > 0).length} |\n\n`;

  md += `---\n\n### Findings by Page\n\n`;

  for (const pr of pageResults) {
    md += `#### ${pr.name} — ${pr.url}\n\n`;
    if (pr.error) { md += `> **Error**: ${pr.error}\n\n`; continue; }

    const missing = pr.metricFindings.filter((f) => !f.hasTooltip);
    if (missing.length === 0) { md += `No missing tooltips.\n\n---\n\n`; continue; }

    md += `**${missing.length} missing tooltip${missing.length !== 1 ? "s" : ""}**\n\n`;
    md += `| Metric | Location | Recommended Tooltip Copy |\n`;
    md += `|--------|----------|--------------------------|\n`;
    for (const f of missing) {
      const loc = f.position ? `${f.position.tag} near (${f.position.x}, ${f.position.y})` : "—";
      md += `| ${f.metric} | ${loc} | ${f.recommendedTooltip} |\n`;
    }
    md += `\n---\n\n`;
  }

  // Consolidated
  const metricPages = {};
  for (const f of allMissing) {
    if (!metricPages[f.metric]) metricPages[f.metric] = [];
    if (!metricPages[f.metric].includes(f.page)) metricPages[f.metric].push(f.page);
  }

  md += `### Consolidated Recommendations\n\n`;
  md += `| Metric | # Pages | Pages | Recommended Tooltip | Definition |\n`;
  md += `|--------|---------|-------|---------------------|------------|\n`;
  for (const [metric, pages] of Object.entries(metricPages).sort((a, b) => b[1].length - a[1].length)) {
    const sample = allMissing.find((f) => f.metric === metric);
    md += `| ${metric} | ${pages.length} | ${pages.join(", ")} | ${sample?.recommendedTooltip || "—"} | ${sample?.definition || "—"} |\n`;
  }

  return md;
}

// ---------------------------------------------------------------------------
// Navigation helper
// ---------------------------------------------------------------------------

async function navigateToPage(page, context, baseUrl, entry) {
  if (!entry.needsEntity) {
    await page.goto(`${baseUrl}${entry.route}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);
    return { url: page.url(), ok: true };
  }

  const listingRoute = entry.route
    .replace(/\?id=<ID>/, "")
    .replace(/\/summary/, "")
    .replace(/\/click-performance/, "")
    .replace(/\/ecommerce/, "")
    .replace(/\/social/, "")
    .replace(/\/detail.*/, "");

  await page.goto(`${baseUrl}${listingRoute}`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(2000);

  const firstLink = await page
    .locator("table tbody tr a, .campaign-list a, [class*='list'] a, a[href*='reports'], a[href*='detail']")
    .first();

  if (await firstLink.isVisible({ timeout: 3000 })) {
    const href = await firstLink.getAttribute("href").catch(() => null);
    if (href) {
      const detailUrl = href.startsWith("http") ? href : `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;
      await page.goto(detailUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(2000);
      return { url: page.url(), ok: true };
    }
  }
  return { url: `${baseUrl}${listingRoute}`, ok: false, error: "No items in listing" };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const singlePage = args.includes("--page");
  const sectionsArg = args.find((a) => a.startsWith("--sections="));
  const allowedSections = sectionsArg
    ? sectionsArg.replace("--sections=", "").split(",").map((s) => s.trim().toLowerCase())
    : null;

  console.log("\n🎯 Mailchimp Tooltip Audit Agent\n");
  console.log("This agent identifies every metric that lacks a tooltip explaining");
  console.log("what it means — and produces an annotated visual HTML report.\n");

  // Connect to Chrome via CDP
  const { spawn } = await import("child_process");
  const { execSync } = await import("child_process");

  try {
    execSync('osascript -e \'tell application "Google Chrome" to quit\'', { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 2000));
  } catch { /* Chrome might not be running */ }

  spawn(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ["--remote-debugging-port=9222", "--restore-last-session"],
    { detached: true, stdio: "ignore" }
  ).unref();

  console.log("Waiting for Chrome to start...");
  await new Promise((r) => setTimeout(r, 4000));

  let browser, context, page;
  try {
    browser = await chromium.connectOverCDP("http://localhost:9222");
    context = browser.contexts()[0];
    if (!context) throw new Error("No browser context found");

    const pages = context.pages();
    page = pages.find((p) => p.url().includes("admin.mailchimp.com")) ||
           pages.find((p) => p.url().includes("mailchimp.com"));

    if (!page) {
      page = await context.newPage();
      await page.goto("https://login.mailchimp.com/", { waitUntil: "domcontentloaded", timeout: 30000 });
      console.log("\n⏳ Please log in to Mailchimp (90 seconds)...\n");
      for (let s = 90; s > 0; s -= 10) {
        console.log(`   ${s}s remaining...`);
        await new Promise((r) => setTimeout(r, 10000));
      }
    } else {
      console.log(`✅ Found Mailchimp tab: ${page.url()}\n`);
    }
  } catch (err) {
    console.error(`❌ Could not connect to Chrome: ${err.message}`);
    browser = await chromium.launch({ headless: false });
    context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    page = await context.newPage();
    await page.goto("https://login.mailchimp.com/", { waitUntil: "domcontentloaded" });
    console.log("⏳ You have 90 seconds to log in + complete OTP.\n");
    for (let s = 90; s > 0; s -= 10) {
      console.log(`   ${s}s remaining...`);
      await new Promise((r) => setTimeout(r, 10000));
    }
  }

  const baseUrl = new URL(page.url()).origin;
  console.log(`✅ Base URL: ${baseUrl}\n`);

  const metrics = loadMetricDefinitions();
  console.log(`📊 Loaded ${metrics.length} metric definitions\n`);

  const startTime = Date.now();
  const pageResults = [];

  if (singlePage) {
    console.log(`\n📄 Auditing current page: ${page.url()}\n`);
    pageResults.push(await auditPage(page, metrics, "Current Page", page.url()));
  } else {
    const sitemap = loadSitemap();
    const pagesToAudit = allowedSections
      ? sitemap.filter((p) => allowedSections.some((s) => p.section.toLowerCase().includes(s)))
      : sitemap;

    console.log(`📋 Auditing ${pagesToAudit.length} pages...\n`);

    for (let i = 0; i < pagesToAudit.length; i++) {
      const entry = pagesToAudit[i];
      console.log(`[${i + 1}/${pagesToAudit.length}] ${entry.section} > ${entry.name}`);

      // Recover dead page
      try { await page.evaluate(() => document.title); }
      catch {
        const livePage = context.pages().find((p) => { try { return !p.isClosed(); } catch { return false; } });
        page = livePage || await context.newPage();
        console.log(`    🔄 Recovered page`);
      }

      try {
        const nav = await navigateToPage(page, context, baseUrl, entry);
        if (!nav.ok) {
          pageResults.push({ name: entry.name, url: nav.url, error: nav.error, metricFindings: [], screenshotPath: null });
          continue;
        }
        pageResults.push(await auditPage(page, metrics, entry.name, nav.url));
      } catch (err) {
        console.log(`    ⚠️  ${err.message}`);
        pageResults.push({ name: entry.name, url: `${baseUrl}${entry.route}`, error: err.message, metricFindings: [], screenshotPath: null });
      }
    }
  }

  // Save reports
  mkdirSync(join(__dirname, "reports"), { recursive: true });

  const mdPath = join(__dirname, "reports", `tooltip_audit_${today()}.md`);
  writeFileSync(mdPath, generateMarkdownReport(pageResults, startTime));

  const htmlPath = join(__dirname, "reports", `tooltip_visual_${today()}.html`);
  writeFileSync(htmlPath, generateVisualReport(pageResults));

  // Summary
  const totalMissing = pageResults.reduce((s, pr) => s + pr.metricFindings.filter((f) => !f.hasTooltip).length, 0);
  const pagesWithIssues = pageResults.filter((pr) => pr.metricFindings.filter((f) => !f.hasTooltip).length > 0).length;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`✅ Tooltip audit complete!`);
  console.log(`   Pages audited: ${pageResults.length}`);
  console.log(`   Pages with missing tooltips: ${pagesWithIssues}`);
  console.log(`   Total missing tooltips: ${totalMissing}`);
  console.log(`\n   📄 Markdown report: ${mdPath}`);
  console.log(`   🎨 Visual HTML report: ${htmlPath}`);
  console.log(`      → Open in browser: open "${htmlPath}"`);
  console.log(`${"=".repeat(60)}\n`);

  await browser.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
