import { useState, useEffect, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "";
const DEFAULT_ROSTER = ["Paul","Mike","Dave","Tom","Chris","Jim","Steve","Bob","Dan","Rick"];
const MANAGER_PIN = "1234";

const T = {
  bg:"#000000", card:"#111111", accent:"#FFFFFF", text:"#FFFFFF", subtext:"#888888",
  danger:"#E05252", inBg:"#0A1A0A", inBorder:"#2E6A2E", outBg:"#1A0A0A", outBorder:"#6A2E2E",
  pillBg:"#222222", headerFont:"'Arial Black','Impact',sans-serif", bodyFont:"'Arial',sans-serif",
  name:"🐺 Wolfpack", tagline:"Who's in this week?",
  slotEmpty:"#222222", slotFilled:"#FFFFFF", slotGuest:"#555555",
  border:"#333333", btnTextOnAccent:"#000000",
};

const GROUP_SIZES = [4, 5, 6];

async function api(action, body = {}) {
  if (!API_URL) throw new Error("API_URL not configured");
  const url = `${API_URL}?action=${action}`;
  const res = await fetch(url, { method: "POST", body: JSON.stringify({ action, ...body }) });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
}

function isRoundPast(dateStr) {
  if (!dateStr) return false;
  const yr = new Date().getFullYear();
  let d = new Date(`${dateStr}, ${yr}`);
  if (isNaN(d)) return false;
  if (d < new Date() - 60 * 86400000) d = new Date(`${dateStr}, ${yr + 1}`);
  const today = new Date(); today.setHours(0,0,0,0);
  return d < today;
}

function sortRounds(rounds) {
  return [...rounds].sort((a, b) => {
    const yr = new Date().getFullYear();
    let da = new Date(`${a.date}, ${yr}`), db = new Date(`${b.date}, ${yr}`);
    if (isNaN(da) && isNaN(db)) return 0;
    if (isNaN(da)) return 1; if (isNaN(db)) return -1;
    return da - db;
  });
}

function btn(bg, color, fontSize = 14) {
  return { background: bg, color, border: "none", borderRadius: 8,
    padding: fontSize <= 11 ? "5px 10px" : "10px 18px",
    fontSize, fontWeight: 700, cursor: "pointer" };
}
function inp() {
  return { width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 14,
    border: `1.5px solid ${T.border}`, background: "#1A1A1A",
    color: T.text, fontFamily: T.bodyFont, boxSizing: "border-box", outline: "none" };
}

function FoursomeSlots({ players, groupSize }) {
  const gs = groupSize || 4;
  const total = players.reduce((s, p) => s + 1 + (p.guests || 0), 0);
  const groups = Math.max(1, Math.ceil(total / gs));
  let filled = [];
  players.forEach(p => {
    filled.push({ name: p.name, guest: false });
    for (let i = 0; i < (p.guests || 0); i++) filled.push({ name: p.name, guest: true });
  });
  const spotsOpen = (groups * gs) - total;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: T.subtext, textTransform: "uppercase", letterSpacing: 1 }}>
          Groups of {gs}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>
          {total} player{total !== 1 ? "s" : ""} · {groups} group{groups !== 1 ? "s" : ""}
          {spotsOpen > 0 && total > 0 && <span style={{ color: T.subtext, fontWeight: 400 }}> ({spotsOpen} open)</span>}
        </span>
      </div>
      {Array.from({ length: groups }).map((_, gi) => (
        <div key={gi} style={{ display: "flex", gap: 5, marginBottom: 5 }}>
          {Array.from({ length: gs }).map((_, si) => {
            const pl = filled[gi * gs + si];
            return (
              <div key={si} style={{ flex: 1, height: 46, borderRadius: 7,
                background: pl ? (pl.guest ? T.slotGuest : T.slotFilled) : T.slotEmpty,
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", padding: "2px 3px", transition: "background 0.3s" }}>
                {pl && <span style={{ fontSize: 10, fontWeight: 700,
                  color: pl.guest ? "#ccc" : T.btnTextOnAccent,
                  textAlign: "center", lineHeight: 1.2, wordBreak: "break-word" }}>
                  {pl.guest ? `★${pl.name.split(" ")[0]}` : pl.name.split(" ")[0]}
                </span>}
              </div>
            );
          })}
        </div>
      ))}
      {total === 0 && <p style={{ fontSize: 13, color: T.subtext, textAlign: "center", margin: "6px 0" }}>No one in yet — be the first!</p>}
    </div>
  );
}

