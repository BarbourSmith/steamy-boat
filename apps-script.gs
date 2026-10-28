/**
 * @OnlyCurrentDoc
 * Limits this script's permission to the one spreadsheet it's attached to.
 */

// Google Apps Script backend for steamy boat signups.
// Setup steps are in README.md. Each signup becomes a row in the sheet:
//   timestamp | wednesday | name | party

// Most people aboard on any one Wednesday. Keep in sync with assets/common.js.
const CAPACITY = 6;

function sheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function isDate_(v) {
  return Object.prototype.toString.call(v) === "[object Date]";
}

function asIsoDate_(v) {
  if (isDate_(v)) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(v);
}

// Every signup, with `row` as its 1-based row number in the sheet.
function readSignups_() {
  return sheet_().getDataRange().getValues()
    .map((r, i) => ({ r, row: i + 1 }))
    .filter(({ r }) => r[1] && r[2] && r[0] !== "timestamp")
    .map(({ r, row }) => ({
      row,
      timestamp: isDate_(r[0]) ? r[0].toISOString() : String(r[0]),
      wednesday: asIsoDate_(r[1]),
      name: String(r[2]),
      party: Number(r[3]),
    }));
}

// The announcement shown at the top of the deck, set from /stern. Blank hides it.
function readAnnouncement_() {
  return PropertiesService.getScriptProperties().getProperty("announcement") || "";
}

// ?announcement=1 returns { announcement }; otherwise the signup list.
function doGet(e) {
  if (e && e.parameter && e.parameter.announcement) {
    return json_({ announcement: readAnnouncement_() });
  }
  return json_(readSignups_());
}

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  // One request at a time, so two people can't both grab the last spot.
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (d.action === "announce") return setAnnouncement_(d);
    return d.action === "delete" ? deleteSignup_(d) : addSignup_(d);
  } finally {
    lock.releaseLock();
  }
}

function addSignup_(d) {
  const party = Math.min(CAPACITY, Math.max(1, Number(d.party) || 1));
  const name = String(d.name || "").slice(0, 60);
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(d.wednesday)) return json_({ ok: false });

  const aboard = readSignups_()
    .filter((s) => s.wednesday === d.wednesday)
    .reduce((n, s) => n + s.party, 0);
  if (aboard + party > CAPACITY) {
    return json_({ ok: false, full: true, spotsLeft: Math.max(0, CAPACITY - aboard) });
  }

  const sh = sheet_();
  if (sh.getLastRow() === 0) sh.appendRow(["timestamp", "wednesday", "name", "party"]);
  // Leading apostrophe stops Sheets from turning the date into a Date cell.
  sh.appendRow([new Date(), "'" + d.wednesday, name, party]);
  return json_({ ok: true });
}

// Deletes by row number, but only if that row still holds the same signup,
// in case rows shifted since the page loaded.
function deleteSignup_(d) {
  const row = Number(d.row);
  const match = readSignups_().find((s) => s.row === row);
  if (!match || match.name !== d.name || match.wednesday !== d.wednesday) {
    return json_({ ok: false });
  }
  sheet_().deleteRow(row);
  return json_({ ok: true });
}

function setAnnouncement_(d) {
  const text = String(d.text || "").trim().slice(0, 500);
  PropertiesService.getScriptProperties().setProperty("announcement", text);
  return json_({ ok: true, announcement: text });
}
