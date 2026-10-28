// Shared bits for the steamy boat pages.

// Paste your Google Apps Script web app URL here (see README.md).
// While this is blank, signups are only saved in your own browser (test mode).
const SIGNUP_URL = "https://script.google.com/macros/s/AKfycbw1wT-NcX9f3eFeGUPVjZyYntiwkT7LiG5Dr0hy32_AMA6kzHTpfkZxutEQ4lOBZgk/exec";

const GATE_KEY = "steamy-boat-aboard";
const LOCAL_SIGNUPS_KEY = "steamy-boat-test-signups";

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

async function addSignup(signup) {
  const entry = { ...signup, timestamp: new Date().toISOString() };
  if (testMode()) {
    const list = readLocalSignups();
    list.push(entry);
    localStorage.setItem(LOCAL_SIGNUPS_KEY, JSON.stringify(list));
    return;
  }
  // text/plain keeps this a "simple" request so Apps Script doesn't need CORS preflight.
  const res = await fetch(SIGNUP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}
