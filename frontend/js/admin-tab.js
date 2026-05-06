// ─── Admin Tab ────────────────────────────────────────────────────────────────

// ── Backup / Restore ──────────────────────────────────────────────────────────
function BackupRestoreSection({ toast, onClose }) {
  const [backing, setBacking]   = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Build a filename like bb-backup-2026-05-03T14-22-05.bb
  function buildFilename() {
    const now = new Date();
    const pad = n => String(n).padStart(2, "0");
    const ts = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}` +
               `T${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    return `bb-backup-${ts}.bb`;
  }

  async function handleBackup() {
    setBacking(true);
    try {
      const payload = await apiGet("/backup");
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const filename = buildFilename();

      // Use modern File System Access API (Chrome/Edge) with fallback for Safari
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: "BodyBuilder Backup",
              accept: { "application/json": [".bb"] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          toast.show("Backup saved successfully", "success");
        } catch (err) {
          if (err.name !== "AbortError") throw err;
          // User cancelled — not an error
        }
      } else {
        // Fallback: trigger standard browser download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.show("Backup downloaded", "success");
      }
    } catch (err) {
      toast.show("Backup failed: " + err.message, "error");
    }
    setBacking(false);
  }

  async function handleRestore(e) {
    const file = e.target.files?.[0];
    e.target.value = "";   // reset so the same file can be picked again
    if (!file) return;

    if (!file.name.endsWith(".bb")) {
      toast.show("Incompatible file type — please select a .bb backup file", "error");
      return;
    }

    setRestoring(true);
    try {
      const text = await file.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch (_e) {
        throw new Error("Invalid file — could not parse backup");
      }

      const result = await apiPost("/restore", payload);
      toast.show(
        `Restore complete — ${result.athletes_count} athlete${result.athletes_count === 1 ? "" : "s"} loaded`,
        "success"
      );
      // Reload the full app so all tabs reflect the restored data
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      toast.show(err.message, "error");
    }
    setRestoring(false);
  }

  return (
    <div className="card" style={{marginBottom: 24, border: "2px solid var(--accent)", boxShadow: "0 0 0 4px var(--accent-dim)"}}>
      <div className="card-header">
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Icon name="refresh_ccw" size={18} color="var(--accent)"/>
          <div className="card-title">Backup &amp; Restore</div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:"var(--muted)",display:"flex",alignItems:"center"}} title="Dismiss">
            <Icon name="x" size={16}/>
          </button>
        )}
      </div>
      <p style={{fontSize:13,color:"var(--text2)",marginBottom:20}}>
        Save a complete backup of all athletes, workouts, meals, and settings to a <code style={{background:"var(--surface2)",padding:"1px 5px",borderRadius:4,fontSize:12}}>.bb</code> file, or restore a previous backup. Backups include a checksum to detect file corruption.
      </p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        {/* Backup button */}
        <button className="btn btn-primary" onClick={handleBackup} disabled={backing || restoring} style={{minWidth:150}}>
          {backing ? <Spinner/> : <Icon name="download" size={14}/>}
          {backing ? "Creating backup…" : "Back Up Now"}
        </button>

        {/* Restore — hidden file input triggered by visible button */}
        <label style={{display:"inline-flex",alignItems:"center",gap:6,cursor: (restoring||backing)?"not-allowed":"pointer"}}>
          <input
            type="file"
            accept=".bb"
            style={{display:"none"}}
            disabled={restoring || backing}
            onChange={handleRestore}
          />
          <span className={`btn btn-secondary${restoring||backing?" disabled":""}`} style={{minWidth:150,pointerEvents:"none"}}>
            {restoring ? <Spinner/> : <Icon name="upload" size={14}/>}
            {restoring ? "Restoring…" : "Restore from Backup"}
          </span>
        </label>
      </div>

      <div style={{marginTop:16,padding:"10px 14px",background:"var(--surface2)",borderRadius:8,fontSize:12,color:"var(--muted)",display:"flex",gap:8,alignItems:"flex-start"}}>
        <Icon name="alert-triangle" size={14} color="var(--orange)" style={{flexShrink:0,marginTop:1}}/>
        <span><strong style={{color:"var(--orange)"}}>Restore replaces all current data.</strong> Back up first if you have any data you want to keep.</span>
      </div>
    </div>
  );
}

