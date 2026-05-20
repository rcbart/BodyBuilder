// ─── Athlete Tab ─────────────────────────────────────────────────────────────

const DAYS_SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

// ── Program Details Dialog ─────────────────────────────────────────────────────
function ProgramDialog({ data, athleteId, onSave, onClose }) {
  const [f, setF] = useState({ start_date: data.start_date || "", end_date: data.end_date || "", payment_processed: !!data.payment_processed });
  const [e, setE] = useState({});

  function validate_() {
    const err = {};
    if (f.start_date && f.end_date && f.start_date > f.end_date)
      err.end_date = "Must be after start date";
    setE(err);
    return Object.values(err).every(v => !v);
  }

  async function save() {
    if (!validate_()) return;
    await onSave(f);
    onClose();
  }

  return (
    <div className="overlay">
      <div className="dialog">
        <div className="dialog-title" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{display:"flex",alignItems:"center",gap:8}}><Icon name="clipboard" size={20} />Program Details</span>
          <DialogCloseBtn onClose={onClose}/>
        </div>
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <FF label="Start Date"><input type="date" value={f.start_date} onChange={ev => setF(p => ({ ...p, start_date: ev.target.value }))} /></FF>
          <FF label="End Date" error={e.end_date}><input type="date" className={e.end_date ? "err" : ""} value={f.end_date} onChange={ev => setF(p => ({ ...p, end_date: ev.target.value }))} /></FF>
        </div>
        <FF label="Payment Status">
          <ToggleGroup
            options={[{ value: true, label: "Processed" }, { value: false, label: "Pending" }]}
            value={f.payment_processed}
            onChange={v => setF(p => ({ ...p, payment_processed: v }))}
          />
        </FF>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}><Icon name="save" size={14} />Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Daily Calories Dialog ─────────────────────────────────────────────────────
function DailyCaloriesDialog({ athleteId, athlete, onClose, toast }) {
  const [actCals, setActCals] = useState([]);
  const [editCals, setEditCals] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    apiGet(`/athletes/${athleteId}/activity-calories`).then(data => {
      setActCals(data);
      setEditCals(data.reduce((acc, a) => ({ ...acc, [a.level]: a.additional_calories }), {}));
    }).catch(err => toast?.show(err.message || "Failed to load calorie data", "error"));
  }, [athleteId]);

  const rmr     = athlete.average || 0;
  const level   = athlete.activity_level || 1;
  const row     = actCals.find(a => a.level === level) || {};
  const mult    = row.multiplier ?? 1.2;
  const actCal  = row.additional_calories ?? 0;
  const deficit = athlete.deficit || 0;
  const tdeeVal = rmr * mult + actCal;
  const total   = Math.max(0, tdeeVal - deficit);

  async function saveLevel(lv) {
    const err = validate(editCals[lv], [rules.required, rules.numeric, rules.range(0, 5000)]);
    if (err) { setErrors(p => ({ ...p, [lv]: err })); return; }
    setSaving(lv);
    try {
      const u = await apiPut(`/athletes/${athleteId}/activity-calories/${lv}`, { additional_calories: Number(editCals[lv]) });
      setActCals(u);
      toast.show(`Level ${lv} calories updated`, "success");
    } catch (err) { toast.show(err.message, "error"); }
    setSaving(null);
  }

  return (
    <div className="overlay">
      <div className="dialog dialog-md">
        <div className="dialog-title" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{display:"flex",alignItems:"center",gap:8}}><Icon name="flame" size={20} />Daily Calorie Breakdown</span>
          <DialogCloseBtn onClose={onClose}/>
        </div>
        <div className="stat-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
          {[["RMR", rmr.toFixed(0), "kcal/day", "var(--accent)"],
            ["Multiplier", `×${mult.toFixed(3)}`, `Level ${level}`, "var(--orange)"],
            ["Deficit", `-${deficit.toFixed(0)}`, "kcal", "var(--red)"],
            ["TDEE", total.toFixed(0), "kcal/day", "var(--green)"]].map(([l, v, s, c]) => (
            <div key={l} className="stat-card">
              <div className="stat-label">{l}</div>
              <div className="stat-value" style={{ color: c, fontSize: 18 }}>{v}</div>
              <div className="stat-sub">{s}</div>
            </div>
          ))}
        </div>
        <hr className="divider" />
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Activity Level Calories</div>
        {[1,2,3,4,5].map(lv => (
          <div key={lv} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ width: 64, fontWeight: 700, color: lv === level ? "var(--accent)" : "var(--text2)", fontSize: 13 }}>
              Level {lv}{lv === level ? " ★" : ""}
            </span>
            <div style={{ flex: 1 }}>
              <input type="number" min="0" max="5000"
                className={errors[lv] ? "err" : ""}
                style={{ width: "100%", background: "var(--surface2)", border: `1px solid ${errors[lv] ? "var(--red)" : "var(--border2)"}`, borderRadius: 6, padding: "7px 10px", color: "var(--text)", fontFamily: "var(--font)", fontSize: 13 }}
                value={editCals[lv] ?? 0}
                onChange={ev => { setErrors(p => ({ ...p, [lv]: null })); setEditCals(p => ({ ...p, [lv]: ev.target.value })); }} />
              {errors[lv] && <div className="field-err">{errors[lv]}</div>}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => saveLevel(lv)} disabled={saving === lv}>
              {saving === lv ? <Spinner /> : <><Icon name="save" size={12} />Save</>}
            </button>
          </div>
        ))}
        <div className="dialog-actions"><button className="btn btn-primary" onClick={onClose}>Done</button></div>
      </div>
    </div>
  );
}

