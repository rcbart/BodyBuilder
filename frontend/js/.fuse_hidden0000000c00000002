// ─── Calendar Tab ─────────────────────────────────────────────────────────────

const AEROBIC_TYPES = ["","Running","Cycling","Swimming","Rowing","Walking","Jump Rope","Elliptical","Stair Climber","HIIT","Other"];
const MONTHS        = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW_SHORT     = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

// Module-level so it's not re-created on every CalendarTab render
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function EventDialog({ event, date, onSave, onDelete, onClose, toast }) {
  const isNew = !event;
  const [f, setF] = useState({ title: event?.title||"", description: event?.description||"", event_time: event?.event_time||"", date });
  const [e, setE] = useState({});
  const sf = (k,v) => { setE(p=>({...p,[k]:null})); setF(p=>({...p,[k]:v})); };

  function validate_() {
    const err = {};
    err.title = validate(f.title, [rules.required, rules.maxLen(100), rules.noScript]);
    err.description = validate(f.description, [rules.maxLen(500), rules.noScript]);
    setE(err);
    return Object.values(err).every(v=>!v);
  }

  async function save() {
    if (!validate_()) return;
    try {
      await onSave(f);
      onClose();
    } catch(err) {
      toast?.show(err.message || "Failed to save event", "error");
    }
  }

  return (
    <div className="overlay">
      <div className="dialog">
        <DialogTitle icon="calendar" onClose={onClose}>
          {isNew ? "New Event" : "Edit Event"}
        </DialogTitle>
        <FF label="Title *" error={e.title}><input value={f.title} className={e.title?"err":""} maxLength={100} onChange={ev=>sf("title",ev.target.value)} autoFocus placeholder="Event title"/></FF>
        <div style={{height:12}}/>
        <FF label="Time"><input type="time" value={f.event_time} onChange={ev=>sf("event_time",ev.target.value)}/></FF>
        <div style={{height:12}}/>
        <FF label="Description" error={e.description}><textarea rows={3} value={f.description} className={e.description?"err":""} maxLength={500} onChange={ev=>sf("description",ev.target.value)} placeholder="Optional notes…"/></FF>
        <div className="dialog-actions">
          {!isNew && <button className="btn btn-danger btn-sm" onClick={()=>{onDelete(event.id);onClose();}}><Icon name="trash" size={13}/>Delete</button>}
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}><Icon name="save" size={14}/>Save Event</button>
        </div>
      </div>
    </div>
  );
}

