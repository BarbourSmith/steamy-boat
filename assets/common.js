// Shared bits for the steamy boat pages.

// Paste your Google Apps Script web app URL here (see README.md).
// While this is blank, signups are only saved in your own browser (test mode).
const SIGNUP_URL = "https://script.google.com/macros/s/AKfycbw1wT-NcX9f3eFeGUPVjZyYntiwkT7LiG5Dr0hy32_AMA6kzHTpfkZxutEQ4lOBZgk/exec";

// Most people aboard on any one Wednesday. Keep in sync with apps-script.gs.
const CAPACITY = 4;

const GATE_KEY = "steamy-boat-aboard";
const LOCAL_SIGNUPS_KEY = "steamy-boat-test-signups";
const LOCAL_ANNOUNCEMENT_KEY = "steamy-boat-test-announcement";

function isAboard() {
  try { return localStorage.getItem(GATE_KEY) === "yes"; } catch (e) { return false; }
}

function setAboard() {
  try { localStorage.setItem(GATE_KEY, "yes"); } catch (e) {}
}

// Sends visitors who haven't given the password back to the dock.
function requireAboard() {
  if (!isAboard()) location.replace("../");
}

// The upcoming Wednesday as YYYY-MM-DD (today, if today is Wednesday).
function upcomingWednesday() {
  const d = new Date();
  d.setDate(d.getDate() + ((3 - d.getDay() + 7) % 7));
  return isoDate(d);
}

function isoDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function prettyDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });
}

function testMode() {
  return !SIGNUP_URL;
}

function readLocalSignups() {
  try { return JSON.parse(localStorage.getItem(LOCAL_SIGNUPS_KEY)) || []; } catch (e) { return []; }
}

async function fetchSignups() {
  if (testMode()) return readLocalSignups();
  const res = await fetch(SIGNUP_URL);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

function writeLocalSignups(list) {
  localStorage.setItem(LOCAL_SIGNUPS_KEY, JSON.stringify(list));
}

// Total people signed up for one Wednesday.
function headcount(signups, wednesday) {
  return signups
    .filter((s) => s.wednesday === wednesday)
    .reduce((n, s) => n + Number(s.party || 0), 0);
}

async function postToBackend(body) {
  // text/plain keeps this a "simple" request so Apps Script doesn't need CORS preflight.
  const res = await fetch(SIGNUP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

// Resolves to { ok: true }, or { ok: false, full: true, spotsLeft } when there isn't room.
async function addSignup(signup) {
  const entry = { ...signup, timestamp: new Date().toISOString() };
  if (testMode()) {
    const list = readLocalSignups();
    const spotsLeft = CAPACITY - headcount(list, entry.wednesday);
    if (entry.party > spotsLeft) return { ok: false, full: true, spotsLeft: Math.max(0, spotsLeft) };
    list.push(entry);
    writeLocalSignups(list);
    return { ok: true };
  }
  return postToBackend(entry);
}

async function deleteSignup(signup) {
  if (testMode()) {
    writeLocalSignups(readLocalSignups().filter((s) => s.timestamp !== signup.timestamp));
    return;
  }
  const result = await postToBackend({
    action: "delete", row: signup.row, name: signup.name, wednesday: signup.wednesday,
  });
  if (!result.ok) throw new Error("delete rejected");
}

// The announcement shown at the top of the deck. Blank means no announcement.
async function fetchAnnouncement() {
  if (testMode()) return localStorage.getItem(LOCAL_ANNOUNCEMENT_KEY) || "";
  const res = await fetch(SIGNUP_URL + "?announcement=1");
  if (!res.ok) throw new Error("HTTP " + res.status);
  return (await res.json()).announcement || "";
}

async function setAnnouncement(text) {
  if (testMode()) {
    localStorage.setItem(LOCAL_ANNOUNCEMENT_KEY, text.trim());
    return;
  }
  const result = await postToBackend({ action: "announce", text });
  if (!result.ok) throw new Error("announcement rejected");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}