// ── Athlete Settings Tab ───────────────────────────────────────────────────────
function AthleteSettingsTab({ athleteId, toast, onAthleteUpdated }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showProg, setShowProg] = useState(false);
  const [showCals, setShowCals] = useState(false);
  const [prog, setProg] = useState({});
  const [actCals, setActCals] = useState([]); // per-level activity calories
  // Imperial height scratch state (ft + in) — synced from form.height_cm
  const [htFt, setHtFt] = useState(5);
  const [htIn, setHtIn] = useState(9);

  useEffect(() => { loadAll(); }, [athleteId]);

  async function loadAll() {
    try {
      const [ath, p, ac] = await Promise.all([
        apiGet(`/athletes/${athleteId}`),
        apiGet(`/athletes/${athleteId}/program`),
        apiGet(`/athletes/${athleteId}/activity-calories`),
      ]);
      setActCals(ac);
      setData(ath);
      setProg(p);
      const units = ath.units || "metric";
      setForm({
        name: ath.name || "", email: ath.email || "", birthdate: ath.birthdate || "",
        height_cm: ath.height_cm || 175, weight_kg: ath.weight_kg || 75,
        body_fat_pct: ath.body_fat_pct || 0, sex: ath.sex || "male",
        activity_level: ath.activity_level || 1,
        workout_days_per_week: ath.workout_days_per_week || 3,
        workout_days: ath.workout_days || [],
        workout_time: ath.workout_time || "AM",
        phase: ath.phase || "maintain",
        deficit: ath.deficit || 0,
        units,
      });
      if (units === "imperial") {
        const { ft, inches } = cmToFtIn(ath.height_cm || 175);
        setHtFt(ft); setHtIn(inches);
      }
    } catch (err) { toast.show(err.message, "error"); }
  }

  const sf = (k, v) => { setErrors(p => ({ ...p, [k]: null })); setForm(p => ({ ...p, [k]: v })); };

  // When units toggle flips, sync the height scratch state
  function switchUnits(newUnits) {
    if (newUnits === "imperial") {
      const { ft, inches } = cmToFtIn(form.height_cm);
      setHtFt(ft); setHtIn(inches);
    }
    sf("units", newUnits);
  }

  // Imperial height change handlers — update both scratch state and form.height_cm
  function onHtFtChange(val) {
    const ft = Math.max(0, Math.min(8, +val || 0));
    setHtFt(ft);
    sf("height_cm", ftInToCm(ft, htIn));
  }
  function onHtInChange(val) {
    const inches = Math.max(0, Math.min(11, +val || 0));
    setHtIn(inches);
    sf("height_cm", ftInToCm(htFt, inches));
  }

  function validateForm() {
    const e = {};
    e.name     = validate(form.name,     [rules.required, rules.maxLen(100), rules.noScript]);
    e.email    = validate(form.email,    [rules.email, rules.maxLen(200)]);
    e.birthdate= validate(form.birthdate,[rules.required]);
    e.height_cm= validate(form.height_cm,[rules.required, rules.numeric, rules.range(50, 300)]);
    e.weight_kg= validate(form.weight_kg,[rules.required, rules.numeric, rules.range(10, 500)]);
    e.body_fat_pct = validate(form.body_fat_pct, [rules.numeric, rules.range(0, 70)]);
    e.deficit  = validate(form.deficit,  [rules.numeric, rules.range(0, 2000)]);
    setErrors(e);
    return Object.values(e).every(v => !v);
  }

  async function handleSave() {
    if (!validateForm()) { toast.show("Please fix validation errors", "error"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        height_cm: +form.height_cm, weight_kg: +form.weight_kg,
        body_fat_pct: +form.body_fat_pct, activity_level: +form.activity_level,
        workout_days_per_week: +form.workout_days_per_week, deficit: +form.deficit,
      };
      const updated = await apiPut(`/athletes/${athleteId}`, payload);
      setData(updated);
      onAthleteUpdated();
      toast.show("Settings saved", "success");
    } catch (err) { toast.show(err.message, "error"); }
    setSaving(false);
  }

  function toggleDay(d) {
    const days = form.workout_days || [];
    sf("workout_days", days.includes(d) ? days.filter(x => x !== d) : [...days, d]);
  }

  const PHASES = [
    { value: "cut",      label: "Cut",      color: "var(--red)" },
    { value: "bulk",     label: "Bulk",     color: "var(--green)" },
    { value: "maintain", label: "Maintain", color: "var(--accent)" },
    { value: "prep",     label: "Prep",     color: "var(--orange)" },
  ];

  const phaseBadge = { cut: "badge-red", bulk: "badge-green", maintain: "badge-accent", prep: "badge-orange" };
  const rmr = data || {};
  // TDEE = RMR × multiplier + additional_calories − deficit
  const currentLevelRow  = actCals.find(a => a.level === +(form.activity_level || 1)) || {};
  const currentMultiplier = currentLevelRow.multiplier ?? 1.2;
  const currentAdditional = currentLevelRow.additional_calories ?? 0;
  const rawTdee = (rmr.average || 0) * currentMultiplier + currentAdditional;
  const tdee    = Math.max(0, rawTdee - (+form.deficit || 0));

  if (!data) return <LoadingState />;

  return (
    <div>
      {/* Top action bar */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginBottom: 20, flexWrap: "wrap" }}>
        <button className="btn btn-ghost" onClick={() => setShowProg(true)}>
          <Icon name="clipboard" size={14} />Program Details
        </button>
        <button className="btn btn-ghost" onClick={() => setShowCals(true)}>
          <Icon name="flame" size={14} />Daily Calories
        </button>
      </div>

      {/* TDEE Banner */}
      <div className="card" style={{ background: "linear-gradient(135deg,rgba(79,142,247,.07),rgba(124,92,191,.07))", borderColor: "var(--accent-dim)", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 28 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: .5 }}>TDEE (Total Daily Energy)</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: "var(--green)", lineHeight: 1.1 }}>
              {tdee.toFixed(0)}
              <span style={{ fontSize: 15, color: "var(--muted)", fontWeight: 400, marginLeft: 6 }}>kcal</span>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[
              ["RMR",       (rmr.average||0).toFixed(0),              "var(--accent)"],
              ["Multiplier",`×${currentMultiplier.toFixed(3)}`,        "var(--orange)"],
              ["Deficit",   `-${(+form.deficit||0).toFixed(0)} kcal`,  "var(--red)"],
              ["Phase",     form.phase,                                 "var(--text)"],
            ].map(([l, v, c]) => (
              <div key={l}>
                <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>{l}</div>
                <div style={{ fontWeight: 700, color: c, fontSize: 16, marginTop: 2 }}>
                  {l === "Phase" ? <span className={`badge ${phaseBadge[v] || "badge-accent"}`} style={{ fontSize: 13 }}>{v}</span> : v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <div className="card">
        <div className="card-title" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{display:"flex",alignItems:"center",gap:8}}><Icon name="user" size={16}/>Personal Information</span>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12,color:"var(--muted)"}}>Units:</span>
            <ToggleGroup
              options={[{value:"metric",label:"Metric"},{value:"imperial",label:"Imperial"}]}
              value={form.units||"metric"}
              onChange={switchUnits}
            />
          </div>
        </div>
        <div className="form-grid">
          <FF label="Full Name *" error={errors.name}><input value={form.name} className={errors.name?"err":""} maxLength={100} onChange={e=>sf("name",e.target.value)} placeholder="Athlete name"/></FF>
          <FF label="Email Address" error={errors.email}><input type="email" value={form.email} className={errors.email?"err":""} onChange={e=>sf("email",e.target.value)} placeholder="athlete@email.com"/></FF>
          <FF label="Date of Birth *" error={errors.birthdate}><input type="date" value={form.birthdate} className={errors.birthdate?"err":""} onChange={e=>sf("birthdate",e.target.value)}/></FF>
          <FF label="Sex">
            <ToggleGroup options={[{value:"male",label:"Male"},{value:"female",label:"Female"}]} value={form.sex} onChange={v=>sf("sex",v)}/>
          </FF>

          {/* Height — metric: single cm field; imperial: ft + in fields */}
          {form.units === "imperial" ? (
            <FF label="Height (ft / in) *" error={errors.height_cm}>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <input type="number" min="1" max="8" value={htFt} className={errors.height_cm?"err":""} onChange={e=>onHtFtChange(e.target.value)} style={{width:56}} placeholder="ft"/>
                <span style={{color:"var(--muted)",fontSize:13}}>ft</span>
                <input type="number" min="0" max="11" value={htIn} className={errors.height_cm?"err":""} onChange={e=>onHtInChange(e.target.value)} style={{width:56}} placeholder="in"/>
                <span style={{color:"var(--muted)",fontSize:13}}>in</span>
              </div>
            </FF>
          ) : (
            <FF label="Height (cm) *" error={errors.height_cm}><input type="number" min="50" max="300" value={form.height_cm} className={errors.height_cm?"err":""} onChange={e=>sf("height_cm",e.target.value)}/></FF>
          )}

          {/* Weight — converts kg ↔ lbs */}
          <FF label={`Weight (${wtLabel(form.units)}) *`} error={errors.weight_kg}>
            <input type="number" min={form.units==="imperial"?22:10} max={form.units==="imperial"?1100:500} step="0.1"
              value={wtDisplay(form.weight_kg, form.units||"metric")}
              className={errors.weight_kg?"err":""}
              onChange={e=>sf("weight_kg", wtToKg(e.target.value, form.units||"metric"))}/>
          </FF>

          <FF label="Body Fat % (optional)" error={errors.body_fat_pct}><input type="number" min="0" max="70" step="0.1" value={form.body_fat_pct} className={errors.body_fat_pct?"err":""} onChange={e=>sf("body_fat_pct",e.target.value)}/></FF>
          <FF label="Age (auto-calc)"><input readOnly value={data.age||"—"} style={{opacity:.5}}/></FF>
          <FF label={`LBM (${form.units==="imperial"?"lbs":"kg"})`}>
            <input readOnly value={data.lbm_kg ? (form.units==="imperial" ? kgToLbs(data.lbm_kg).toFixed(1) : data.lbm_kg.toFixed(1)) : "—"} style={{opacity:.5}}/>
          </FF>
        </div>
      </div>

      {/* RMR */}
      <div className="card">
        <div className="card-title"><Icon name="activity" size={16} />Resting Metabolic Rate</div>
        <div className="rmr-grid">
          {[["Mifflin-St Jeor",rmr.mifflin||0,false],["Harris-Benedict",rmr.harris||0,false],["Katch-McArdle",rmr.katch||0,false],["Average (used)",rmr.average||0,true]].map(([lbl,val,isAvg])=>(
            <div key={lbl} className="rmr-item">
              <div className="rmr-label">{lbl}</div>
              <div className={`rmr-value${isAvg?" avg":""}`}>{(val||0).toFixed(0)}</div>
              <div style={{fontSize:10,color:"var(--muted)",marginTop:4}}>kcal/day</div>
            </div>
          ))}
        </div>
      </div>

      {/* Training */}
      <div className="card">
        <div className="card-title"><Icon name="dumbbell" size={16} />Training Settings</div>
        <div className="form-grid" style={{marginBottom:16}}>
          <FF label="Activity Level (1–5)">
            <div style={{display:"flex",gap:6}}>
              {[1,2,3,4,5].map(n=>(
                <button key={n} type="button" onClick={()=>sf("activity_level",n)}
                  style={{flex:1,padding:"9px 0",borderRadius:6,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"var(--font)",fontSize:13,
                    background:form.activity_level===n?"var(--accent)":"var(--surface2)",
                    color:form.activity_level===n?"#fff":"var(--text2)"}}>{n}</button>
              ))}
            </div>
          </FF>
          <FF label="Workout Days / Week"><input type="number" min="0" max="7" value={form.workout_days_per_week} onChange={e=>sf("workout_days_per_week",e.target.value)}/></FF>
          <FF label="Workout Time">
            <ToggleGroup options={[{value:"AM",label:"AM"},{value:"PM",label:"PM"}]} value={form.workout_time} onChange={v=>sf("workout_time",v)}/>
          </FF>
        </div>
        <FF label="Available Workout Days">
          <div className="day-chip-group">
            {DAYS_SHORT.map(d=><span key={d} className={"day-chip"+((form.workout_days||[]).includes(d)?" selected":"")} onClick={()=>toggleDay(d)}>{d}</span>)}
          </div>
        </FF>
      </div>

      {/* Goal */}
      <div className="card">
        <div className="card-title"><Icon name="star" size={16} />Goal Settings</div>
        <div className="form-grid">
          <FF label="Phase" full>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {PHASES.map(p=>(
                <button key={p.value} type="button" onClick={()=>sf("phase",p.value)}
                  style={{padding:"9px 20px",borderRadius:8,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"var(--font)",fontSize:13,
                    background:form.phase===p.value?p.color:"var(--surface2)",
                    color:form.phase===p.value?"#fff":"var(--text2)"}}>{p.label}</button>
              ))}
            </div>
          </FF>
          <FF label="Daily Caloric Deficit (kcal)" error={errors.deficit}>
            <input type="number" min="0" max="2000" value={form.deficit} className={errors.deficit?"err":""} onChange={e=>sf("deficit",e.target.value)} placeholder="e.g. 300"/>
          </FF>
        </div>
      </div>

      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:32}}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{minWidth:140}}>
          {saving?<><Spinner/> Saving…</>:<><Icon name="save" size={14}/>Save Settings</>}
        </button>
      </div>

      {showProg && <ProgramDialog data={prog} athleteId={athleteId} onClose={()=>setShowProg(false)}
        onSave={async b=>{const p=await apiPut(`/athletes/${athleteId}/program`,b);setProg(p);toast.show("Program details saved","success");}}/>}
      {showCals && <DailyCaloriesDialog athleteId={athleteId} athlete={{...data,...form}} onClose={()=>setShowCals(false)} toast={toast}/>}
    </div>
  );
}

