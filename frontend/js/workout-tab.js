// ─── Workout Plan Tab ─────────────────────────────────────────────────────────

const WORKOUT_DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const SET_TYPES = [
  {value:"warm_up",  label:"Warm Up",  cls:"st-warm_up"},
  {value:"working",  label:"Working",  cls:"st-working"},
  {value:"drop_set", label:"Drop Set", cls:"st-drop_set"},
];

// ── Exercise Library (grouped by muscle group) ────────────────────────────────
const EXERCISE_LIBRARY = {
  "Chest":      ["Barbell Bench Press","Dumbbell Bench Press","Incline Bench Press","Decline Bench Press","Push-Up","Cable Fly","Dumbbell Fly","Chest Dip","Cable Crossover","Pec Deck"],
  "Back":       ["Pull-Up","Chin-Up","Barbell Row","Dumbbell Row","Cable Row","Lat Pulldown","T-Bar Row","Face Pull","Deadlift","Rack Pull"],
  "Shoulders":  ["Barbell Overhead Press","Dumbbell Overhead Press","Lateral Raise","Front Raise","Rear Delt Fly","Cable Lateral Raise","Upright Row","Arnold Press","Shrug"],
  "Biceps":     ["Barbell Curl","Dumbbell Curl","Hammer Curl","Cable Curl","Preacher Curl","Incline Dumbbell Curl","Concentration Curl","Spider Curl"],
  "Triceps":    ["Close-Grip Bench Press","Tricep Pushdown","Overhead Tricep Extension","Skull Crusher","Dip","Cable Kickback","Diamond Push-Up"],
  "Forearms":   ["Wrist Curl","Reverse Wrist Curl","Farmer's Walk","Pinch Grip Hold"],
  "Quads":      ["Barbell Squat","Front Squat","Leg Press","Hack Squat","Bulgarian Split Squat","Leg Extension","Lunge","Step-Up","Goblet Squat"],
  "Hamstrings": ["Romanian Deadlift","Leg Curl","Good Morning","Glute-Ham Raise","Nordic Hamstring Curl","Stiff-Leg Deadlift"],
  "Glutes":     ["Hip Thrust","Cable Kickback","Sumo Deadlift","Glute Bridge","Clamshell","Abductor Machine"],
  "Calves":     ["Standing Calf Raise","Seated Calf Raise","Donkey Calf Raise","Single-Leg Calf Raise"],
  "Core":       ["Plank","Cable Crunch","Hanging Leg Raise","Ab Rollout","Side Plank","Russian Twist","Crunch","Sit-Up","Pallof Press"],
  "Cardio":     ["Treadmill Run","Cycling","Rowing","Jump Rope","Stair Climber","Sled Push","Battle Ropes"],
  "Full Body":  ["Clean and Press","Kettlebell Swing","Burpee","Box Jump","Thruster","Turkish Get-Up"],
};

const ALL_MUSCLE_GROUPS = Object.keys(EXERCISE_LIBRARY);

