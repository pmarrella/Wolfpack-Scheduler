// ─────────────────────────────────────────────────────────────────────────────
// WOLFPACK SCHEDULER — Google Apps Script Backend
// Deploy this as a Web App in Google Sheets (Extensions > Apps Script)
// Set: Execute as = Me, Who has access = Anyone
// ─────────────────────────────────────────────────────────────────────────────

const SHEET_NAME_ROUNDS   = "Rounds";
const SHEET_NAME_PLAYERS  = "Players";
const SHEET_NAME_ROSTER   = "Roster";

function doGet(e) {
  return handleRequest(e);
}
function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const params = e.parameter;
  const body   = e.postData ? JSON.parse(e.postData.contents) : {};
  const action = params.action || body.action;

  let result;
  try {
    switch(action) {
      case "getRounds":   result = getRounds();               break;
      case "saveRound":   result = saveRound(body);           break;
      case "deleteRound": result = deleteRound(body.id);      break;
      case "getPlayers":  result = getPlayers(body.roundId);  break;
      case "setResponse": result = setResponse(body);         break;
      case "removePlayer":result = removePlayer(body);        break;
      case "getRoster":   result = getRoster();               break;
      case "saveRoster":  result = saveRoster(body.roster);   break;
      default: result = { error: "Unknown action: " + action };
    }
  } catch(err) {
    result = { error: err.toString() };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Sheets helpers ────────────────────────────────────────────────────────────
function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

// ── Rounds ────────────────────────────────────────────────────────────────────
// Columns: id | date | teeTime | notes | createdAt
function getRounds() {
  const sheet = getOrCreateSheet(SHEET_NAME_ROUNDS, ["id","date","teeTime","notes","createdAt"]);
  const data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return { rounds: [] };
  const rounds = data.slice(1).map(r => ({
    id: r[0], date: r[1], teeTime: r[2], notes: r[3], createdAt: r[4]
  })).filter(r => r.id);
  return { rounds };
}

function saveRound(body) {
  const sheet = getOrCreateSheet(SHEET_NAME_ROUNDS, ["id","date","teeTime","notes","createdAt"]);
  const data  = sheet.getDataRange().getValues();
  const id    = body.id || "r-" + Date.now();
  // Look for existing row
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === body.id) {
      sheet.getRange(i + 1, 1, 1, 5).setValues([[id, body.date, body.teeTime, body.notes||"", data[i][4]]]);
      return { ok: true, id };
    }
  }
  // New row
  sheet.appendRow([id, body.date, body.teeTime, body.notes||"", new Date().toISOString()]);
  return { ok: true, id };
}

function deleteRound(id) {
  const sheet = getOrCreateSheet(SHEET_NAME_ROUNDS, ["id","date","teeTime","notes","createdAt"]);
  const data  = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === id) { sheet.deleteRow(i + 1); break; }
  }
  // Also delete all player responses for this round
  const pSheet = getOrCreateSheet(SHEET_NAME_PLAYERS, ["roundId","name","status","guests","updatedAt"]);
  const pData  = pSheet.getDataRange().getValues();
  for (let i = pData.length - 1; i >= 1; i--) {
    if (pData[i][0] === id) pSheet.deleteRow(i + 1);
  }
  return { ok: true };
}

// ── Players ───────────────────────────────────────────────────────────────────
// Columns: roundId | name | status | guests | updatedAt
function getPlayers(roundId) {
  const sheet = getOrCreateSheet(SHEET_NAME_PLAYERS, ["roundId","name","status","guests","updatedAt"]);
  const data  = sheet.getDataRange().getValues();
  const players = data.slice(1)
    .filter(r => r[0] === roundId && r[1])
    .map(r => ({ roundId: r[0], name: r[1], status: r[2], guests: Number(r[3])||0 }));
  return { players };
}

function setResponse(body) {
  const sheet = getOrCreateSheet(SHEET_NAME_PLAYERS, ["roundId","name","status","guests","updatedAt"]);
  const data  = sheet.getDataRange().getValues();
  const now   = new Date().toISOString();
  // Update if exists
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === body.roundId && data[i][1].toLowerCase() === body.name.toLowerCase()) {
      sheet.getRange(i + 1, 1, 1, 5).setValues([[body.roundId, body.name, body.status, body.guests||0, now]]);
      return { ok: true };
    }
  }
  // New row
  sheet.appendRow([body.roundId, body.name, body.status, body.guests||0, now]);
  return { ok: true };
}

function removePlayer(body) {
  const sheet = getOrCreateSheet(SHEET_NAME_PLAYERS, ["roundId","name","status","guests","updatedAt"]);
  const data  = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === body.roundId && data[i][1] === body.name) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: true };
}

// ── Roster ────────────────────────────────────────────────────────────────────
function getRoster() {
  const sheet = getOrCreateSheet(SHEET_NAME_ROSTER, ["name"]);
  const data  = sheet.getDataRange().getValues();
  const roster = data.slice(1).map(r => r[0]).filter(Boolean);
  return { roster };
}

function saveRoster(roster) {
  const sheet = getOrCreateSheet(SHEET_NAME_ROSTER, ["name"]);
  sheet.clearContents();
  sheet.appendRow(["name"]);
  roster.forEach(name => sheet.appendRow([name]));
  return { ok: true };
}