// ── Athlete Form Dialog (Create / Edit) ────────────────────────────────────────
function AthleteFormDialog({ athlete, onSave, onClose }) {
  const isNew = !athlete;
  const initUnits = athlete?.units || "metric";
  const [f, setF] = useState({
    name: athlete?.name || "", email: athlete?.email || "",
    birthdate: athlete?.birthdate || "", sex: athlete?.sex || "male",
    height_cm: athlete?.height_cm || 175, weight_kg: athlete?.weight_kg || 75,
    phase: athlete?.phase || "maintain",
    status: athlete?.status || "active",
    units: initUnits,
  });
  const [e, setE] = useState({});
  const [saving, setSaving] = useState(false);
  // Imperial height scratch state (ft + in)
  const initHt = initUnits === "imperial" ? cmToFtIn(athlete?.height_cm || 175) : { ft: 5, inches: 9 };
  const [htFt, setHtFt] = useState(initHt.ft);
  const [htIn, setHtIn] = useState(initHt.inches);

  const sf = (k, v) => { setE(p => ({ ...p, [k]: null })); setF(p => ({ ...p, [k]: v })); };

  function switchUnits(newUnits) {
    if (newUnits === "imperial") {
      const { ft, inches } = cmToFtIn(f.height_cm);
      setHtFt(ft); setHtIn(inches);
    }
    sf("units", newUnits);
  }

  function onHtFtChange(val) {
    const ft = Math.max(0, Math.min(8, +val || 0));
    setHtFt(ft);
    sf("height_cm", ftInToCm(ft, htIn));
  }
  function onHtInChange(val) {
    const inches = Math.max(0, Math.min(11, +val || 0));
    setHtIn(inches);
    sf("height_cm", ftInToCm(htFt, inches));
  }

  function validate_() {
    const err = {};
    err.name     = validate(f.name,     [rules.required, rules.maxLen(100), rules.noScript]);
    err.email    = validate(f.email,    [rules.email, rules.maxLen(200)]);
    err.height_cm= validate(f.height_cm,[rules.required, rules.numeric, rules.range(50, 300)]);
    err.weight_kg= validate(f.weight_kg,[rules.required, rules.numeric, rules.range(10, 500)]);
    setE(err);
    return Object.values(err).every(v => !v);
  }

  async function save() {
    if (!validate_()) return;
    setSaving(true);
    try {
      await onSave({ ...f, height_cm: +f.height_cm, weight_kg: +f.weight_kg });
      onClose();
    } catch (err) { setSaving(false); throw err; }
  }

  return (
    <div className="overlay" style={{zIndex:150}}>
      <div className="dialog dialog-md">
        <div className="dialog-title" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{display:"flex",alignItems:"center",gap:8}}><Icon name="user" size={20}/>{isNew?"New Athlete":"Edit Athlete"}</span>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12,color:"var(--muted)"}}>Units:</span>
            <ToggleGroup
              options={[{value:"metric",label:"Metric"},{value:"imperial",label:"Imperial"}]}
              value={f.units}
              onChange={switchUnits}
            />
          </div>
        </div>
        <div className="form-grid">
          <FF label="Full Name *" error={e.name}><input value={f.name} className={e.name?"err":""} maxLength={100} onChange={ev=>sf("name",ev.target.value)} autoFocus/></FF>
          <FF label="Email" error={e.email}><input type="email" value={f.email} className={e.email?"err":""} onChange={ev=>sf("email",ev.target.value)} placeholder="athlete@email.com"/></FF>
          <FF label="Date of Birth"><input type="date" value={f.birthdate} onChange={ev=>sf("birthdate",ev.target.value)}/></FF>
          <FF label="Sex"><ToggleGroup options={[{value:"male",label:"Male"},{value:"female",label:"Female"}]} value={f.sex} onChange={v=>sf("sex",v)}/></FF>

          {f.units === "imperial" ? (
            <FF label="Height (ft / in) *" error={e.height_cm}>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <input type="number" min="1" max="8" value={htFt} className={e.height_cm?"err":""} onChange={ev=>onHtFtChange(ev.target.value)} style={{width:56}} placeholder="ft"/>
                <span style={{color:"var(--muted)",fontSize:13}}>ft</span>
                <input type="number" min="0" max="11" value={htIn} className={e.height_cm?"err":""} onChange={ev=>onHtInChange(ev.target.value)} style={{width:56}} placeholder="in"/>
                <span style={{color:"var(--muted)",fontSize:13}}>in</span>
              </div>
            </FF>
          ) : (
            <FF label="Height (cm) *" error={e.height_cm}><input type="number" min="50" max="300" value={f.height_cm} className={e.height_cm?"err":""} onChange={ev=>sf("height_cm",ev.target.value)}/></FF>
          )}

          <FF label={`Weight (${wtLabel(f.units)}) *`} error={e.weight_kg}>
            <input type="number" min={f.units==="imperial"?22:10} max={f.units==="imperial"?1100:500} step="0.1"
              value={wtDisplay(f.weight_kg, f.units)}
              className={e.weight_kg?"err":""}
              onChange={ev=>sf("weight_kg", wtToKg(ev.target.value, f.units))}/>
          </FF>

          <FF label="Phase" full>
            <ToggleGroup
              options={["cut","bulk","maintain","prep"].map(v=>({value:v,label:v.charAt(0).toUpperCase()+v.slice(1)}))}
              value={f.phase} onChange={v=>sf("phase",v)}/>
          </FF>
          {!isNew && (
            <FF label="Status" full>
              <ToggleGroup
                options={[
                  {value:"active",   label:"Active"},
                  {value:"inactive", label:"Inactive"},
                ]}
                value={f.status}
                onChange={v => sf("status", v)}
              />
              {f.status === "inactive" && (
                <div style={{fontSize:12,color:"var(--muted)",marginTop:6}}>
                  Inactive athletes remain in the database but are visually marked as inactive.
                </div>
              )}
            </FF>
          )}
        </div>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving?<Spinner/>:<Icon name="save" size={14}/>}{isNew?"Create Athlete":"Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Manage Athletes Dialog ─────────────────────────────────────────────────────
function ManageAthletesDialog({ athletes, currentId, onSwitch, onRefresh, onClose, toast }) {
  const [showForm, setShowForm] = useState(false);
  const [editAth, setEditAth] = useState(null);
  const { confirm, Confirmer } = useConfirm();

  async function handleDelete(ath) {
    if (ath.id === currentId) { toast.show("Cannot delete the currently selected athlete", "error"); return; }
    const ok = await confirm("Delete Athlete", `Permanently delete "${ath.name}" and all their data? This cannot be undone.`);
    if (!ok) return;
    try {
      await apiDel(`/athletes/${ath.id}`);
      onRefresh();
      toast.show("Athlete deleted", "success");
    } catch (err) { toast.show(err.message, "error"); }
  }

  async function handleSave(body) {
    try {
      if (editAth) await apiPut(`/athletes/${editAth.id}`, body);
      else await apiPost("/athletes", body);
      onRefresh();
      toast.show(editAth ? "Athlete updated" : "Athlete created", "success");
    } catch (err) { toast.show(err.message, "error"); throw err; }
  }

  function initials(name) {
    return (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  }

  return (
    <div className="overlay">
      <div className="dialog dialog-md">
        <div className="dialog-title" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{display:"flex",alignItems:"center",gap:8}}><Icon name="users" size={20}/>Manage Athletes</span>
          <DialogCloseBtn onClose={onClose}/>
        </div>
        <div className="section-header" style={{marginBottom:16}}>
          <span style={{color:"var(--text2)",fontSize:13}}>{athletes.length} athlete{athletes.length!==1?"s":""}</span>
          <button className="btn btn-primary btn-sm" onClick={()=>{setEditAth(null);setShowForm(true);}}>
            <Icon name="plus" size={14}/>New Athlete
          </button>
        </div>

        {athletes.length === 0 && (
          <EmptyState icon="user" title="No Athletes Yet" message="Create your first athlete to get started." />
        )}

        {athletes.map(a => (
          <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"var(--surface2)",borderRadius:10,marginBottom:8,border:`1px solid ${a.id===currentId?"var(--accent)":"var(--border)"}`}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,var(--accent),var(--accent2))",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,color:"#fff",flexShrink:0}}>
              {initials(a.name)}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:14}}>{a.name||"Unnamed"} {a.id===currentId&&<span className="badge badge-accent" style={{marginLeft:4}}>Active</span>}</div>
              <div style={{fontSize:12,color:"var(--text2)",marginTop:1}}>{a.email||"No email"}</div>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              {a.id !== currentId && (
                <button className="btn btn-secondary btn-sm" onClick={()=>{onSwitch(a.id);onClose();}}>Select</button>
              )}
              <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>{setEditAth(a);setShowForm(true);}}><Icon name="edit" size={14}/></button>
              {a.id !== currentId && (
                <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>handleDelete(a)}><Icon name="trash" size={14}/></button>
              )}
            </div>
          </div>
        ))}

        <div className="dialog-actions">
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
      {showForm && <AthleteFormDialog athlete={editAth} onSave={handleSave} onClose={()=>{setShowForm(false);setEditAth(null);}}/>}
      {Confirmer}
    </div>
  );
}