function DayPanel({ athleteId, dateStr, onClose, toast }) {
  const [dayData, setDayData]   = useState(null);
  const [events, setEvents]     = useState([]);
  const [form, setForm]         = useState({ steps:0, aerobic_type:"", aerobic_duration:0, workout_notes:"" });
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [showEv, setShowEv]     = useState(false);
  const [editEv, setEditEv]     = useState(null);

  useEffect(() => { loadDay(); }, [dateStr, athleteId]);

  async function loadDay() {
    try {
      const d = await apiGet(`/athletes/${athleteId}/calendar/day/${dateStr}`);
      setDayData(d.day);
      setEvents(d.events);
      setForm({ steps: d.day.steps||0, aerobic_type: d.day.aerobic_type||"", aerobic_duration: d.day.aerobic_duration||0, workout_notes: d.day.workout_notes||"" });
    } catch(err) { toast.show(err.message || "Failed to load day", "error"); }
  }

  const sf = (k,v) => { setErrors(p=>({...p,[k]:null})); setForm(p=>({...p,[k]:v})); };

  function validate_() {
    const err = {};
    err.steps = validate(form.steps, [rules.numeric, rules.range(0,100000)]);
    err.aerobic_duration = validate(form.aerobic_duration, [rules.numeric, rules.range(0,600)]);
    err.workout_notes = validate(form.workout_notes, [rules.maxLen(1000), rules.noScript]);
    setErrors(err);
    return Object.values(err).every(v=>!v);
  }

  async function handleSave() {
    if (!validate_()) return;
    setSaving(true);
    try {
      await apiPut(`/athletes/${athleteId}/calendar/day/${dateStr}`, {
        steps:+form.steps, aerobic_type:form.aerobic_type,
        aerobic_duration:+form.aerobic_duration, workout_notes:form.workout_notes,
      });
      toast.show("Day saved","success");
    } catch(err) {
      toast.show(err.message || "Failed to save day", "error");
    } finally {
      setSaving(false);
    }
  }

  async function saveEvent(body) {
    if (editEv) {
      const u = await apiPut(`/athletes/${athleteId}/calendar/events/${editEv.id}`, {...body, date:dateStr});
      setEvents(ev=>ev.map(e=>e.id===u.id?u:e));
      toast.show("Event updated","success");
    } else {
      const c = await apiPost(`/athletes/${athleteId}/calendar/events`, {...body, date:dateStr});
      setEvents(ev=>[...ev,c]);
      toast.show("Event created","success");
    }
  }

  async function deleteEvent(id) {
    try {
      await apiDel(`/athletes/${athleteId}/calendar/events/${id}`);
      setEvents(ev=>ev.filter(e=>e.id!==id));
      toast.show("Event deleted","success");
    } catch(err) { toast.show(err.message, "error"); }
  }

  const label = new Date(dateStr+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});

  return (
    <div className="day-panel">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:15,display:"flex",alignItems:"center",gap:8}}><Icon name="calendar" size={16} color="var(--accent)"/>{label}</div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="x" size={14}/>Close</button>
      </div>
      <div className="form-grid">
        <FF label="Steps Today" error={errors.steps}><input type="number" min="0" max="100000" value={form.steps} className={errors.steps?"err":""} onChange={e=>sf("steps",e.target.value)}/></FF>
        <FF label="Aerobic Type"><select value={form.aerobic_type} onChange={e=>sf("aerobic_type",e.target.value)}>{AEROBIC_TYPES.map(t=><option key={t} value={t}>{t||"—"}</option>)}</select></FF>
        <FF label="Duration (min)" error={errors.aerobic_duration}><input type="number" min="0" max="600" value={form.aerobic_duration} className={errors.aerobic_duration?"err":""} onChange={e=>sf("aerobic_duration",e.target.value)}/></FF>
      </div>
      <FF label="Workout Notes" error={errors.workout_notes}><textarea rows={3} value={form.workout_notes} className={errors.workout_notes?"err":""} onChange={e=>sf("workout_notes",e.target.value)} maxLength={1000} placeholder="e.g. Squats 5×5 @ 100kg…"/></FF>
      <div style={{display:"flex",justifyContent:"flex-end",margin:"10px 0 16px"}}>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          {saving?<Spinner/>:<Icon name="save" size={13}/>}Save Day
        </button>
      </div>
      <hr className="divider"/>
      <div className="section-header">
        <div className="section-title">Events ({events.length})</div>
        <button className="btn btn-secondary btn-sm" onClick={()=>{setEditEv(null);setShowEv(true);}}><Icon name="plus" size={13}/>Add Event</button>
      </div>
      <div className="event-list">
        {events.length===0 && <div style={{color:"var(--muted)",fontSize:13}}>No events for this day.</div>}
        {events.map(ev=>(
          <div key={ev.id} className="event-item" onClick={()=>{setEditEv(ev);setShowEv(true);}}>
            <div>
              <div className="event-item-title">{ev.title}</div>
              {ev.event_time&&<div className="event-item-time"><Icon name="activity" size={11}/> {ev.event_time}</div>}
              {ev.description&&<div className="event-item-desc">{ev.description}</div>}
            </div>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={e=>{e.stopPropagation();deleteEvent(ev.id);}}><Icon name="x" size={13}/></button>
          </div>
        ))}
      </div>
      {showEv && (
        <EventDialog
          event={editEv}
          date={dateStr}
          onSave={saveEvent}
          onDelete={deleteEvent}
          onClose={()=>{setShowEv(false);setEditEv(null);}}
          toast={toast}
        />
      )}
    </div>
  );
}

