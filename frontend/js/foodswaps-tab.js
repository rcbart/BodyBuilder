// ─── Food Swaps Tab (formerly Nutrition Plan) ─────────────────────────────────
const FOOD_CATS = ["general","protein","carbs","vegetables","fruits","dairy","fats","supplements"];

function FoodSwapsTab({ athleteId, toast }) {
  const [foods, setFoods]     = useState([]);
  const [search, setSearch]   = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editFood, setEditFood] = useState(null);
  const { confirm, Confirmer } = useConfirm();

  useEffect(() => { loadFoods(); }, [athleteId]);
  async function loadFoods() { const d=await apiGet(`/athletes/${athleteId}/foods`); setFoods(d); }

  const filtered = foods.filter(f=>
    (!filterCat||f.category===filterCat) &&
    (!search||f.name.toLowerCase().includes(search.toLowerCase()))
  );

  async function deleteFood(food) {
    const ok = await confirm("Delete Food","Remove this food from your database?");
    if (!ok) return;
    await apiDel(`/athletes/${athleteId}/foods/${food.id}`);
    loadFoods();
    toast.show("Food deleted","success");
  }

  return (
    <div>
      <div className="section-header">
        <div style={{fontSize:13,color:"var(--text2)"}}>{foods.length} food{foods.length!==1?"s":""} in database</div>
        <button className="btn btn-primary" onClick={()=>{setEditFood(null);setShowForm(true);}}><Icon name="plus" size={14}/>Add Food</button>
      </div>

      {/* Filters */}
      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:180,position:"relative"}}>
          <Icon name="search" size={14} color="var(--muted)" style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search foods…"
            style={{width:"100%",background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:8,padding:"9px 12px 9px 32px",color:"var(--text)",fontFamily:"var(--font)",fontSize:13}}/>
        </div>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
          style={{background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:8,padding:"9px 12px",color:"var(--text)",fontFamily:"var(--font)",fontSize:13}}>
          <option value="">All Categories</option>
          {FOOD_CATS.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
        </select>
      </div>

      {filtered.length===0&&<EmptyState icon="layers" title="No Foods Found" message="Add healthy food swaps to build your nutrition database."/>}

      <div className="food-grid">
        {filtered.map(f=>(
          <div key={f.id} className="food-card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <div className="food-name">{f.name}</div>
                <span className="badge badge-accent" style={{fontSize:10}}>{f.category}</span>
                <span style={{fontSize:11,color:"var(--muted)",marginLeft:6}}>{f.serving_size}</span>
              </div>
              <div style={{display:"flex",gap:4}}>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>{setEditFood(f);setShowForm(true);}}><Icon name="edit" size={13}/></button>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>deleteFood(f)}><Icon name="trash" size={13}/></button>
              </div>
            </div>
            <div className="food-macros">
              <span className="food-macro-pill" style={{color:"var(--red)"}}>P: {f.protein}g</span>
              <span className="food-macro-pill" style={{color:"var(--orange)"}}>C: {f.carbs}g</span>
              <span className="food-macro-pill" style={{color:"var(--yellow)"}}>F: {f.fat}g</span>
              <span className="food-macro-pill" style={{color:"var(--green)"}}><Icon name="flame" size={10}/> {f.calories} kcal</span>
            </div>
            {(f.fiber||f.sodium||f.potassium)>0&&(
              <div className="food-macros" style={{marginTop:4}}>
                {f.fiber>0&&<span className="food-macro-pill">Fiber: {f.fiber}g</span>}
                {f.sodium>0&&<span className="food-macro-pill">Na: {f.sodium}mg</span>}
                {f.potassium>0&&<span className="food-macro-pill">K: {f.potassium}mg</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      {showForm && <FoodFormDialog food={editFood} athleteId={athleteId} onSave={()=>{loadFoods();setShowForm(false);setEditFood(null);}} onClose={()=>{setShowForm(false);setEditFood(null);}} toast={toast}/>}
      {Confirmer}
    </div>
  );
}

function FoodFormDialog({ food, athleteId, onSave, onClose, toast }) {
  const isNew = !food;
  const MFIELDS = ["protein","carbs","fat","fiber","sodium","potassium","calories"];
  const MLABELS = {protein:"Protein (g)",carbs:"Carbs (g)",fat:"Fat (g)",fiber:"Fiber (g)",sodium:"Sodium (mg)",potassium:"Potassium (mg)",calories:"Calories (kcal)"};
  const [f, setF] = useState({ name:food?.name||"", serving_size:food?.serving_size||"100g", category:food?.category||"general",
    protein:food?.protein||0, carbs:food?.carbs||0, fat:food?.fat||0, fiber:food?.fiber||0, sodium:food?.sodium||0, potassium:food?.potassium||0, calories:food?.calories||0 });
  const [e, setE] = useState({});
  const [saving, setSaving] = useState(false);
  const sf = (k,v) => { setE(p=>({...p,[k]:null})); setF(p=>({...p,[k]:v})); };

  function validate_() {
    const err={};
    err.name=validate(f.name,[rules.required,rules.maxLen(100),rules.noScript]);
    err.serving_size=validate(f.serving_size,[rules.required,rules.maxLen(50)]);
    MFIELDS.forEach(k=>{err[k]=validate(f[k],[rules.numeric,rules.positiveNum]);});
    setE(err);
    return Object.values(err).every(v=>!v);
  }

  async function save() {
    if (!validate_()) return;
    setSaving(true);
    try {
      const payload={...f,...Object.fromEntries(MFIELDS.map(k=>[k,+f[k]]))};
      if (food) await apiPut(`/athletes/${athleteId}/foods/${food.id}`,payload);
      else      await apiPost(`/athletes/${athleteId}/foods`,payload);
      toast.show(food?"Food updated":"Food added","success");
      onSave();
    } catch(err){toast.show(err.message,"error");setSaving(false);}
  }

  return (
    <div className="overlay" style={{zIndex:150}}>
      <div className="dialog dialog-lg">
        <div className="dialog-title"><Icon name="layers" size={20}/>{isNew?"Add Food Swap":"Edit Food Swap"}</div>
        <div className="form-grid" style={{marginBottom:16}}>
          <FF label="Food Name *" error={e.name}><input value={f.name} className={e.name?"err":""} maxLength={100} onChange={ev=>sf("name",ev.target.value)} placeholder="e.g. Brown Rice" autoFocus/></FF>
          <FF label="Serving Size" error={e.serving_size}><input value={f.serving_size} className={e.serving_size?"err":""} maxLength={50} onChange={ev=>sf("serving_size",ev.target.value)} placeholder="100g, 1 cup"/></FF>
          <FF label="Category"><select value={f.category} onChange={ev=>sf("category",ev.target.value)}>{FOOD_CATS.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}</select></FF>
          {MFIELDS.map(k=><FF key={k} label={MLABELS[k]} error={e[k]}><input type="number" min="0" step="0.1" value={f[k]} className={e[k]?"err":""} onChange={ev=>sf(k,ev.target.value)}/></FF>)}
        </div>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?<Spinner/>:<Icon name="save" size={14}/>}{isNew?"Add Food":"Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}
