// Where the dashboard reads its data from.
//
// Recommended: the "Publish to web" CSV link of Sheet1.
//   Google Sheets → File → Share → Publish to web → Sheet1 → Comma-separated values (.csv) → Publish
//   Paste the link it gives you (it ends in output=csv) below.
// Published sheets refresh by themselves about every 5 minutes after you edit the sheet.
//
// If CSV_URL is left empty, the dashboard falls back to reading the sheet by its ID,
// which only works when the sheet is shared as "Anyone with the link: Viewer".
window.SV_CONFIG = {
  CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSpOx_uW2Iz99u_ZPEtKmTyv06Q--xpCijqz9Ts27ix8yiEeUFUCWhbil_MrKLytA2OQll1M8A6qXkp/pub?gid=0&single=true&output=csv',
  SHEET_ID: '1fq-bMoVtM2F4xJC0neGXtUOnDZsICJscEcY0EvmcdnE',
  SHEET_NAME: 'Sheet1',
  // Re-read the sheet automatically while the page is open (minutes). 0 turns it off.
  AUTO_REFRESH_MINUTES: 10,
};