// ── Manage Athletes Section ───────────────────────────────────────────────────
function ManageAthletesSection({ athletes, currentId, onSwitch, onRefresh, toast }) {
  const [showForm, setShowForm]   = useState(false);
  const [editAth, setEditAth]     = useState(null);
  const { confirm, Confirmer }    = useConfirm();

  function initials(name) {
    return (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  }

  async function handleSave(body) {
    try {
      if (editAth) await apiPut(`/athletes/${editAth.id}`, body);
      else         await apiPost("/athletes", body);
      onRefresh();
      toast.show(editAth ? "Athlete updated" : "Athlete created", "success");
      setShowForm(false);
      setEditAth(null);
    } catch (err) { toast.show(err.message, "error"); throw err; }
  }

  async function handleDelete(ath) {
    const ok = await confirm(
      `Delete "${ath.name}"?`,
      `This will permanently delete ${ath.name} and ALL of their data — workouts, meal plans, calendar, supplements, food entries, and settings. This cannot be undone.`
    );
    if (!ok) return;
    try {
      await apiDel(`/athletes/${ath.id}`);
      // If we just deleted the active athlete, switch to the next available one
      if (ath.id === currentId) {
        const remaining = athletes.filter(a => a.id !== ath.id);
        onSwitch(remaining.length > 0 ? remaining[0].id : null);
      }
      onRefresh();
      toast.show(`${ath.name} deleted`, "success");
    } catch (err) { toast.show(err.message, "error"); }
  }

  return (
    <div className="card" style={{marginBottom:24}}>
      <div className="card-header">
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Icon name="users" size={18} color="var(--accent)"/>
          <div className="card-title">Manage Athletes</div>
          <span style={{fontSize:12,color:"var(--muted)",fontWeight:400,marginLeft:4}}>
            {athletes.length} athlete{athletes.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditAth(null); setShowForm(true); }}>
          <Icon name="plus" size={13}/>New Athlete
        </button>
      </div>

      {athletes.length === 0 ? (
        <div style={{textAlign:"center",padding:"24px 0",color:"var(--muted)",fontSize:13}}>
          No athletes yet — create one to get started.
        </div>
      ) : (
        <div style={{maxHeight:340,overflowY:"auto",marginTop:4,paddingRight:2}}>
          {athletes.map(ath => (
            <div key={ath.id} style={{
              display:"flex",alignItems:"center",gap:12,
              padding:"10px 12px",borderRadius:9,marginBottom:6,
              background:"var(--surface2)",
              border:`1px solid ${ath.id === currentId ? "var(--accent)" : "var(--border2)"}`,
            }}>
              {/* Avatar */}
              <div style={{
                width:36,height:36,borderRadius:"50%",flexShrink:0,
                background:"linear-gradient(135deg,var(--accent),var(--accent2))",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontWeight:700,fontSize:13,color:"#fff",
              }}>
                {initials(ath.name)}
              </div>

              {/* Info */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <span style={{color: ath.status === "inactive" ? "var(--muted)" : "inherit"}}>
                    {ath.name || "Unnamed"}
                  </span>
                  {ath.id === currentId && (
                    <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,
                      background:"var(--accent-dim)",color:"var(--accent)",borderRadius:4,padding:"1px 6px"}}>
                      Selected
                    </span>
                  )}
                  {ath.status === "inactive" && (
                    <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,
                      background:"var(--surface3,var(--surface2))",color:"var(--muted)",borderRadius:4,padding:"1px 6px",
                      border:"1px solid var(--border2)"}}>
                      Inactive
                    </span>
                  )}
                </div>
                <div style={{fontSize:12,color:"var(--text2)",marginTop:1}}>
                  {ath.email || <span style={{color:"var(--muted)"}}>No email</span>}
                </div>
              </div>

              {/* Actions */}
              <div style={{display:"flex",gap:5,flexShrink:0}}>
                {ath.id !== currentId && (
                  <button className="btn btn-secondary btn-sm" onClick={() => onSwitch(ath.id)}
                    title="Switch to this athlete">
                    Select
                  </button>
                )}
                <button className="btn btn-ghost btn-sm btn-icon"
                  onClick={() => { setEditAth(ath); setShowForm(true); }}
                  title="Edit athlete">
                  <Icon name="edit" size={14}/>
                </button>
                <button className="btn btn-ghost btn-sm btn-icon"
                  onClick={() => handleDelete(ath)}
                  title="Delete athlete"
                  style={{color:"var(--red)"}}>
                  <Icon name="trash" size={14}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <AthleteFormDialog
          athlete={editAth}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditAth(null); }}
        />
      )}
      {Confirmer}
    </div>
  );
}