// ── Exercise Dialog ────────────────────────────────────────────────────────────
function ExerciseDialog({ exercise, sessionId, onSave, onClose, units }) {
  units = units || "metric";
  const isNew = !exercise;
  const [f, setF] = useState({
    session_id:   sessionId,
    name:         exercise?.name || "",
    muscle_group: exercise?.muscle_group || "",
    set_type:     exercise?.set_type || "working",
    sets_json:    exercise?.sets_json?.length
      ? exercise.sets_json.map(s=>({...s, type: s.type||"M"}))
      : [{set_number:1, type:"M", weight:0, reps:0}],
    rep_range:    exercise?.rep_range || "",
    rir:          exercise?.rir ?? 2,
    tempo:        exercise?.tempo || "",
    intensifiers: exercise?.intensifiers || "",
    exercise_notes: exercise?.exercise_notes || "",
  });
  const [e, setE] = useState({});
  const [saving, setSaving] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libSearch, setLibSearch] = useState("");
  const [libGroup, setLibGroup] = useState("");
  const sf = (k,v) => { setE(p=>({...p,[k]:null})); setF(p=>({...p,[k]:v})); };

  function validate_() {
    const err = {};
    err.name    = validate(f.name,    [rules.required, rules.maxLen(100), rules.noScript]);
    err.rep_range = validate(f.rep_range, [rules.maxLen(20)]);
    err.tempo   = validate(f.tempo,   [rules.maxLen(20)]);
    err.intensifiers = validate(f.intensifiers, [rules.maxLen(200), rules.noScript]);
    err.exercise_notes = validate(f.exercise_notes, [rules.maxLen(500), rules.noScript]);
    err.rir = validate(f.rir, [rules.numeric, rules.range(0,10)]);
    f.sets_json.forEach((s,i) => {
      if (validate(s.weight, [rules.numeric, rules.positiveNum])) err[`w${i}`] = "≥ 0";
      if (validate(s.reps,   [rules.numeric, rules.range(0,200)])) err[`r${i}`] = "0–200";
    });
    setE(err);
    return Object.values(err).every(v=>!v);
  }

  // Per-set type: W = Warm Up, M = Main/Working, I = Intensifier
  const SET_ROW_TYPES = [
    { value:"W", label:"W", title:"Warm Up",     bg:"rgba(79,142,247,.18)",  color:"var(--accent)" },
    { value:"M", label:"M", title:"Main",         bg:"rgba(52,199,89,.18)",   color:"var(--green)"  },
    { value:"I", label:"I", title:"Intensifier",  bg:"rgba(255,149,0,.18)",   color:"var(--orange)" },
  ];

  function addSet() {
    // Inherit type from the last set, defaulting to M
    const lastType = f.sets_json[f.sets_json.length-1]?.type || "M";
    setF(p=>({...p,sets_json:[...p.sets_json,{set_number:p.sets_json.length+1,type:lastType,weight:0,reps:0}]}));
  }
  function removeSet(i) { setF(p=>({...p,sets_json:p.sets_json.filter((_,j)=>j!==i).map((s,j)=>({...s,set_number:j+1}))})); }
  function updateSet(i,k,v) { setE(ex=>({...ex,[`${k[0]}${i}`]:null})); setF(p=>({...p,sets_json:p.sets_json.map((s,j)=>j===i?{...s,[k]:v}:s)})); }
  function cycleSetType(i) {
    const order = ["W","M","I"];
    setF(p=>({...p,sets_json:p.sets_json.map((s,j)=>j===i?{...s,type:order[(order.indexOf(s.type||"M")+1)%3]}:s)}));
  }

  function pickLibraryExercise(name, group) {
    sf("name", name);
    sf("muscle_group", group);
    setShowLibrary(false);
  }

  async function save() {
    if (!validate_()) return;
    setSaving(true);
    try {
      const payload = { ...f, rir: +f.rir };
      if (exercise) await apiPut(`/workout-exercises/${exercise.id}`, payload);
      else          await apiPost(`/workout-exercises`, payload);
      onSave(); onClose();
    } catch(err) { setSaving(false); }
  }

  // Library filtered exercises
  const libFiltered = Object.entries(EXERCISE_LIBRARY)
    .filter(([group]) => !libGroup || group === libGroup)
    .map(([group, exs]) => ({ group, exs: exs.filter(e => !libSearch || e.toLowerCase().includes(libSearch.toLowerCase())) }))
    .filter(({exs}) => exs.length > 0);

  return (
    <div className="overlay">
      <div className="dialog dialog-xl">
        <div className="dialog-title"><Icon name="dumbbell" size={20}/>{isNew?"Add Exercise":"Edit Exercise"}</div>

        {/* Exercise name + library picker */}
        <div style={{display:"flex",gap:10,marginBottom:16,alignItems:"flex-start"}}>
          <div style={{flex:1}}>
            <FF label="Exercise Name *" error={e.name}>
              <input value={f.name} className={e.name?"err":""} maxLength={100} onChange={ev=>sf("name",ev.target.value)} placeholder="Exercise name or pick from library…"/>
            </FF>
          </div>
          <button className="btn btn-secondary" style={{marginTop:21}} onClick={()=>setShowLibrary(v=>!v)}>
            <Icon name="layers" size={14}/>Library
          </button>
        </div>

        {/* Library panel */}
        {showLibrary && (
          <div style={{background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:10,padding:16,marginBottom:16}}>
            <div style={{display:"flex",gap:10,marginBottom:12}}>
              <input value={libSearch} onChange={e=>setLibSearch(e.target.value)} placeholder="Search exercises…"
                style={{flex:1,background:"var(--surface)",border:"1px solid var(--border2)",borderRadius:6,padding:"7px 10px",color:"var(--text)",fontFamily:"var(--font)",fontSize:13}}/>
              <select value={libGroup} onChange={e=>setLibGroup(e.target.value)}
                style={{background:"var(--surface)",border:"1px solid var(--border2)",borderRadius:6,padding:"7px 10px",color:"var(--text)",fontFamily:"var(--font)",fontSize:13}}>
                <option value="">All Muscle Groups</option>
                {ALL_MUSCLE_GROUPS.map(g=><option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div style={{maxHeight:240,overflowY:"auto"}}>
              {libFiltered.map(({group,exs})=>(
                <div key={group} style={{marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>{group}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {exs.map(ex=>(
                      <button key={ex} className="btn btn-ghost btn-sm" style={{fontSize:12}} onClick={()=>pickLibraryExercise(ex,group)}>{ex}</button>
                    ))}
                  </div>
                </div>
              ))}
              {libFiltered.length===0&&<div style={{color:"var(--muted)",fontSize:13}}>No exercises found.</div>}
            </div>
          </div>
        )}

        <div className="form-grid" style={{marginBottom:16}}>
          <FF label="Muscle Group">
            <select value={f.muscle_group} onChange={ev=>sf("muscle_group",ev.target.value)}>
              <option value="">— Select —</option>
              {ALL_MUSCLE_GROUPS.map(g=><option key={g} value={g}>{g}</option>)}
            </select>
          </FF>
          <FF label="Set Type">
            <select value={f.set_type} onChange={ev=>sf("set_type",ev.target.value)}>
              {SET_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FF>
          <FF label="Rep Range" error={e.rep_range} hint="e.g. 8-12, 6-8">
            <input value={f.rep_range} className={e.rep_range?"err":""} maxLength={20} onChange={ev=>sf("rep_range",ev.target.value)} placeholder="e.g. 8–12"/>
          </FF>
          <FF label="RIR (Reps in Reserve)" error={e.rir} hint="0=failure, 2=2 reps left">
            <input type="number" min="0" max="10" value={f.rir} className={e.rir?"err":""} onChange={ev=>sf("rir",ev.target.value)}/>
          </FF>
          <FF label="Tempo" error={e.tempo} hint="e.g. 3-1-2-0 (exc-pause-con-pause)">
            <input value={f.tempo} className={e.tempo?"err":""} maxLength={20} onChange={ev=>sf("tempo",ev.target.value)} placeholder="3-1-2-0"/>
          </FF>
          <FF label="Intensifiers" error={e.intensifiers} hint="e.g. Myo-reps, Rest-Pause, Giant Set" full>
            <input value={f.intensifiers} className={e.intensifiers?"err":""} maxLength={200} onChange={ev=>sf("intensifiers",ev.target.value)} placeholder="Techniques used…"/>
          </FF>
          <FF label="Notes" error={e.exercise_notes} full>
            <textarea rows={2} value={f.exercise_notes} className={e.exercise_notes?"err":""} maxLength={500} onChange={ev=>sf("exercise_notes",ev.target.value)} placeholder="Cues, coaching notes…"/>
          </FF>
        </div>

        {/* Sets */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{fontWeight:700,fontSize:13}}>Sets ({f.sets_json.length})</div>
          <button className="btn btn-secondary btn-sm" onClick={addSet}><Icon name="plus" size={13}/>Add Set</button>
        </div>
        <div style={{background:"var(--surface2)",borderRadius:8,padding:"10px 12px",marginBottom:16}}>
          {/* Column headers */}
          <div style={{display:"grid",gridTemplateColumns:"36px 52px 1fr 1fr auto",gap:8,marginBottom:6}}>
            {["Set","Type",`Weight (${wtLabel(units)})`, "Reps",""].map(h=>(
              <div key={h} style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase"}}>{h}</div>
            ))}
          </div>
          {f.sets_json.map((s,i)=>{
            const t = SET_ROW_TYPES.find(x=>x.value===(s.type||"M")) || SET_ROW_TYPES[1];
            return (
              <div key={i} style={{display:"grid",gridTemplateColumns:"36px 52px 1fr 1fr auto",gap:8,marginBottom:6,alignItems:"center"}}>
                {/* Set number */}
                <div style={{fontWeight:700,textAlign:"center",color:"var(--muted)",fontSize:13}}>{s.set_number}</div>
                {/* Type toggle — click cycles W → M → I */}
                <button
                  title={`${t.title} — click to change`}
                  onClick={()=>cycleSetType(i)}
                  style={{width:"100%",padding:"6px 0",borderRadius:6,border:"none",cursor:"pointer",fontWeight:800,fontSize:12,
                    background:t.bg, color:t.color, fontFamily:"var(--font)", letterSpacing:.5}}>
                  {t.value}
                </button>
                {/* Weight */}
                <div>
                  <input type="number" min="0" step="0.5"
                    value={wtDisplay(s.weight, units)}
                    className={e[`w${i}`]?"err":""}
                    onChange={ev=>updateSet(i,"weight", wtToKg(ev.target.value, units))}
                    style={{width:"100%",background:"var(--surface)",border:`1px solid ${e[`w${i}`]?"var(--red)":"var(--border2)"}`,borderRadius:6,padding:"6px 8px",color:"var(--text)",fontFamily:"var(--font)",fontSize:13}}/>
                </div>
                {/* Reps */}
                <div>
                  <input type="number" min="0" max="200" value={s.reps} className={e[`r${i}`]?"err":""}
                    onChange={ev=>updateSet(i,"reps",ev.target.value)}
                    style={{width:"100%",background:"var(--surface)",border:`1px solid ${e[`r${i}`]?"var(--red)":"var(--border2)"}`,borderRadius:6,padding:"6px 8px",color:"var(--text)",fontFamily:"var(--font)",fontSize:13}}/>
                </div>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>removeSet(i)} disabled={f.sets_json.length<=1}><Icon name="x" size={13}/></button>
              </div>
            );
          })}
          {/* Legend */}
          <div style={{display:"flex",gap:12,marginTop:8,paddingTop:8,borderTop:"1px solid var(--border2)"}}>
            {SET_ROW_TYPES.map(t=>(
              <div key={t.value} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"var(--muted)"}}>
                <span style={{background:t.bg,color:t.color,fontWeight:800,padding:"1px 7px",borderRadius:4,fontSize:11}}>{t.value}</span>
                {t.title}
              </div>
            ))}
            <span style={{fontSize:11,color:"var(--muted)",marginLeft:"auto"}}>Click type to cycle</span>
          </div>
        </div>

        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving?<Spinner/>:<Icon name="save" size={14}/>}{isNew?"Add Exercise":"Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Session Dialog ─────────────────────────────────────────────────────────────
function SessionDialog({ session, planId, defaultDay, onSave, onClose }) {
  const isNew = !session;
  const [f, setF] = useState({
    plan_id:       planId,
    day_of_week:   session?.day_of_week || defaultDay || "Monday",
    session_title: session?.session_title || "",
    muscle_groups: session?.muscle_groups || [],
    session_notes: session?.session_notes || "",
  });
  const [e, setE] = useState({});
  const [saving, setSaving] = useState(false);
  const sf = (k,v) => { setE(p=>({...p,[k]:null})); setF(p=>({...p,[k]:v})); };
  function toggleMuscle(m) { setF(p=>({...p,muscle_groups:p.muscle_groups.includes(m)?p.muscle_groups.filter(x=>x!==m):[...p.muscle_groups,m]})); }

  function validate_() {
    const err = {};
    err.session_title = validate(f.session_title, [rules.maxLen(100), rules.noScript]);
    err.session_notes = validate(f.session_notes, [rules.maxLen(500), rules.noScript]);
    setE(err);
    return Object.values(err).every(v=>!v);
  }

  async function save() {
    if (!validate_()) return;
    setSaving(true);
    try {
      if (session) await apiPut(`/workout-sessions/${session.id}`, {...f, plan_id:planId});
      else         await apiPost(`/workout-sessions`, f);
      onSave(); onClose();
    } catch(err) { setSaving(false); }
  }

  return (
    <div className="overlay" style={{zIndex:150}}>
      <div className="dialog dialog-md">
        <div className="dialog-title"><Icon name="calendar" size={20}/>{isNew?"Add Session":"Edit Session"}</div>
        <div className="form-grid" style={{marginBottom:14}}>
          <FF label="Day of Week">
            <select value={f.day_of_week} onChange={ev=>sf("day_of_week",ev.target.value)}>
              {WORKOUT_DAYS.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </FF>
          <FF label="Session Title" error={e.session_title}><input value={f.session_title} className={e.session_title?"err":""} maxLength={100} onChange={ev=>sf("session_title",ev.target.value)} placeholder="e.g. Push Day A"/></FF>
        </div>
        <FF label="Muscle Groups">
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>
            {ALL_MUSCLE_GROUPS.map(m=>(
              <span key={m} className={"muscle-tag"+(f.muscle_groups.includes(m)?" selected":"")} onClick={()=>toggleMuscle(m)}>{m}</span>
            ))}
          </div>
        </FF>
        <div style={{height:12}}/>
        <FF label="Session Notes" error={e.session_notes}><textarea rows={2} value={f.session_notes} className={e.session_notes?"err":""} maxLength={500} onChange={ev=>sf("session_notes",ev.target.value)} placeholder="Warm-up protocol, coaching cues…"/></FF>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:<Icon name="save" size={14}/>}{isNew?"Create Session":"Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Workout Plan Form ──────────────────────────────────────────────────────────
function WorkoutPlanFormDialog({ plan, athleteId, onSave, onClose }) {
  const isNew = !plan;
  const [f, setF] = useState({ athlete_id:athleteId, title:plan?.title||"", start_date:plan?.start_date||"", end_date:plan?.end_date||"", notes:plan?.notes||"" });
  const [e, setE] = useState({});
  const [saving, setSaving] = useState(false);
  const sf = (k,v) => { setE(p=>({...p,[k]:null})); setF(p=>({...p,[k]:v})); };

  function validate_() {
    const err = {};
    err.title = validate(f.title, [rules.required, rules.maxLen(100), rules.noScript]);
    err.notes = validate(f.notes, [rules.maxLen(500), rules.noScript]);
    if (f.start_date && f.end_date && f.start_date > f.end_date) err.end_date = "Must be after start date";
    setE(err);
    return Object.values(err).every(v=>!v);
  }

  async function save() {
    if (!validate_()) return;
    setSaving(true);
    try {
      if (plan) await apiPut(`/athletes/${athleteId}/workout-plans/${plan.id}`, f);
      else      await apiPost(`/athletes/${athleteId}/workout-plans`, f);
      onSave(); onClose();
    } catch(err) { setSaving(false); }
  }

  return (
    <div className="overlay">
      <div className="dialog">
        <div className="dialog-title"><Icon name="dumbbell" size={20}/>{isNew?"New Workout Plan":"Edit Plan"}</div>
        <div className="form-grid" style={{marginBottom:14}}>
          <FF label="Plan Title *" error={e.title} full><input value={f.title} className={e.title?"err":""} maxLength={100} onChange={ev=>sf("title",ev.target.value)} placeholder="e.g. 12-Week Hypertrophy" autoFocus/></FF>
          <FF label="Start Date"><input type="date" value={f.start_date} onChange={ev=>sf("start_date",ev.target.value)}/></FF>
          <FF label="End Date" error={e.end_date}><input type="date" className={e.end_date?"err":""} value={f.end_date} onChange={ev=>sf("end_date",ev.target.value)}/></FF>
        </div>
        <FF label="Notes" error={e.notes}><textarea rows={3} value={f.notes} className={e.notes?"err":""} maxLength={500} onChange={ev=>sf("notes",ev.target.value)} placeholder="Plan overview, goals…"/></FF>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:<Icon name="save" size={14}/>}{isNew?"Create Plan":"Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Workout Plan Tab ───────────────────────────────────────────────────────────
function WorkoutPlanTab({ athleteId, toast, units }) {
  units = units || "metric";
  const [plans, setPlans]           = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editPlan, setEditPlan]     = useState(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editSession, setEditSession] = useState(null);
  const [sessionDay, setSessionDay]  = useState("Monday");
  const [showExForm, setShowExForm]  = useState(false);
  const [editEx, setEditEx]          = useState(null);
  const { confirm, Confirmer }       = useConfirm();

  useEffect(() => { loadPlans(); }, [athleteId]);

  async function loadPlans() {
    try {
      const data = await apiGet(`/athletes/${athleteId}/workout-plans`);
      setPlans(data);
      // Keep selection valid
      if (selectedPlan && !data.find(p=>p.id===selectedPlan)) setSelectedPlan(null);
    } catch(err) { toast.show(err.message,"error"); }
  }

  async function deletePlan(plan) {
    const ok = await confirm("Delete Plan",`Delete "${plan.title}" and all its sessions?`);
    if (!ok) return;
    await apiDel(`/athletes/${athleteId}/workout-plans/${plan.id}`);
    if (selectedPlan===plan.id) setSelectedPlan(null);
    loadPlans();
    toast.show("Plan deleted","success");
  }

  async function deleteSession(sess) {
    const ok = await confirm("Delete Session",`Delete "${sess.session_title||sess.day_of_week}" and all its exercises?`);
    if (!ok) return;
    await apiDel(`/workout-sessions/${sess.id}`);
    if (selectedSession===sess.id) setSelectedSession(null);
    loadPlans();
    toast.show("Session deleted","success");
  }

  async function deleteExercise(ex) {
    const ok = await confirm("Delete Exercise",`Remove "${ex.name}" from this session?`);
    if (!ok) return;
    await apiDel(`/workout-exercises/${ex.id}`);
    loadPlans();
    toast.show("Exercise removed","success");
  }

  const currentPlan    = plans.find(p=>p.id===selectedPlan);
  const currentSession = currentPlan?.sessions?.find(s=>s.id===selectedSession);

  return (
    <div>
      {/* Plans header */}
      <div className="section-header">
        <div className="section-title">Workout Plans</div>
        <button className="btn btn-primary" onClick={()=>{setEditPlan(null);setShowPlanForm(true);}}><Icon name="plus" size={14}/>New Plan</button>
      </div>

      {plans.length===0 && <EmptyState icon="dumbbell" title="No Plans Yet" message="Create a workout plan to get started."/>}

      {/* Plan list */}
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
        {plans.map(plan=>(
          <div key={plan.id} style={{background:"var(--surface)",border:`1px solid ${selectedPlan===plan.id?"var(--accent)":"var(--border)"}`,borderRadius:12,overflow:"hidden"}}>
            {/* Plan header row */}
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",cursor:"pointer"}}
              onClick={()=>{ setSelectedPlan(selectedPlan===plan.id?null:plan.id); setSelectedSession(null); }}>
              <Icon name="layers" size={16} color={selectedPlan===plan.id?"var(--accent)":"var(--muted)"}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15}}>{plan.title}</div>
                <div style={{fontSize:12,color:"var(--text2)",marginTop:2}}>
                  {plan.start_date&&plan.end_date?`${plan.start_date} → ${plan.end_date}`:plan.start_date?`From ${plan.start_date}`:"No dates set"}
                  {" · "}{plan.sessions?.length||0} session{plan.sessions?.length!==1?"s":""}
                </div>
              </div>
              <div style={{display:"flex",gap:6}} onClick={e2=>e2.stopPropagation()}>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>{setEditPlan(plan);setShowPlanForm(true);}}><Icon name="edit" size={14}/></button>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>deletePlan(plan)}><Icon name="trash" size={14}/></button>
              </div>
              <Icon name={selectedPlan===plan.id?"chevron_up":"chevron_down"} size={16} color="var(--muted)"/>
            </div>

            {/* Expanded plan */}
            {selectedPlan===plan.id && (
              <div style={{padding:"0 18px 18px"}}>
                {plan.notes&&<div style={{fontSize:12,color:"var(--text2)",padding:"8px 12px",background:"var(--surface2)",borderRadius:6,marginBottom:14}}>{plan.notes}</div>}

                {/* Week grid */}
                <div className="week-grid">
                  {WORKOUT_DAYS.map(day=>{
                    const daySessions = plan.sessions?.filter(s=>s.day_of_week===day)||[];
                    return (
                      <div key={day} className="week-col">
                        <div className="week-col-header">{day.slice(0,3)}</div>
                        {daySessions.map(sess=>(
                          <div key={sess.id} className={"session-card"+(selectedSession===sess.id?" active":"")}
                            onClick={()=>setSelectedSession(selectedSession===sess.id?null:sess.id)}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                              <div style={{flex:1,minWidth:0}}>
                                <div className="session-title">{sess.session_title||day}</div>
                                {sess.muscle_groups?.length>0&&<div className="session-muscles">{sess.muscle_groups.slice(0,2).join(", ")}{sess.muscle_groups.length>2?`+${sess.muscle_groups.length-2}`:""}</div>}
                                <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{sess.exercises?.length||0} ex</div>
                              </div>
                              <div style={{display:"flex",gap:2}} onClick={e2=>e2.stopPropagation()}>
                                <button className="btn btn-ghost btn-xs btn-icon" onClick={()=>{setEditSession(sess);setSessionDay(day);setShowSessionForm(true);}}><Icon name="edit" size={11}/></button>
                                <button className="btn btn-ghost btn-xs btn-icon" onClick={()=>deleteSession(sess)}><Icon name="trash" size={11}/></button>
                              </div>
                            </div>
                          </div>
                        ))}
                        <button className="btn btn-ghost btn-sm" style={{width:"100%",marginTop:4,fontSize:11,justifyContent:"center"}}
                          onClick={()=>{setEditSession(null);setSessionDay(day);setShowSessionForm(true);}}>
                          <Icon name="plus" size={11}/>Session
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Expanded session exercises */}
                {currentSession && (
                  <div className="card" style={{marginTop:4}}>
                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:10}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:16}}>{currentSession.session_title||currentSession.day_of_week}</div>
                        <div style={{color:"var(--text2)",fontSize:12,marginTop:2}}>{currentSession.day_of_week}</div>
                        {currentSession.muscle_groups?.length>0&&(
                          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
                            {currentSession.muscle_groups.map(m=><span key={m} className="badge badge-accent">{m}</span>)}
                          </div>
                        )}
                        {currentSession.session_notes&&<div style={{fontSize:12,color:"var(--text2)",marginTop:6,fontStyle:"italic"}}>{currentSession.session_notes}</div>}
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <button className="btn btn-primary btn-sm" onClick={()=>{setEditEx(null);setShowExForm(true);}}><Icon name="plus" size={13}/>Add Exercise</button>
                        <button className="btn btn-ghost btn-sm" onClick={()=>setSelectedSession(null)}><Icon name="x" size={13}/>Close</button>
                      </div>
                    </div>

                    {currentSession.exercises?.length===0&&<div style={{color:"var(--muted)",fontSize:13,padding:"16px 0"}}>No exercises yet. Add your first exercise!</div>}

                    {currentSession.exercises?.map(ex=>(
                      <div key={ex.id} className="exercise-row">
                        <div className="exercise-header">
                          <div>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                              <div className="exercise-name">{ex.name}</div>
                              <span className={`set-type-badge ${SET_TYPES.find(t=>t.value===ex.set_type)?.cls||"st-working"}`}>
                                {SET_TYPES.find(t=>t.value===ex.set_type)?.label||ex.set_type}
                              </span>
                            </div>
                            <div className="exercise-meta" style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                              {ex.muscle_group&&<span><Icon name="tag" size={11}/> {ex.muscle_group}</span>}
                              {ex.rep_range&&<span>Reps: {ex.rep_range}</span>}
                              {ex.rir!==null&&ex.rir!==undefined&&<span>RIR: {ex.rir}</span>}
                              {ex.tempo&&<span>Tempo: {ex.tempo}</span>}
                              {ex.intensifiers&&<span style={{color:"var(--accent)"}}>{ex.intensifiers}</span>}
                            </div>
                            {ex.exercise_notes&&<div style={{fontSize:11,color:"var(--muted)",marginTop:4,fontStyle:"italic"}}>{ex.exercise_notes}</div>}
                          </div>
                          <div style={{display:"flex",gap:6}}>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>{setEditEx(ex);setShowExForm(true);}}><Icon name="edit" size={14}/></button>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>deleteExercise(ex)}><Icon name="trash" size={14}/></button>
                          </div>
                        </div>
                        {ex.sets_json?.length>0&&(
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,marginTop:6}}>
                            <thead><tr>
                              {["Set","Type",`Weight (${wtLabel(units)})`,"Reps"].map(h=>(
                                <th key={h} style={{textAlign:"left",padding:"4px 10px",color:"var(--muted)",fontWeight:700,fontSize:11,textTransform:"uppercase",borderBottom:"1px solid var(--border)"}}>{h}</th>
                              ))}
                            </tr></thead>
                            <tbody>{ex.sets_json.map((s,i)=>{
                              const SET_DISPLAY = {
                                W:{bg:"rgba(79,142,247,.18)", color:"var(--accent)",  title:"Warm Up"},
                                M:{bg:"rgba(52,199,89,.18)",  color:"var(--green)",   title:"Main"},
                                I:{bg:"rgba(255,149,0,.18)",  color:"var(--orange)",  title:"Intensifier"},
                              };
                              const td = SET_DISPLAY[s.type||"M"] || SET_DISPLAY.M;
                              return (
                                <tr key={i}>
                                  <td style={{padding:"6px 10px",fontWeight:700,color:"var(--muted)"}}>{s.set_number}</td>
                                  <td style={{padding:"6px 10px"}}>
                                    <span title={td.title} style={{background:td.bg,color:td.color,fontWeight:800,padding:"2px 8px",borderRadius:4,fontSize:11,letterSpacing:.5}}>
                                      {s.type||"M"}
                                    </span>
                                  </td>
                                  <td style={{padding:"6px 10px"}}>{wtDisplay(s.weight, units)} {wtLabel(units)}</td>
                                  <td style={{padding:"6px 10px"}}>{s.reps} reps</td>
                                </tr>
                              );
                            })}</tbody>
                          </table>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dialogs */}
      {showPlanForm && <WorkoutPlanFormDialog plan={editPlan} athleteId={athleteId} onSave={()=>{loadPlans();toast.show(editPlan?"Plan updated":"Plan created","success");setShowPlanForm(false);setEditPlan(null);}} onClose={()=>{setShowPlanForm(false);setEditPlan(null);}}/>}
      {showSessionForm && <SessionDialog session={editSession} planId={selectedPlan} defaultDay={sessionDay} onSave={()=>{loadPlans();toast.show(editSession?"Session updated":"Session created","success");setShowSessionForm(false);setEditSession(null);}} onClose={()=>{setShowSessionForm(false);setEditSession(null);}}/>}
      {showExForm && selectedSession && <ExerciseDialog exercise={editEx} sessionId={selectedSession} units={units} onSave={()=>{loadPlans();toast.show(editEx?"Exercise updated":"Exercise added","success");setShowExForm(false);setEditEx(null);}} onClose={()=>{setShowExForm(false);setEditEx(null);}}/>}
      {Confirmer}
    </div>
  );
}