function CalendarTab({ athleteId, toast }) {
  const today = new Date();
  const [view, setView]           = useState({ year: today.getFullYear(), month: today.getMonth()+1 });
  const [monthData, setMonthData] = useState({ days:{}, events:[], plan_sessions:{} });
  const [selected, setSelected]   = useState(null);

  useEffect(() => { loadMonth(); }, [view, athleteId]);

  async function loadMonth() {
    try {
      const d = await apiGet(`/athletes/${athleteId}/calendar/month?year=${view.year}&month=${view.month}`);
      setMonthData(d);
    } catch(err) { toast.show(err.message || "Failed to load calendar", "error"); }
  }

  function nav(unit, dir) {
    setSelected(null);
    setView(prev => {
      let {year,month} = prev;
      if (unit==="month")     { month+=dir; if(month>12){month=1;year++;} if(month<1){month=12;year--;} }
      else if (unit==="year") { year+=dir; }
      else if (unit==="week") { const d=new Date(year,month-1,1); d.setDate(d.getDate()+dir*7); year=d.getFullYear(); month=d.getMonth()+1; }
      return {year,month};
    });
  }

  function buildDays() {
    const {year,month} = view;
    const first    = new Date(year,month-1,1);
    const last     = new Date(year,month,0);
    const startDow = (first.getDay()+6)%7;
    const days     = [];
    for(let i=0;i<startDow;i++){ const d=new Date(year,month-1,-startDow+i+1); days.push({date:fmtDate(d),inMonth:false}); }
    for(let i=1;i<=last.getDate();i++) days.push({date:`${year}-${String(month).padStart(2,"0")}-${String(i).padStart(2,"0")}`,inMonth:true});
    while(days.length%7!==0){ const d=new Date(year,month,days.length-startDow-last.getDate()+1); days.push({date:fmtDate(d),inMonth:false}); }
    return days;
  }

  const todayStr = fmtDate(today);
  const evByDate = {};
  monthData.events.forEach(e=>{ if(!evByDate[e.date]) evByDate[e.date]=[]; evByDate[e.date].push(e); });

  return (
    <div>
      {/* Nav */}
      <div className="cal-nav">
        <button className="btn btn-ghost btn-sm" onClick={()=>nav("year",-1)}>«</button>
        <button className="btn btn-ghost btn-sm" onClick={()=>nav("month",-1)}>‹</button>
        <button className="btn btn-ghost btn-sm" onClick={()=>nav("week",-1)}>−wk</button>
        <div className="cal-nav-title">{MONTHS[view.month-1]} {view.year}</div>
        <button className="btn btn-ghost btn-sm" onClick={()=>nav("week",1)}>wk+</button>
        <button className="btn btn-ghost btn-sm" onClick={()=>nav("month",1)}>›</button>
        <button className="btn btn-ghost btn-sm" onClick={()=>nav("year",1)}>»</button>
        <button className="btn btn-secondary btn-sm" onClick={()=>{setView({year:today.getFullYear(),month:today.getMonth()+1});setSelected(null);}}>Today</button>
      </div>

      {/* Grid */}
      <div className="cal-grid">
        {DOW_SHORT.map(d=><div key={d} className="cal-dow">{d}</div>)}
        {buildDays().map(({date,inMonth})=>{
          const di       = monthData.days[date]||{};
          const evs      = evByDate[date]||[];
          const sessions = (monthData.plan_sessions||{})[date]||[];
          const isToday  = date===todayStr;
          const isSel    = date===selected;
          return (
            <div key={date} className={"cal-cell"+(!inMonth?" other-month":"")+(isToday?" today":"")+(isSel?" selected":"")}
              onClick={()=>inMonth&&setSelected(date===selected?null:date)}>
              <div className="cal-date" style={{color:isToday?"var(--accent)":undefined}}>{parseInt(date.split("-")[2])}</div>
              <div>
                {di.steps>0        && <span className="cal-dot dot-steps"/>}
                {di.aerobic_type   && <span className="cal-dot dot-aerobic"/>}
                {di.workout_notes  && <span className="cal-dot dot-workout"/>}
                {evs.length>0      && <span className="cal-dot dot-event"/>}
                {sessions.length>0 && <span className="cal-dot dot-workout"/>}
              </div>
              {(di.steps>0||di.aerobic_type||evs.length>0||sessions.length>0)&&(
                <div className="cal-summary">
                  {di.steps>0&&<div>{(di.steps/1000).toFixed(1)}k steps</div>}
                  {di.aerobic_type&&<div>{di.aerobic_type} {di.aerobic_duration}m</div>}
                  {sessions.length>0&&<div>{sessions[0].session_title||sessions[0].plan_title}</div>}
                  {evs.length>0&&<div>{evs.length} event{evs.length>1?"s":""}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:16,marginTop:12,flexWrap:"wrap"}}>
        {[["dot-steps","Steps"],["dot-aerobic","Aerobic"],["dot-workout","Workout"],["dot-event","Event"]].map(([cls,lbl])=>(
          <div key={cls} style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:"var(--text2)"}}><span className={`cal-dot ${cls}`}/>{lbl}</div>
        ))}
      </div>

      {selected && <DayPanel key={selected} athleteId={athleteId} dateStr={selected} onClose={()=>{setSelected(null);loadMonth();}} toast={toast}/>}
    </div>
  );
}
