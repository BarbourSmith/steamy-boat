/**
 * @OnlyCurrentDoc
 * Limits this script's permission to the one spreadsheet it's attached to.
 */

// Google Apps Script backend for steamy boat signups.
// Setup steps are in README.md. Each signup becomes a row in the sheet:
//   timestamp | wednesday | name | party

function sheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function asIsoDate_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(v);
}

function doGet() {
  const rows = sheet_().getDataRange().getValues();
  const signups = rows
    .filter((r) => r[1] && r[2])
    .filter((r) => r[0] !== "timestamp")
    .map((r) => ({
      timestamp: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      wednesday: asIsoDate_(r[1]),
      name: String(r[2]),
      party: Number(r[3]),
    }));
  return json_(signups);
}

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  const party = Math.min(6, Math.max(1, Number(d.party) || 1));
  const name = String(d.name || "").slice(0, 60);
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(d.wednesday)) return json_({ ok: false });

  const sh = sheet_();
  if (sh.getLastRow() === 0) sh.appendRow(["timestamp", "wednesday", "name", "party"]);
  // Leading apostrophe stops Sheets from turning the date into a Date cell.
  sh.appendRow([new Date(), "'" + d.wednesday, name, party]);
  return json_({ ok: true });
}
