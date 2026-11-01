# Tamia SVAMITVA Patwari Monitor

A day-by-day dashboard of SVAMITVA registry progress for Tamia tehsil (Chhindwara), by patwari and village.
It reads the Google Sheet **SVAMITVA → Sheet1** directly in the browser, so new rows in the sheet appear
on the site without any rebuild or redeploy.

## Tabs

- **Overview**: summary cards, stage funnel and donut, day-by-day trend, patwari ranking, patwari × day heatmap, patwari table, villages to follow up.
- **Top & bottom patwaris**: ranking by gain, plots completed, per-update pace or % completed, with trend, slope, gap and small-multiple charts.
- **Previous vs current day**: per-patwari matrix and charts comparing the as-of date with the update before it.

Filters (as-of date, trend range, patwari, village, stage) apply to every tab and are kept in the page address, so a copied link opens the same view.

## Make the sheet readable by the site (one time)

In Google Sheets: **File → Share → Publish to web → Sheet1 → Comma-separated values (.csv) → Publish**.
Copy the link (it ends in `output=csv`) and paste it as `CSV_URL` in `js/config.js`.

Publishing makes the sheet's contents readable by anyone who has the link, and the Netlify site is public too.
Leave out any column you don't want public.

Google refreshes a published sheet about every 5 minutes after you edit it. The open page also re-reads it every 10 minutes
(`AUTO_REFRESH_MINUTES` in `js/config.js`), and the **Refresh data** button re-reads it at once.

## Sheet format

Row 1 holds headers: `S.No, Village, LGD Code, Patwari Name, Plots, Beneficiaries, Registry_Initiated,
Patwari_Verification, Submitted, Registration in, Completed, % Completed, Date`. Add one row per village for each new date.
Dates can be `11/10/2026` or `15-10-2026` (day first).

## Deploy on Netlify

1. Push this folder to a GitHub repository.
2. On Netlify: **Add new site → Import an existing project → GitHub**, then pick the repository.
3. Leave the build command empty and set the publish directory to `.` (already set in `netlify.toml`). Click **Deploy**.

Every push to GitHub redeploys the site. Sheet edits need no deploy.

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Files

- `index.html`: the page, its styles and chart code
- `js/config.js`: where the data comes from
- `js/calcs.js`: turns sheet rows into numbers per village, patwari and day
- `js/dash-shim.js`: loads the sheet, runs the calculations and redraws on filter changes
