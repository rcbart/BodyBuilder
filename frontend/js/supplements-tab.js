// ─── Supplements Tab ──────────────────────────────────────────────────────────

const WEEK_DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

function SupplementDialog({ supplement, athleteId, defaultDay, onSave, onClose }) {
  const isNew = !supplement;
  const [f, setF] = useState({
    day_of_week: supplement?.day_of_week || defaultDay || "Monday",
    name: supplement?.name || "",
    dosage: supplement?.dosage || "",
    time_of_day: supplement?.time_of_day || "AM",
  });
  const [e, setE] = useState({});
  const [saving, setSaving] = useState(false);
  const sf = (k,v) => { setE(p=>({...p,[k]:null})); setF(p=>({...p,[k]:v})); };

  function validate_() {
    const err = {};
    err.name   = validate(f.name,   [rules.required, rules.maxLen(100), rules.noScript]);
    err.dosage = validate(f.dosage, [rules.maxLen(80), rules.noScript]);
    setE(err);
    return Object.values(err).every(v=>!v);
  }

  async function save() {
    if (!validate_()) return;
    setSaving(true);
    try {
      if (supplement) {
        await apiPut(`/athletes/${athleteId}/supplements/${supplement.id}`, f);
      } else {
        await apiPost(`/athletes/${athleteId}/supplements`, f);
      }
      onSave();
      onClose();
    } catch(err) { setSaving(false); }
  }

  return (
    <div className="overlay" style={{zIndex:150}}>
      <div className="dialog">
        <div className="dialog-title"><Icon name="pill" size={20}/>{isNew?"Add Supplement":"Edit Supplement"}</div>
        <div className="form-grid">
          <FF label="Day">
            <select value={f.day_of_week} onChange={ev=>sf("day_of_week",ev.target.value)}>
              {WEEK_DAYS.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </FF>
          <FF label="Time">
            <ToggleGroup options={[{value:"AM",label:"AM"},{value:"PM",label:"PM"}]} value={f.time_of_day} onChange={v=>sf("time_of_day",v)}/>
          </FF>
          <FF label="Supplement Name *" error={e.name} full>
            <input value={f.name} className={e.name?"err":""} maxLength={100} onChange={ev=>sf("name",ev.target.value)} placeholder="e.g. Creatine Monohydrate" autoFocus/>
          </FF>
          <FF label="Dosage" error={e.dosage} full>
            <input value={f.dosage} className={e.dosage?"err":""} maxLength={80} onChange={ev=>sf("dosage",ev.target.value)} placeholder="e.g. 5g, 2 capsules"/>
          </FF>
        </div>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving?<Spinner/>:<Icon name="save" size={14}/>}{isNew?"Add Supplement":"Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SupplementsTab({ athleteId, toast }) {
  const [supplements, setSupplements] = useState([]);
  const [activeDay, setActiveDay]     = useState("Monday");
  const [showForm, setShowForm]       = useState(false);
  const [editSup, setEditSup]         = useState(null);
  const { confirm, Confirmer }        = useConfirm();

  useEffect(() => { loadSupplements(); }, [athleteId]);

  async function loadSupplements() {
    try {
      const d = await apiGet(`/athletes/${athleteId}/supplements`);
      setSupplements(d);
    } catch(err) { toast.show(err.message, "error"); }
  }

  async function deleteSup(sup) {
    const ok = await confirm("Delete Supplement", `Remove "${sup.name}" from ${sup.day_of_week}?`);
    if (!ok) return;
    await apiDel(`/athletes/${athleteId}/supplements/${sup.id}`);
    loadSupplements();
    toast.show("Supplement removed", "success");
  }

  const daySupplements = supplements.filter(s => s.day_of_week === activeDay);
  const amSupplements  = daySupplements.filter(s => s.time_of_day === "AM").sort((a,b)=>a.sort_order-b.sort_order);
  const pmSupplements  = daySupplements.filter(s => s.time_of_day === "PM").sort((a,b)=>a.sort_order-b.sort_order);

  // Summary counts per day for the tab headers
  const countByDay = WEEK_DAYS.reduce((acc,d)=>({...acc,[d]:supplements.filter(s=>s.day_of_week===d).length}),{});

  return (
    <div>
      {/* Day selector */}
      <div className="day-selector-tabs">
        {WEEK_DAYS.map(day=>(
          <button key={day} className={"day-tab"+(activeDay===day?" active":"")} onClick={()=>setActiveDay(day)}>
            {day.slice(0,3)}
            {countByDay[day]>0&&<span style={{marginLeft:5,background:activeDay===day?"rgba(255,255,255,.25)":"var(--accent-dim)",color:activeDay===day?"#fff":"var(--accent)",borderRadius:"50%",width:18,height:18,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700}}>{countByDay[day]}</span>}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="section-header">
        <div className="section-title">{activeDay} Supplements</div>
        <button className="btn btn-primary btn-sm" onClick={()=>{setEditSup(null);setShowForm(true);}}>
          <Icon name="plus" size={13}/>Add Supplement
        </button>
      </div>

      {/* AM Section */}
      <div className="card card-sm" style={{marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <span className="sup-time-badge sup-am" style={{fontSize:12,padding:"3px 12px"}}>AM</span>
          <span style={{fontSize:13,color:"var(--text2)"}}>Morning supplements</span>
        </div>
        {amSupplements.length===0&&<div style={{color:"var(--muted)",fontSize:13}}>No AM supplements for {activeDay}.</div>}
        {amSupplements.map(sup=>(
          <div key={sup.id} className="supplement-item">
            <span className="sup-time-badge sup-am">AM</span>
            <div style={{flex:1}}>
              <div className="sup-name">{sup.name}</div>
              {sup.dosage&&<div className="sup-dosage">{sup.dosage}</div>}
            </div>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>{setEditSup(sup);setShowForm(true);}}><Icon name="edit" size={13}/></button>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>deleteSup(sup)}><Icon name="trash" size={13}/></button>
          </div>
        ))}
      </div>

      {/* PM Section */}
      <div className="card card-sm">
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <span className="sup-time-badge sup-pm" style={{fontSize:12,padding:"3px 12px"}}>PM</span>
          <span style={{fontSize:13,color:"var(--text2)"}}>Evening supplements</span>
        </div>
        {pmSupplements.length===0&&<div style={{color:"var(--muted)",fontSize:13}}>No PM supplements for {activeDay}.</div>}
        {pmSupplements.map(sup=>(
          <div key={sup.id} className="supplement-item">
            <span className="sup-time-badge sup-pm">PM</span>
            <div style={{flex:1}}>
              <div className="sup-name">{sup.name}</div>
              {sup.dosage&&<div className="sup-dosage">{sup.dosage}</div>}
            </div>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>{setEditSup(sup);setShowForm(true);}}><Icon name="edit" size={13}/></button>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>deleteSup(sup)}><Icon name="trash" size={13}/></button>
          </div>
        ))}
      </div>

      {showForm && (
        <SupplementDialog
          supplement={editSup}
          athleteId={athleteId}
          defaultDay={activeDay}
          onSave={loadSupplements}
          onClose={()=>{setShowForm(false);setEditSup(null);}}
        />
      )}
      {Confirmer}
    </div>
  );
}