// Standard Harris-Benedict TDEE multipliers
const STANDARD_MULTIPLIERS = [
  { level: 1, label: "Sedentary",          desc: "Little or no exercise",           value: 1.200 },
  { level: 2, label: "Lightly Active",     desc: "Light exercise 1–3 days/week",    value: 1.375 },
  { level: 3, label: "Moderately Active",  desc: "Moderate exercise 3–5 days/week", value: 1.550 },
  { level: 4, label: "Very Active",        desc: "Hard exercise 6–7 days/week",     value: 1.725 },
  { level: 5, label: "Extra Active",       desc: "Very hard exercise / physical job",value: 1.900 },
];

function AdminTab({ athleteId, toast, athletes, onRefresh, onSwitch }) {
  // ── SMTP state ──
  const [smtp, setSmtp]         = useState({ host:"", port:587, username:"", password:"", use_tls:true });
  const [smtpSaved, setSmtpSaved] = useState(false);
  const [smtpErrors, setSmtpErrors] = useState({});
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);

  // ── TDEE Multipliers state ──
  const [actCals, setActCals]       = useState([]);
  const [multEdits, setMultEdits]   = useState({});  // level → string value being edited
  const [multErrors, setMultErrors] = useState({});
  const [savingMult, setSavingMult] = useState(null); // level being saved

  // ── Send Program state ──
  const [sendEmail, setSendEmail]   = useState("");
  const [sending, setSending]       = useState(false);
  const [sendErrors, setSendErrors] = useState({});

  // ── Export state ──
  const [exporting, setExporting] = useState(false);

  // ── Backup panel visibility (dismissible when athletes exist) ──
  const [showBackup, setShowBackup] = useState(true);

  useEffect(() => { loadSmtp(); }, []);
  useEffect(() => { if (athleteId) loadMultipliers(); }, [athleteId]);

  // Pre-populate recipient email from current athlete
  useEffect(() => {
    const athlete = athletes?.find(a => a.id === athleteId);
    if (athlete?.email) setSendEmail(athlete.email);
  }, [athleteId, athletes]);

  async function loadMultipliers() {
    try {
      const d = await apiGet(`/athletes/${athleteId}/activity-calories`);
      setActCals(d);
      const edits = {};
      d.forEach(r => { edits[r.level] = r.multiplier.toFixed(3); });
      setMultEdits(edits);
    } catch(err) { toast.show("Failed to load multipliers", "error"); }
  }

  async function saveMultiplier(level) {
    const val = multEdits[level];
    const err = validate(val, [rules.required, rules.numeric, rules.range(0.5, 5.0)]);
    if (err) { setMultErrors(p => ({...p, [level]: err})); return; }
    setMultErrors(p => ({...p, [level]: null}));
    setSavingMult(level);
    try {
      const existing = actCals.find(r => r.level === level) || {};
      await apiPut(`/athletes/${athleteId}/activity-calories/${level}`, {
        multiplier: +val,
        additional_calories: existing.additional_calories || 0,
      });
      await loadMultipliers();
      toast.show(`Level ${level} multiplier saved`, "success");
    } catch(err) { toast.show(err.message, "error"); }
    setSavingMult(null);
  }

  async function resetToStandard() {
    setSavingMult("all");
    try {
      for (const s of STANDARD_MULTIPLIERS) {
        const existing = actCals.find(r => r.level === s.level) || {};
        await apiPut(`/athletes/${athleteId}/activity-calories/${s.level}`, {
          multiplier: s.value,
          additional_calories: existing.additional_calories || 0,
        });
      }
      await loadMultipliers();
      toast.show("Multipliers reset to standard values", "success");
    } catch(err) { toast.show(err.message, "error"); }
    setSavingMult(null);
  }

  async function loadSmtp() {
    try {
      const d = await apiGet("/admin/smtp");
      setSmtp(d);
    } catch(err) { /* SMTP not configured yet — use defaults */ }
  }

  // ── SMTP validation ──
  function validateSmtp() {
    const err = {};
    err.host     = validate(smtp.host,     [rules.required, rules.maxLen(200), rules.noScript]);
    err.port     = validate(smtp.port,     [rules.required, rules.numeric, rules.range(1, 65535)]);
    err.username = validate(smtp.username, [rules.required, rules.maxLen(200), rules.noScript]);
    setSmtpErrors(err);
    return Object.values(err).every(v => !v);
  }

  async function saveSmtp() {
    if (!validateSmtp()) return;
    setSavingSmtp(true);
    try {
      await apiPut("/admin/smtp", { ...smtp, port: +smtp.port });
      setSmtpSaved(true);
      toast.show("SMTP settings saved", "success");
      setTimeout(() => setSmtpSaved(false), 3000);
    } catch(err) { toast.show(err.message, "error"); }
    setSavingSmtp(false);
  }

  async function testSmtp() {
    if (!validateSmtp()) return;
    setTestingSmtp(true);
    try {
      await apiPost("/admin/test-smtp", { ...smtp, port: +smtp.port });
      toast.show("SMTP connection successful!", "success");
    } catch(err) { toast.show("SMTP test failed: " + err.message, "error"); }
    setTestingSmtp(false);
  }

  // ── Send Program validation ──
  function validateSend() {
    const err = {};
    err.sendEmail = validate(sendEmail, [rules.required, rules.email]);
    setSendErrors(err);
    return Object.values(err).every(v => !v);
  }

  async function sendProgram() {
    if (!validateSend()) return;
    setSending(true);
    try {
      await apiPost("/admin/send-program", { email: sendEmail, athlete_id: athleteId });
      toast.show("Program sent successfully!", "success");
    } catch(err) { toast.show("Failed to send: " + err.message, "error"); }
    setSending(false);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const url = `${API_BASE}/athletes/${athleteId}/export-xlsx`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Export failed");
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const athlete = athletes?.find(a => a.id === athleteId);
      const name = athlete ? athlete.name.replace(/\s+/g, "_") : "athlete";
      a.download = `${name}_program.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.show("Export downloaded", "success");
    } catch(err) { toast.show(err.message, "error"); }
    setExporting(false);
  }

  const sfSmtp = (k, v) => { setSmtpErrors(p => ({...p, [k]: null})); setSmtp(p => ({...p, [k]: v})); };
  const currentAthlete = athletes?.find(a => a.id === athleteId);

  // ── Empty-state: no athletes yet ──
  if (!athletes || athletes.length === 0) {
    return (
      <div>
        <ManageAthletesSection
          athletes={[]}
          currentId={athleteId}
          onSwitch={onSwitch}
          onRefresh={onRefresh}
          toast={toast}
        />
        {showBackup
          ? <BackupRestoreSection toast={toast} onClose={() => setShowBackup(false)}/>
          : <div style={{textAlign:"center"}}>
              <button className="btn btn-secondary" onClick={() => setShowBackup(true)}>
                <Icon name="refresh_ccw" size={13}/>Backup &amp; Restore
              </button>
            </div>
        }
      </div>
    );
  }

  return (
    <div>

      {/* ── Manage Athletes ── */}
      <ManageAthletesSection
        athletes={athletes}
        currentId={athleteId}
        onSwitch={onSwitch}
        onRefresh={onRefresh}
        toast={toast}
      />

      {/* ── Backup & Restore ── */}
      {showBackup
        ? <BackupRestoreSection toast={toast} onClose={() => setShowBackup(false)}/>
        : <div style={{marginBottom:24,textAlign:"right"}}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowBackup(true)}>
              <Icon name="refresh_ccw" size={13}/>Backup &amp; Restore
            </button>
          </div>
      }

      {/* ── TDEE Multipliers ── */}
      <div className="card" style={{marginBottom:24}}>
        <div className="card-header">
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Icon name="flame" size={18} color="var(--accent)"/>
            <div className="card-title">TDEE Activity Multipliers</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={resetToStandard} disabled={savingMult==="all"}>
            {savingMult==="all"?<Spinner/>:<Icon name="repeat" size={13}/>}Reset to Standard
          </button>
        </div>
        <p style={{fontSize:13,color:"var(--text2)",marginBottom:16}}>
          TDEE = RMR × multiplier. Standard Harris-Benedict values shown below.
          Formula per level: <code style={{background:"var(--surface2)",padding:"2px 6px",borderRadius:4,fontSize:12}}>TDEE = RMR × multiplier + additional calories − deficit</code>
        </p>

        {STANDARD_MULTIPLIERS.map(s => {
          const row = actCals.find(r => r.level === s.level) || {};
          const currentVal = multEdits[s.level] ?? s.value.toFixed(3);
          const isStandard = Math.abs((+currentVal) - s.value) < 0.0005;
          return (
            <div key={s.level} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid var(--border2)"}}>
              {/* Level badge */}
              <div style={{width:28,height:28,borderRadius:"50%",background:"var(--accent-dim)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,color:"var(--accent)",flexShrink:0}}>
                {s.level}
              </div>
              {/* Label */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:13}}>{s.label}</div>
                <div style={{fontSize:11,color:"var(--muted)"}}>{s.desc}</div>
              </div>
              {/* Standard reference */}
              <div style={{fontSize:11,color:"var(--muted)",textAlign:"right",minWidth:60}}>
                std: {s.value.toFixed(3)}
                {!isStandard && <div style={{color:"var(--orange)",fontWeight:600}}>modified</div>}
              </div>
              {/* Input */}
              <div style={{width:100}}>
                <input
                  type="number" step="0.001" min="0.5" max="5.0"
                  value={currentVal}
                  className={multErrors[s.level]?"err":""}
                  style={{width:"100%",background:"var(--surface2)",border:`1px solid ${multErrors[s.level]?"var(--red)":"var(--border2)"}`,borderRadius:6,padding:"6px 8px",color:"var(--text)",fontFamily:"var(--font)",fontSize:13,textAlign:"right"}}
                  onChange={e=>{setMultErrors(p=>({...p,[s.level]:null}));setMultEdits(p=>({...p,[s.level]:e.target.value}));}}
                />
                {multErrors[s.level]&&<div style={{fontSize:11,color:"var(--red)",marginTop:2}}>{multErrors[s.level]}</div>}
              </div>
              {/* Save button */}
              <button className="btn btn-primary btn-sm" onClick={()=>saveMultiplier(s.level)} disabled={savingMult===s.level||savingMult==="all"} style={{minWidth:64}}>
                {savingMult===s.level?<Spinner/>:<Icon name="save" size={13}/>}Save
              </button>
            </div>
          );
        })}

        {/* Live TDEE preview for current athlete */}
        {actCals.length > 0 && (() => {
          const athlete = athletes?.find(a => a.id === athleteId);
          if (!athlete) return null;
          return (
            <div style={{marginTop:16,padding:"12px 14px",background:"var(--surface2)",borderRadius:8,display:"flex",gap:24,flexWrap:"wrap"}}>
              <div style={{fontSize:12,color:"var(--muted)",flex:"0 0 100%",fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>
                Live TDEE Preview — {athlete.name}
              </div>
              {STANDARD_MULTIPLIERS.map(s=>{
                const row = actCals.find(r=>r.level===s.level)||{};
                const mult = +(multEdits[s.level]||row.multiplier||s.value);
                const rmr = athlete.average || 0;
                const tdee = Math.round(rmr * mult + (row.additional_calories||0));
                return (
                  <div key={s.level} style={{textAlign:"center"}}>
                    <div style={{fontSize:10,color:"var(--muted)",textTransform:"uppercase",fontWeight:700}}>Level {s.level}</div>
                    <div style={{fontSize:16,fontWeight:800,color:"var(--accent)"}}>{tdee}</div>
                    <div style={{fontSize:10,color:"var(--muted)"}}>kcal</div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* ── Export Section ── */}
      <div className="card" style={{marginBottom: 24}}>
        <div className="card-header">
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Icon name="download" size={18} color="var(--accent)"/>
            <div className="card-title">Export Athlete Program</div>
          </div>
        </div>
        <p style={{fontSize:13,color:"var(--text2)",marginBottom:16}}>
          Download a full program spreadsheet for <strong style={{color:"var(--text)"}}>{currentAthlete?.name || "the current athlete"}</strong> including workouts, meals, supplements, and food swaps.
        </p>
        <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
          {exporting ? <Spinner/> : <Icon name="download" size={14}/>}
          {exporting ? "Exporting…" : "Download Excel Report"}
        </button>
      </div>

      {/* ── Send Program Section ── */}
      <div className="card" style={{marginBottom: 24}}>
        <div className="card-header">
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Icon name="mail" size={18} color="var(--accent)"/>
            <div className="card-title">Email Program to Athlete</div>
          </div>
        </div>
        <p style={{fontSize:13,color:"var(--text2)",marginBottom:16}}>
          Send the full program for <strong style={{color:"var(--text)"}}>{currentAthlete?.name || "the current athlete"}</strong> as an Excel attachment via email.
        </p>
        <div style={{display:"flex",gap:10,alignItems:"flex-start",flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:220}}>
            <FF label="Recipient Email" error={sendErrors.sendEmail}>
              <input
                type="email"
                value={sendEmail}
                className={sendErrors.sendEmail ? "err" : ""}
                onChange={e => { setSendErrors(p=>({...p,sendEmail:null})); setSendEmail(e.target.value); }}
                placeholder="athlete@example.com"
                maxLength={200}
              />
            </FF>
          </div>
          <div style={{paddingTop: 22}}>
            <button className="btn btn-primary" onClick={sendProgram} disabled={sending}>
              {sending ? <Spinner/> : <Icon name="mail" size={14}/>}
              {sending ? "Sending…" : "Send Program"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Google Sheets Import ── */}
      <div className="card" style={{marginBottom: 24}}>
        <div className="card-header">
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Icon name="clipboard" size={18} color="var(--accent)"/>
            <div className="card-title">Google Sheets Import</div>
          </div>
        </div>
        <div style={{fontSize:13,color:"var(--text2)",lineHeight:1.7}}>
          <p style={{marginBottom:10}}>To import athlete data from a Google Sheet:</p>
          <ol style={{paddingLeft:20,display:"flex",flexDirection:"column",gap:6}}>
            <li>Export the athlete program using the button above.</li>
            <li>Open <a href="https://sheets.google.com" target="_blank" rel="noreferrer" style={{color:"var(--accent)"}}>Google Sheets</a> and create a new spreadsheet.</li>
            <li>Go to <strong style={{color:"var(--text)"}}>File → Import</strong> and upload the downloaded <code style={{background:"var(--surface2)",padding:"1px 5px",borderRadius:4,fontSize:12}}>.xlsx</code> file.</li>
            <li>Choose <strong style={{color:"var(--text)"}}>Replace spreadsheet</strong> and click Import.</li>
            <li>Share the sheet with your athlete using their email address.</li>
          </ol>
        </div>
      </div>

      {/* ── SMTP Configuration ── */}
      <div className="card">
        <div className="card-header">
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Icon name="settings" size={18} color="var(--accent)"/>
            <div className="card-title">SMTP Email Configuration</div>
          </div>
          {smtpSaved && (
            <div style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:"var(--green)"}}>
              <Icon name="check" size={13} color="var(--green)"/>Saved
            </div>
          )}
        </div>
        <p style={{fontSize:13,color:"var(--text2)",marginBottom:16}}>
          Configure your outgoing mail server to enable the "Email Program" feature above.
        </p>
        <div className="form-grid">
          <FF label="SMTP Host *" error={smtpErrors.host} full>
            <input
              value={smtp.host}
              className={smtpErrors.host ? "err" : ""}
              onChange={e => sfSmtp("host", e.target.value)}
              placeholder="smtp.gmail.com"
              maxLength={200}
            />
          </FF>
          <FF label="Port *" error={smtpErrors.port}>
            <input
              type="number"
              value={smtp.port}
              className={smtpErrors.port ? "err" : ""}
              onChange={e => sfSmtp("port", e.target.value)}
              min={1} max={65535}
            />
          </FF>
          <FF label="Use TLS">
            <ToggleGroup
              options={[{value:true,label:"TLS On"},{value:false,label:"TLS Off"}]}
              value={smtp.use_tls}
              onChange={v => sfSmtp("use_tls", v)}
            />
          </FF>
          <FF label="Username *" error={smtpErrors.username} full>
            <input
              value={smtp.username}
              className={smtpErrors.username ? "err" : ""}
              onChange={e => sfSmtp("username", e.target.value)}
              placeholder="your@email.com"
              maxLength={200}
              autoComplete="off"
            />
          </FF>
          <FF label="Password" full>
            <input
              type="password"
              value={smtp.password}
              onChange={e => sfSmtp("password", e.target.value)}
              placeholder="App password or SMTP password"
              maxLength={300}
              autoComplete="new-password"
            />
          </FF>
        </div>
        <div className="dialog-actions" style={{marginTop:16}}>
          <button className="btn btn-secondary" onClick={testSmtp} disabled={testingSmtp || savingSmtp}>
            {testingSmtp ? <Spinner/> : <Icon name="activity" size={14}/>}
            {testingSmtp ? "Testing…" : "Test Connection"}
          </button>
          <button className="btn btn-primary" onClick={saveSmtp} disabled={savingSmtp || testingSmtp}>
            {savingSmtp ? <Spinner/> : <Icon name="save" size={14}/>}
            {savingSmtp ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>

    </div>
  );
}