function RoundCard({ round, isSelected, onClick, isManager, onCancel, onEdit, players }) {
  const gs = round.groupSize || 4;
  const inCount = players.filter(p => p.status === "in").reduce((s, p) => s + 1 + (p.guests || 0), 0);
  const past = isRoundPast(round.date);
  return (
    <div onClick={onClick} style={{ background: isSelected ? T.accent : T.card, borderRadius: 12,
      padding: "13px 15px", marginBottom: 7, border: `1.5px solid ${isSelected ? T.accent : T.border}`,
      cursor: "pointer", opacity: past ? 0.45 : 1, transition: "all 0.2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: T.headerFont, fontSize: 16, fontWeight: 900, color: isSelected ? T.btnTextOnAccent : T.text }}>
            {round.date}
          </div>
          <div style={{ fontSize: 12, color: isSelected ? T.btnTextOnAccent : T.subtext, marginTop: 2 }}>
            {round.teeTime} · Groups of {gs}{past ? " · ⏰ Past" : ""}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ background: isSelected ? T.btnTextOnAccent : T.pillBg,
            color: isSelected ? T.accent : T.text, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
            {inCount} in
          </div>
          {isManager && <>
            <button onClick={e => { e.stopPropagation(); onEdit(round); }}
              style={{ ...btn(isSelected ? T.btnTextOnAccent : T.accent, isSelected ? T.accent : T.btnTextOnAccent, 10), padding: "3px 8px" }}>Edit</button>
            <button onClick={e => { e.stopPropagation(); onCancel(round.id); }}
              style={{ ...btn(T.danger, "#fff", 10), padding: "3px 8px" }}>✕</button>
          </>}
        </div>
      </div>
      {round.notes && <div style={{ fontSize: 11, color: isSelected ? T.btnTextOnAccent : T.subtext, marginTop: 4, fontStyle: "italic" }}>📋 {round.notes}</div>}
    </div>
  );
}

export default function App() {
  const [tab, setTab]               = useState("rounds");
  const [managerUnlocked, setMU]    = useState(false);
  const [pinInput, setPinInput]     = useState("");
  const [pinError, setPinError]     = useState(false);
  const [rounds, setRounds]         = useState([]);
  const [allPlayers, setAllPlayers] = useState({});
  const [roster, setRoster]         = useState(DEFAULT_ROSTER);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [syncing, setSyncing]       = useState(false);
  const [error, setError]           = useState("");
  const [myName, setMyName]         = useState("");
  const [myGuests, setMyGuests]     = useState(0);
  const [responded, setResponded]   = useState(false);
  const [schedForm, setSchedForm]   = useState({ date: "", teeTime: "", notes: "", groupSize: 4 });
  const [editingId, setEditingId]   = useState(null);
  const [rosterEdit, setRosterEdit] = useState("");

  const loadAll = useCallback(async (silent = false) => {
    if (!API_URL) { setLoading(false); setError("⚠️ API not configured. See setup guide."); return; }
    try {
      if (!silent) setLoading(true);
      const [rRes, rosRes] = await Promise.all([api("getRounds"), api("getRoster")]);
      const active = (rRes.rounds || []).filter(r => !isRoundPast(r.date));
      const sorted = sortRounds(active);
      setRounds(sorted);
      setRoster(rosRes.roster?.length ? rosRes.roster : DEFAULT_ROSTER);
      const playerMap = {};
      await Promise.all(sorted.map(async r => {
        const pRes = await api("getPlayers", { roundId: r.id });
        playerMap[r.id] = pRes.players || [];
      }));
      setAllPlayers(playerMap);
      if (sorted.length > 0 && !selectedId) setSelectedId(sorted[0].id);
      setError("");
    } catch { setError("Could not connect to server."); }
    finally { setLoading(false); }
  }, [selectedId]);

  useEffect(() => { loadAll(); }, []);
  // Silent refresh every 30 seconds — no loading flash
  useEffect(() => { const i = setInterval(() => loadAll(true), 30000); return () => clearInterval(i); }, [loadAll]);

  const sel = rounds.find(r => r.id === selectedId) || null;
  const roundPlayers = (selectedId && allPlayers[selectedId]) || [];
  const inPlayers = roundPlayers.filter(p => p.status === "in");
  const outPlayers = roundPlayers.filter(p => p.status === "out");

  const handleRespond = async (status) => {
    if (!myName.trim() || !selectedId) return;
    setSyncing(true);
    try {
      await api("setResponse", { roundId: selectedId, name: myName.trim(), status, guests: myGuests });
      await loadAll(true); setResponded(true);
    } catch { setError("Could not save response."); }
    setSyncing(false);
  };

  const handleRemovePlayer = async (name) => {
    if (!selectedId) return;
    setSyncing(true);
    try { await api("removePlayer", { roundId: selectedId, name }); await loadAll(true); }
    catch { setError("Could not remove player."); }
    setSyncing(false);
  };

  const handleSchedule = async () => {
    if (!schedForm.date || !schedForm.teeTime) return;
    setSyncing(true);
    try {
      const res = await api("saveRound", { id: editingId || undefined, ...schedForm, course: "Ledgerock" });
      await loadAll(true); setSelectedId(editingId || res.id);
      setSchedForm({ date: "", teeTime: "", notes: "", groupSize: 4 }); setEditingId(null); setTab("rounds");
    } catch { setError("Could not save round."); }
    setSyncing(false);
  };

  const handleCancelRound = async (id) => {
    if (!window.confirm("Remove this round?")) return;
    setSyncing(true);
    try {
      await api("deleteRound", { id }); await loadAll(true);
      if (selectedId === id) setSelectedId(rounds.filter(r => r.id !== id)[0]?.id || null);
    } catch { setError("Could not remove round."); }
    setSyncing(false);
  };

  const handlePin = () => {
    if (pinInput === MANAGER_PIN) { setMU(true); setPinError(false); setRosterEdit(roster.join("\n")); }
    else setPinError(true);
  };

  const handleSaveRoster = async () => {
    const nr = rosterEdit.split("\n").map(s => s.trim()).filter(Boolean);
    setSyncing(true);
    try { await api("saveRoster", { roster: nr }); setRoster(nr); alert("Roster saved!"); }
    catch { setError("Could not save roster."); }
    setSyncing(false);
  };

  const startEdit = rd => {
    setEditingId(rd.id);
    setSchedForm({ date: rd.date, teeTime: rd.teeTime, notes: rd.notes || "", groupSize: rd.groupSize || 4 });
    setTab("schedule");
  };

  const copyInvite = () => {
    if (!sel) return;
    const msg = `Hey! 🐺 Wolfpack is teeing off ${sel.date} at ${sel.teeTime} — Ledgerock. Are you in? Mark yourself here: ${window.location.href}`;
    navigator.clipboard.writeText(msg); alert("Invite copied!");
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: T.subtext, fontSize: 16, fontFamily: T.bodyFont }}>Loading Wolfpack...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.bodyFont }}>
      <div style={{ background: T.card, borderBottom: `2px solid ${T.accent}`, padding: "13px 16px 0" }}>
        <div style={{ fontFamily: T.headerFont, fontSize: 26, fontWeight: 900, color: T.accent, letterSpacing: -0.5 }}>🐺 Wolfpack</div>
        <div style={{ fontSize: 12, color: T.subtext, marginBottom: 9 }}>{T.tagline}</div>
        {syncing && <div style={{ fontSize: 11, color: T.subtext, marginBottom: 4 }}>⏳ Saving...</div>}
        {error && <div style={{ fontSize: 12, color: T.danger, marginBottom: 6 }}>{error}</div>}
        <div style={{ display: "flex", borderTop: `1px solid ${T.border}` }}>
          {[{ id: "rounds", label: "Rounds" }, { id: "schedule", label: "+ Add Round" }, { id: "manager", label: "⚙ Manager" }].map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              flex: 1, padding: "9px 4px", background: "transparent", border: "none",
              borderBottom: tab === tb.id ? `3px solid ${T.accent}` : "3px solid transparent",
              color: tab === tb.id ? T.accent : T.subtext,
              fontWeight: tab === tb.id ? 700 : 400, fontSize: 12, cursor: "pointer", fontFamily: T.bodyFont,
            }}>{tb.label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "16px 13px 50px" }}>

        {/* ROUNDS TAB */}
        {tab === "rounds" && (<>
          {rounds.length === 0 ? (
            <div style={{ background: T.card, borderRadius: 14, padding: 28, border: `1.5px dashed ${T.border}`, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>⛳</div>
              <div style={{ color: T.subtext, fontSize: 14, marginBottom: 14 }}>No rounds scheduled yet.</div>
              <button onClick={() => setTab("schedule")} style={btn(T.accent, T.btnTextOnAccent)}>Schedule a Round</button>
            </div>
          ) : (<>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.subtext, textTransform: "uppercase", letterSpacing: 1, marginBottom: 7 }}>Upcoming · tap to view</div>
              {rounds.map(rd => (
                <RoundCard key={rd.id} round={rd} players={allPlayers[rd.id] || []}
                  isSelected={rd.id === selectedId}
                  onClick={() => { setSelectedId(rd.id); setResponded(false); setMyName(""); setMyGuests(0); }}
                  isManager={managerUnlocked} onCancel={handleCancelRound} onEdit={startEdit} />
              ))}
            </div>

            {sel && (
              <div style={{ background: T.card, borderRadius: 14, padding: 17, border: `1px solid ${T.border}`, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 13 }}>
                  <div>
                    <div style={{ fontFamily: T.headerFont, fontSize: 20, fontWeight: 900, color: T.accent }}>{sel.date}</div>
                    <div style={{ fontSize: 13, color: T.subtext }}>Ledgerock · {sel.teeTime} · Groups of {sel.groupSize || 4}</div>
                    {sel.notes && <div style={{ fontSize: 12, color: T.subtext, fontStyle: "italic", marginTop: 3 }}>📋 {sel.notes}</div>}
                  </div>
                  <button onClick={() => loadAll(true)} style={{ ...btn(T.pillBg, T.subtext, 11) }}>↻</button>
                </div>

                <FoursomeSlots players={inPlayers} groupSize={sel.groupSize || 4} />

                {!responded ? (<>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.subtext, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 7 }}>Your Response</div>
                  <input placeholder="Your name" value={myName} onChange={e => setMyName(e.target.value)} style={{ ...inp(), marginBottom: 7 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
                    <label style={{ fontSize: 13, color: T.subtext, whiteSpace: "nowrap" }}>Guests bringing:</label>
                    <select value={myGuests} onChange={e => setMyGuests(Number(e.target.value))} style={{ ...inp(), width: "auto", flex: 1 }}>
                      {[0,1,2,3].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleRespond("in")} disabled={!myName.trim() || syncing}
                      style={{ ...btn("#2E6A2E", "#fff"), flex: 1, opacity: myName.trim() ? 1 : 0.4 }}>✅ I'm In</button>
                    <button onClick={() => handleRespond("out")} disabled={!myName.trim() || syncing}
                      style={{ ...btn("#8A3030", "#fff"), flex: 1, opacity: myName.trim() ? 1 : 0.4 }}>❌ Can't Make It</button>
                  </div>
                </>) : (
                  <div style={{ background: T.inBg, border: `1.5px solid ${T.inBorder}`, borderRadius: 10, padding: 13, textAlign: "center" }}>
                    <div style={{ fontSize: 22, marginBottom: 3 }}>👍</div>
                    <div style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>Recorded, {myName}!</div>
                    <button onClick={() => { setResponded(false); setMyName(""); setMyGuests(0); }}
                      style={{ ...btn(T.pillBg, T.subtext, 12), marginTop: 8 }}>Change my response</button>
                  </div>
                )}

                <button onClick={copyInvite} style={{ ...btn(T.accent, T.btnTextOnAccent), width: "100%", marginTop: 13 }}>📋 Copy Invite Message</button>

                {inPlayers.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.subtext, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>
                      In ({inPlayers.reduce((s, p) => s + 1 + (p.guests || 0), 0)} spots)
                    </div>
                    {inPlayers.map(p => (
                      <div key={p.name} style={{ background: T.inBg, border: `1px solid ${T.inBorder}`, borderRadius: 8, padding: "8px 11px", marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>{p.name}</span>
                          {p.guests > 0 && <span style={{ fontSize: 12, color: T.subtext, marginLeft: 7 }}>+{p.guests} guest{p.guests > 1 ? "s" : ""}</span>}
                        </div>
                        {managerUnlocked && <button onClick={() => handleRemovePlayer(p.name)} style={{ background: "none", border: "none", color: T.danger, cursor: "pointer", fontSize: 18 }}>×</button>}
                      </div>
                    ))}
                  </div>
                )}
                {outPlayers.length > 0 && (
                  <div style={{ marginTop: 11 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.subtext, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Out ({outPlayers.length})</div>
                    {outPlayers.map(p => (
                      <div key={p.name} style={{ background: T.outBg, border: `1px solid ${T.outBorder}`, borderRadius: 8, padding: "8px 11px", marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: T.subtext, fontSize: 14, textDecoration: "line-through" }}>{p.name}</span>
                        {managerUnlocked && <button onClick={() => handleRemovePlayer(p.name)} style={{ background: "none", border: "none", color: T.danger, cursor: "pointer", fontSize: 18 }}>×</button>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>)}
        </>)}

        {/* SCHEDULE TAB */}
        {tab === "schedule" && (
          <div style={{ background: T.card, borderRadius: 14, padding: 20, border: `1px solid ${T.border}` }}>
            <div style={{ fontFamily: T.headerFont, fontSize: 18, fontWeight: 900, color: T.accent, marginBottom: 3 }}>
              {editingId ? "Edit Round" : "Add a Round"}
            </div>
            <div style={{ fontSize: 12, color: T.subtext, marginBottom: 14 }}>Course: Ledgerock</div>
            {[
              { label: "Date", key: "date", placeholder: "Thursday, July 10" },
              { label: "Tee Time", key: "teeTime", placeholder: "8:30 AM" },
              { label: "Notes (optional)", key: "notes", placeholder: "Cart path only, bring rain gear" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 11 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.subtext, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>{f.label}</label>
                <input placeholder={f.placeholder} value={schedForm[f.key]}
                  onChange={e => setSchedForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={inp()} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.subtext, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Group Size</label>
              <div style={{ display: "flex", gap: 8 }}>
                {GROUP_SIZES.map(n => (
                  <button key={n} onClick={() => setSchedForm(prev => ({ ...prev, groupSize: n }))}
                    style={{ ...btn(schedForm.groupSize === n ? T.accent : T.pillBg, schedForm.groupSize === n ? T.btnTextOnAccent : T.subtext), flex: 1 }}>
                    {n}-man
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={handleSchedule} disabled={!schedForm.date || !schedForm.teeTime || syncing}
                style={{ ...btn(T.accent, T.btnTextOnAccent), flex: 2, opacity: (!schedForm.date || !schedForm.teeTime) ? 0.4 : 1 }}>
                {editingId ? "Save Changes" : "Post Round"}
              </button>
              <button onClick={() => { setTab("rounds"); setEditingId(null); setSchedForm({ date: "", teeTime: "", notes: "", groupSize: 4 }); }}
                style={{ ...btn(T.pillBg, T.subtext), flex: 1 }}>Cancel</button>
            </div>
          </div>
        )}

        {/* MANAGER TAB */}
        {tab === "manager" && (
          <div>
            {!managerUnlocked ? (
              <div style={{ background: T.card, borderRadius: 14, padding: 24, border: `1px solid ${T.border}`, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
                <div style={{ color: T.text, fontWeight: 700, marginBottom: 4 }}>Manager Access</div>
                <div style={{ color: T.subtext, fontSize: 13, marginBottom: 15 }}>Enter the manager PIN.</div>
                <input type="password" placeholder="PIN" value={pinInput} onChange={e => setPinInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handlePin()}
                  style={{ ...inp(), textAlign: "center", letterSpacing: 8, marginBottom: 9 }} />
                {pinError && <div style={{ color: T.danger, fontSize: 13, marginBottom: 8 }}>Incorrect PIN.</div>}
                <button onClick={handlePin} style={{ ...btn(T.accent, T.btnTextOnAccent), width: "100%" }}>Unlock</button>
                <div style={{ color: T.subtext, fontSize: 11, marginTop: 11 }}>Default PIN: 1234</div>
              </div>
            ) : (
              <div>
                <div style={{ fontFamily: T.headerFont, fontSize: 18, fontWeight: 900, color: T.accent, marginBottom: 13 }}>Manager Controls</div>
                {rounds.length > 0 && (
                  <div style={{ background: T.card, borderRadius: 14, padding: 17, border: `1px solid ${T.border}`, marginBottom: 13 }}>
                    <div style={{ fontWeight: 700, color: T.text, marginBottom: 9 }}>All Scheduled Rounds</div>
                    {rounds.map(rd => (
                      <div key={rd.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>
                        <div>
                          <div style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>{rd.date}</div>
                          <div style={{ fontSize: 12, color: T.subtext }}>{rd.teeTime} · {rd.groupSize || 4}-man · {(allPlayers[rd.id] || []).filter(p => p.status === "in").reduce((s, p) => s + 1 + (p.guests || 0), 0)} in</div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => startEdit(rd)} style={{ ...btn(T.accent, T.btnTextOnAccent, 11) }}>Edit</button>
                          <button onClick={() => handleCancelRound(rd.id)} style={{ ...btn(T.danger, "#fff", 11) }}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ background: T.card, borderRadius: 14, padding: 17, border: `1px solid ${T.border}`, marginBottom: 13 }}>
                  <div style={{ fontWeight: 700, color: T.text, marginBottom: 5 }}>Group Roster</div>
                  <div style={{ color: T.subtext, fontSize: 12, marginBottom: 7 }}>One name per line.</div>
                  <textarea value={rosterEdit} onChange={e => setRosterEdit(e.target.value)} rows={10}
                    style={{ ...inp(), resize: "vertical" }} />
                  <button onClick={handleSaveRoster} style={{ ...btn(T.accent, T.btnTextOnAccent), width: "100%", marginTop: 9 }}>Save Roster</button>
                </div>
                {sel && roundPlayers.length > 0 && (
                  <div style={{ background: T.card, borderRadius: 14, padding: 17, border: `1px solid ${T.border}` }}>
                    <div style={{ fontWeight: 700, color: T.text, marginBottom: 9 }}>Remove Response — {sel.date}</div>
                    {roundPlayers.map(p => (
                      <div key={p.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                        <span style={{ color: T.text, fontSize: 14 }}>
                          {p.name} <span style={{ color: p.status === "in" ? T.inBorder : T.outBorder, fontSize: 12 }}>({p.status})</span>
                          {p.guests > 0 && <span style={{ color: T.subtext, fontSize: 12 }}> +{p.guests}g</span>}
                        </span>
                        <button onClick={() => handleRemovePlayer(p.name)} style={{ ...btn(T.danger, "#fff", 11), padding: "4px 9px" }}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
