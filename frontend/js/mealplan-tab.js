// ─── Meal Plan Tab ────────────────────────────────────────────────────────────

const MACRO_DEFS = [
  {key:"protein",label:"Protein",unit:"g"},
  {key:"carbs",  label:"Carbohydrates",unit:"g"},
  {key:"fat",    label:"Fat",unit:"g"},
  {key:"fiber",  label:"Fiber",unit:"g"},
  {key:"sodium", label:"Sodium",unit:"mg"},
  {key:"potassium",label:"Potassium",unit:"mg"},
];

const SOURCE_TYPES = ["protein","carb","fat"];
const SOURCE_LABELS = {protein:"Protein Source",carb:"Carb Source",fat:"Fat Source"};
const SOURCE_BADGE  = {protein:"src-protein",carb:"src-carb",fat:"src-fat"};

// ── Meal Item Dialog ──────────────────────────────────────────────────────────
function MealItemDialog({ item, mealId, onSave, onClose, units }) {
  units = units || "metric";
  const isNew = !item;
  const [f, setF] = useState({
    source_type: item?.source_type||"protein", food_name: item?.food_name||"",
    quantity: item?.quantity||1, weight_g: item?.weight_g||0, serving_size: item?.serving_size||"100g",
    protein_g: item?.protein_g||0, carbs_g: item?.carbs_g||0, fat_g: item?.fat_g||0,
    fiber_g: item?.fiber_g||0, sodium_mg: item?.sodium_mg||0, potassium_mg: item?.potassium_mg||0,
  });
  const [e, setE] = useState({});
  const [saving, setSaving] = useState(false);
  const sf = (k,v) => { setE(p=>({...p,[k]:null})); setF(p=>({...p,[k]:v})); };

  function validate_() {
    const err = {};
    err.food_name   = validate(f.food_name,  [rules.required, rules.maxLen(100), rules.noScript]);
    err.quantity    = validate(f.quantity,   [rules.required, rules.numeric, rules.range(0.01, 999)]);
    err.weight_g    = validate(f.weight_g,   [rules.numeric, rules.positiveNum]);
    err.protein_g   = validate(f.protein_g,  [rules.numeric, rules.positiveNum]);
    err.carbs_g     = validate(f.carbs_g,    [rules.numeric, rules.positiveNum]);
    err.fat_g       = validate(f.fat_g,      [rules.numeric, rules.positiveNum]);
    err.fiber_g     = validate(f.fiber_g,    [rules.numeric, rules.positiveNum]);
    err.sodium_mg   = validate(f.sodium_mg,  [rules.numeric, rules.positiveNum]);
    err.potassium_mg= validate(f.potassium_mg,[rules.numeric, rules.positiveNum]);
    setE(err);
    return Object.values(err).every(v=>!v);
  }

  async function save() {
    if (!validate_()) return;
    setSaving(true);
    try {
      const payload = { ...f, quantity:+f.quantity, weight_g:+f.weight_g, protein_g:+f.protein_g,
        carbs_g:+f.carbs_g, fat_g:+f.fat_g, fiber_g:+f.fiber_g, sodium_mg:+f.sodium_mg, potassium_mg:+f.potassium_mg };
      if (item) await apiPut(`/meal-items/${item.id}`, payload);
      else      await apiPost(`/meals/${mealId}/items`, payload);
      onSave(); onClose();
    } catch(err) { setSaving(false); }
  }

  const MACROFIELDS = [
    {k:"protein_g",l:"Protein (g)"},{k:"carbs_g",l:"Carbs (g)"},{k:"fat_g",l:"Fat (g)"},
    {k:"fiber_g",l:"Fiber (g)"},{k:"sodium_mg",l:"Sodium (mg)"},{k:"potassium_mg",l:"Potassium (mg)"},
  ];

  return (
    <div className="overlay" style={{zIndex:150}}>
      <div className="dialog dialog-lg">
        <div className="dialog-title"><Icon name="apple" size={20}/>{isNew?"Add Food Item":"Edit Food Item"}</div>
        <div className="form-grid" style={{marginBottom:16}}>
          <FF label="Source Type">
            <ToggleGroup
              options={SOURCE_TYPES.map(t=>({value:t,label:SOURCE_LABELS[t]}))}
              value={f.source_type} onChange={v=>sf("source_type",v)}/>
          </FF>
          <FF label="Food Name *" error={e.food_name}><input value={f.food_name} className={e.food_name?"err":""} maxLength={100} onChange={ev=>sf("food_name",ev.target.value)} placeholder="e.g. Chicken Breast" autoFocus/></FF>
          <FF label="Quantity *" error={e.quantity} hint="e.g. 1, 1.5, 2"><input type="number" min="0.01" max="999" step="0.01" value={f.quantity} className={e.quantity?"err":""} onChange={ev=>sf("quantity",ev.target.value)}/></FF>
          <FF label={`Weight (${wgLabel(units)})`} error={e.weight_g}>
            <input type="number" min="0" step="0.1"
              value={wgDisplay(f.weight_g, units)}
              className={e.weight_g?"err":""}
              onChange={ev=>sf("weight_g", wgToG(ev.target.value, units))}/>
          </FF>
          <FF label="Serving Size"><input value={f.serving_size} maxLength={50} onChange={ev=>sf("serving_size",ev.target.value)} placeholder="100g, 1 cup"/></FF>
        </div>
        <div style={{fontWeight:700,fontSize:12,color:"var(--text2)",textTransform:"uppercase",letterSpacing:.5,marginBottom:12}}>Nutritional Values (per serving)</div>
        <div className="form-grid">
          {MACROFIELDS.map(({k,l})=>(
            <FF key={k} label={l} error={e[k]}><input type="number" min="0" step="0.1" value={f[k]} className={e[k]?"err":""} onChange={ev=>sf(k,ev.target.value)}/></FF>
          ))}
        </div>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving?<Spinner/>:<Icon name="save" size={14}/>}{isNew?"Add Item":"Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Meal Dialog ────────────────────────────────────────────────────────────────
function MealDialog({ meal, athleteId, onSave, onClose, toast, units }) {
  units = units || "metric";
  const isNew = !meal;
  const [meta, setMeta] = useState({ name: meal?.name||"", day_type: meal?.day_type||"training" });
  const [items, setItems] = useState(meal?.items||[]);
  const [metaErr, setMetaErr] = useState({});
  const [savingMeta, setSavingMeta] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [mealId, setMealId] = useState(meal?.id||null);
  const { confirm, Confirmer } = useConfirm();

  async function saveMeta() {
    const err = {};
    err.name = validate(meta.name, [rules.required, rules.maxLen(100), rules.noScript]);
    setMetaErr(err);
    if (!Object.values(err).every(v=>!v)) return;
    setSavingMeta(true);
    try {
      const payload = { name: meta.name, day_type: meta.day_type };
      if (mealId) {
        const u = await apiPut(`/athletes/${athleteId}/meals/${mealId}`, payload);
        setMeta({ name: u.name, day_type: u.day_type });
        setItems(u.items||[]);
        toast.show("Meal updated","success");
        onSave();
      } else {
        const created = await apiPost(`/athletes/${athleteId}/meals`, payload);
        setMealId(created.id);
        setItems(created.items||[]);
        toast.show("Meal created","success");
        onSave();
      }
    } catch(err) { toast.show(err.message,"error"); }
    setSavingMeta(false);
  }

  async function reloadItems() {
    if (!mealId) return;
    const updated = await apiGet(`/athletes/${athleteId}/meals`);
    const m = updated.find(x=>x.id===mealId);
    if (m) setItems(m.items||[]);
    onSave();
  }

  async function deleteItem(itemId) {
    const ok = await confirm("Delete Item","Remove this food item from the meal?");
    if (!ok) return;
    await apiDel(`/meal-items/${itemId}`);
    await reloadItems();
    toast.show("Item removed","success");
  }

  const totals = items.reduce((acc,it)=>{
    const qty = it.quantity||1;
    ["protein_g","carbs_g","fat_g","fiber_g","sodium_mg","potassium_mg"].forEach(k=>{acc[k]+=(it[k]||0)*qty;});
    acc.calories += ((it.protein_g||0)*4 + (it.carbs_g||0)*4 + (it.fat_g||0)*9)*qty;
    return acc;
  },{protein_g:0,carbs_g:0,fat_g:0,fiber_g:0,sodium_mg:0,potassium_mg:0,calories:0});

  const bySource = {protein:items.filter(i=>i.source_type==="protein"), carb:items.filter(i=>i.source_type==="carb"), fat:items.filter(i=>i.source_type==="fat")};

  return (
    <div className="overlay">
      <div className="dialog dialog-xl">
        <div className="dialog-title"><Icon name="apple" size={20}/>{isNew?"New Meal":"Edit Meal"}</div>

        {/* Meal meta */}
        <div className="form-grid" style={{marginBottom:16}}>
          <FF label="Meal Name *" error={metaErr.name}><input value={meta.name} className={metaErr.name?"err":""} maxLength={100} onChange={ev=>setMeta(p=>({...p,name:ev.target.value}))} placeholder="e.g. Post-Workout Meal"/></FF>
          <FF label="Day Type">
            <ToggleGroup options={[{value:"training",label:"Training Day"},{value:"off",label:"Rest Day"}]} value={meta.day_type} onChange={v=>setMeta(p=>({...p,day_type:v}))}/>
          </FF>
          <div style={{gridColumn:"1/-1",display:"flex",justifyContent:"flex-end"}}>
            <button className="btn btn-secondary btn-sm" onClick={saveMeta} disabled={savingMeta}>{savingMeta?<Spinner/>:<Icon name="save" size={13}/>}Save Meal Info</button>
          </div>
        </div>

        {mealId && (<>
          {/* Totals */}
          <div style={{background:"var(--accent-dim)",border:"1px solid var(--accent)",borderRadius:10,padding:"12px 16px",marginBottom:16,display:"flex",gap:20,flexWrap:"wrap"}}>
            {[["Calories",totals.calories.toFixed(0)+"kcal","var(--green)"],
              ["Protein",totals.protein_g.toFixed(1)+"g","var(--red)"],
              ["Carbs",totals.carbs_g.toFixed(1)+"g","var(--orange)"],
              ["Fat",totals.fat_g.toFixed(1)+"g","var(--yellow)"],
              ["Fiber",totals.fiber_g.toFixed(1)+"g","var(--accent2)"]].map(([l,v,c])=>(
              <div key={l}><div style={{fontSize:10,color:"var(--muted)",textTransform:"uppercase",fontWeight:700}}>{l}</div><div style={{fontWeight:700,color:c,fontSize:15}}>{v}</div></div>
            ))}
          </div>

          {/* Food items by source type */}
          {SOURCE_TYPES.map(st=>(
            <div key={st} style={{marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <span className={`source-badge ${SOURCE_BADGE[st]}`} style={{fontSize:12,padding:"3px 12px"}}>{SOURCE_LABELS[st]}s</span>
                <button className="btn btn-ghost btn-sm" onClick={()=>{setEditItem(null);setShowItemForm(st);}}><Icon name="plus" size={13}/>Add</button>
              </div>
              {bySource[st].length === 0 && <div style={{fontSize:12,color:"var(--muted)",padding:"8px 0"}}>None added yet.</div>}
              {bySource[st].map(it=>(
                <div key={it.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"var(--surface2)",borderRadius:8,marginBottom:6}}>
                  <div style={{flex:1}}>
                    <span style={{fontWeight:600,fontSize:13}}>{it.food_name}</span>
                    <span style={{fontSize:11,color:"var(--text2)",marginLeft:8}}>×{it.quantity} ({it.serving_size})</span>
                  </div>
                  <div style={{fontSize:11,color:"var(--text2)",display:"flex",gap:12}}>
                    <span>P:{((it.protein_g||0)*(it.quantity||1)).toFixed(1)}g</span>
                    <span>C:{((it.carbs_g||0)*(it.quantity||1)).toFixed(1)}g</span>
                    <span>F:{((it.fat_g||0)*(it.quantity||1)).toFixed(1)}g</span>
                  </div>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>{setEditItem(it);setShowItemForm(st);}}><Icon name="edit" size={13}/></button>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>deleteItem(it.id)}><Icon name="trash" size={13}/></button>
                </div>
              ))}
            </div>
          ))}
        </>)}

        <div className="dialog-actions">
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>

        {showItemForm && (
          <MealItemDialog
            item={editItem}
            mealId={mealId}
            units={units}
            onSave={()=>{reloadItems();setShowItemForm(false);setEditItem(null);}}
            onClose={()=>{setShowItemForm(false);setEditItem(null);}}
          />
        )}
        {Confirmer}
      </div>
    </div>
  );
}

// ── Meal Plan Tab ─────────────────────────────────────────────────────────────
function MealPlanTab({ athleteId, toast, units }) {
  units = units || "metric";
  const [macroData, setMacroData] = useState(null);
  const [macroForm, setMacroForm] = useState({});
  const [macroErrors, setMacroErrors] = useState({});
  const [savingMacro, setSavingMacro] = useState(false);
  const [meals, setMeals]     = useState([]);
  const [dayFilter, setDayFilter] = useState("training");
  const [showMealForm, setShowMealForm] = useState(false);
  const [editMeal, setEditMeal] = useState(null);
  const { confirm, Confirmer } = useConfirm();

  useEffect(() => { loadAll(); }, [athleteId]);

  async function loadAll() {
    try {
      const [mp, ml] = await Promise.all([
        apiGet(`/athletes/${athleteId}/meal-plan`),
        apiGet(`/athletes/${athleteId}/meals`),
      ]);
      setMacroData(mp);
      const fm = {};
      MACRO_DEFS.forEach(m=>{ fm[`${m.key}_target`]=mp[`${m.key}_target`]; fm[`${m.key}_actual`]=mp[`${m.key}_actual`]; });
      setMacroForm(fm);
      setMeals(ml);
    } catch(err) { toast.show(err.message,"error"); }
  }

  const smf = (k,v) => { setMacroErrors(p=>({...p,[k]:null})); setMacroForm(p=>({...p,[k]:v})); };

  function validateMacro() {
    const e={};
    MACRO_DEFS.forEach(m=>{
      e[`${m.key}_target`]=validate(macroForm[`${m.key}_target`],[rules.numeric,rules.positiveNum]);
      e[`${m.key}_actual`]=validate(macroForm[`${m.key}_actual`],[rules.numeric,rules.positiveNum]);
    });
    setMacroErrors(e);
    return Object.values(e).every(v=>!v);
  }

  async function saveMacros() {
    if (!validateMacro()) { toast.show("Fix validation errors","error"); return; }
    setSavingMacro(true);
    try {
      const payload={};
      MACRO_DEFS.forEach(m=>{payload[`${m.key}_target`]=+macroForm[`${m.key}_target`];payload[`${m.key}_actual`]=+macroForm[`${m.key}_actual`];});
      const u = await apiPut(`/athletes/${athleteId}/meal-plan`,payload);
      setMacroData(u);
      toast.show("Macro targets saved","success");
    } catch(err){toast.show(err.message,"error");}
    setSavingMacro(false);
  }

  async function deleteMeal(id) {
    const ok = await confirm("Delete Meal","Delete this meal and all its food items?");
    if (!ok) return;
    await apiDel(`/athletes/${athleteId}/meals/${id}`);
    loadAll();
    toast.show("Meal deleted","success");
  }

  const filteredMeals = meals.filter(m=>m.day_type===dayFilter);
  const fillClass=(pct)=>pct>110?"fill-over":pct>=90?"fill-ok":"fill-warn";

  if (!macroData) return <LoadingState/>;

  return (
    <div>
      {/* Info banner */}
      <div className="info-row">
        {[["RMR",`${(macroData.rmr||0).toFixed(0)} kcal`,"var(--accent)"],
          ["Daily Target",`${(macroData.daily_calorie_intake||0).toFixed(0)} kcal`,"var(--green)"]].map(([l,v,c])=>(
          <div key={l} className="info-item"><div className="info-label">{l}</div><div className="info-val" style={{color:c}}>{v}</div></div>
        ))}
      </div>

      {/* Macro Targets */}
      <div className="card">
        <div className="card-title"><Icon name="activity" size={16}/>Macro Targets</div>
        <table className="macro-table">
          <thead><tr><th>Nutrient</th><th>Target</th><th>Actual</th><th>%</th><th>Progress</th></tr></thead>
          <tbody>
            {MACRO_DEFS.map(m=>{
              const target=+macroForm[`${m.key}_target`]||0;
              const actual=+macroForm[`${m.key}_actual`]||0;
              const pct=target>0?Math.round((actual/target)*100):0;
              return (
                <tr key={m.key}>
                  <td><b>{m.label}</b></td>
                  <td>
                    <input type="number" min="0" value={macroForm[`${m.key}_target`]??""} className={macroErrors[`${m.key}_target`]?"err":""}
                      onChange={e=>smf(`${m.key}_target`,e.target.value)}/> {m.unit}
                    {macroErrors[`${m.key}_target`]&&<div className="field-err">{macroErrors[`${m.key}_target`]}</div>}
                  </td>
                  <td>
                    <input type="number" min="0" value={macroForm[`${m.key}_actual`]??""} className={macroErrors[`${m.key}_actual`]?"err":""}
                      onChange={e=>smf(`${m.key}_actual`,e.target.value)}/> {m.unit}
                    {macroErrors[`${m.key}_actual`]&&<div className="field-err">{macroErrors[`${m.key}_actual`]}</div>}
                  </td>
                  <td><span style={{color:pct>110?"var(--red)":pct>=90?"var(--green)":"var(--orange)",fontWeight:700}}>{pct}%</span></td>
                  <td style={{width:100}}><div className="progress-bar"><div className={`progress-fill ${fillClass(pct)}`} style={{width:`${Math.min(120,pct)}%`}}/></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
          <button className="btn btn-primary" onClick={saveMacros} disabled={savingMacro}>
            {savingMacro?<Spinner/>:<Icon name="save" size={14}/>}Save Macro Targets
          </button>
        </div>
      </div>

      {/* Meals */}
      <div className="card">
        <div className="section-header">
          <div className="card-title" style={{marginBottom:0}}><Icon name="apple" size={16}/>Meals</div>
          <div style={{display:"flex",gap:8}}>
            <ToggleGroup options={[{value:"training",label:"Training Day"},{value:"off",label:"Rest Day"}]} value={dayFilter} onChange={setDayFilter}/>
            <button className="btn btn-primary btn-sm" onClick={()=>{setEditMeal(null);setShowMealForm(true);}}><Icon name="plus" size={13}/>New Meal</button>
          </div>
        </div>

        {filteredMeals.length===0 && (
          <EmptyState icon="apple" title={`No ${dayFilter==="training"?"Training":"Rest"} Day Meals`} message="Create a meal to track your nutrition."/>
        )}

        {filteredMeals.map(meal=>(
          <div key={meal.id} className="meal-card">
            <div className="meal-card-header">
              <div style={{flex:1}}>
                <div className="meal-name">{meal.name}</div>
                <div className="meal-summary">
                  {meal.items?.length||0} items · {(meal.totals?.calories||0).toFixed(0)} kcal ·
                  P:{(meal.totals?.protein_g||0).toFixed(0)}g C:{(meal.totals?.carbs_g||0).toFixed(0)}g F:{(meal.totals?.fat_g||0).toFixed(0)}g
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>{setEditMeal(meal);setShowMealForm(true);}}><Icon name="edit" size={14}/></button>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>deleteMeal(meal.id)}><Icon name="trash" size={14}/></button>
              </div>
            </div>
            {meal.items?.length>0&&(
              <div className="meal-items-list">
                {meal.items.map(it=>(
                  <div key={it.id} className="meal-item-row">
                    <span className={`source-badge ${SOURCE_BADGE[it.source_type]}`}>{it.source_type}</span>
                    <span style={{fontWeight:500}}>{it.food_name} <span style={{color:"var(--text2)",fontWeight:400}}>×{it.quantity}</span></span>
                    <span style={{color:"var(--red)"}}>P:{((it.protein_g||0)*(it.quantity||1)).toFixed(1)}g</span>
                    <span style={{color:"var(--orange)"}}>C:{((it.carbs_g||0)*(it.quantity||1)).toFixed(1)}g</span>
                    <span style={{color:"var(--yellow)"}}>F:{((it.fat_g||0)*(it.quantity||1)).toFixed(1)}g</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {showMealForm && <MealDialog meal={editMeal} athleteId={athleteId} units={units} onSave={loadAll} onClose={()=>{setShowMealForm(false);setEditMeal(null);}} toast={toast}/>}
      {Confirmer}
    </div>
  );
}
