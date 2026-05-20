// ─── Food Swaps Tab ────────────────────────────────────────────────────────────

const SWAP_CATEGORIES = [
  { key: "fruits_veg", label: "Fruits & Vegetables", icon: "leaf",    color: "var(--green)"  },
  { key: "fats",       label: "Fats",                icon: "droplet", color: "var(--yellow)" },
  { key: "carbs",      label: "Carbs",               icon: "zap",     color: "var(--accent)" },
];

const SWAP_UNITS = ["g", "oz", "ml"];

// ── Calorie helpers ───────────────────────────────────────────────────────────

function lookupFood(name) {
  if (!name || !name.trim()) return null;
  const q = name.trim().toLowerCase();
  return (
    FOOD_LIBRARY.find(f => f.n.toLowerCase() === q) ||
    FOOD_LIBRARY.find(f => f.n.toLowerCase().startsWith(q)) ||
    FOOD_LIBRARY.find(f => f.n.toLowerCase().includes(q)) ||
    null
  );
}

function toGrams(amount, unit) {
  const a = parseFloat(amount) || 0;
  if (unit === "oz") return a * 28.3495;
  return a;
}

function fromGrams(grams, unit) {
  if (unit === "oz") return Math.round(grams / 28.3495 * 10) / 10;
  return Math.round(grams);
}

function calcKcal(food, amount, unit) {
  if (!food || !food.kcal || !amount) return null;
  const g = toGrams(parseFloat(amount) || 0, unit);
  if (g <= 0) return null;
  return Math.round(food.kcal * g / 100);
}

function autoSwapAmount(sourceKcal, swapFood, swapUnit) {
  if (!swapFood || !swapFood.kcal || !sourceKcal) return null;
  const g = sourceKcal / (swapFood.kcal / 100);
  if (g <= 0 || g > 5000) return null;
  return fromGrams(g, swapUnit);
}

// ── Food name input with typeahead ────────────────────────────────────────────
function FoodInput({ value, onChange, onFoodSelected, placeholder, inputStyle }) {
  const [open, setOpen] = useState(false);

  const q = (value || "").trim().toLowerCase();
  const matches = q.length > 0
    ? FOOD_LIBRARY.filter(f => f.n.toLowerCase().includes(q)).slice(0, 8)
    : [];

  function handleChange(ev) {
    const v = ev.target.value;
    onChange(v);
    onFoodSelected(lookupFood(v));   // null when no match, food when matched
    setOpen(true);
  }

  function selectFood(food) {
    onChange(food.n);
    onFoodSelected(food);
    setOpen(false);
  }

  function handleBlur() {
    setTimeout(() => setOpen(false), 160);
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        value={value || ""}
        onChange={handleChange}
        onFocus={() => { if ((value || "").trim()) setOpen(true); }}
        onBlur={handleBlur}
        placeholder={placeholder}
        maxLength={150}
        style={inputStyle}
      />
      {open && matches.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0, zIndex: 300,
          background: "var(--surface)", border: "1px solid var(--border2)",
          borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,.22)",
          maxHeight: 220, overflowY: "auto",
        }}>
          {matches.map(food => (
            <div key={food.n}
              onMouseDown={() => selectFood(food)}
              style={{
                padding: "8px 12px", cursor: "pointer", fontSize: 13,
                borderBottom: "1px solid var(--border)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}
              onMouseEnter={ev => ev.currentTarget.style.background = "var(--surface2)"}
              onMouseLeave={ev => ev.currentTarget.style.background = ""}>
              <span style={{ fontWeight: 600 }}>{food.n}</span>
              <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8, flexShrink: 0 }}>
                {food.kcal} kcal/100g
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Calorie badge ─────────────────────────────────────────────────────────────
function KcalBadge({ kcal, green }) {
  if (kcal === null) return <div style={{ height: 16 }}/>;
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, textAlign: "center", marginTop: 3,
      color: green ? "var(--green)" : "var(--accent)",
    }}>
      {kcal} kcal
    </div>
  );
}

// ── Inline-editable swap row ───────────────────────────────────────────────────
function SwapRow({ swap, athleteId, onSaved, onDeleted, toast }) {
  const [f, setF]             = useState({ ...swap });
  const [saving, setSaving]   = useState(false);
  const [srcFood, setSrcFood] = useState(() => lookupFood(swap.source_name));
  const [swpFood, setSwpFood] = useState(() => lookupFood(swap.swap_name));
  // manualSrcKcal lets the user specify source kcal when food isn't in library
  const [manualSrcKcal, setManualSrcKcal] = useState(null);

  const sf = (k, v) => setF(p => ({ ...p, [k]: v }));

  const srcKcalAuto = calcKcal(srcFood, f.source_amount, f.source_unit);
  const srcKcal     = srcKcalAuto !== null ? srcKcalAuto : (
    manualSrcKcal ? Math.round(manualSrcKcal * (toGrams(parseFloat(f.source_amount)||0, f.source_unit)) / 100) : null
  );
  const swpKcal     = calcKcal(swpFood, f.swap_amount, f.swap_unit);
  const kcalMatched = srcKcal !== null && swpKcal !== null && srcKcal === swpKcal;

  // Auto-calc swap amount whenever source kcal or swap food changes
  useEffect(() => {
    if (srcKcal !== null && swpFood) {
      const auto = autoSwapAmount(srcKcal, swpFood, f.swap_unit);
      if (auto !== null) sf("swap_amount", auto);
    }
  }, [srcKcal, swpFood, f.swap_unit]);

  function handleSrcFoodSelected(food) { setSrcFood(food); }
  function handleSwpFoodSelected(food) { setSwpFood(food); }

  const srcNotInLib = f.source_name.trim() && !srcFood;

  const dirty = ["source_name","source_amount","source_unit","swap_name","swap_amount","swap_unit"]
    .some(k => String(f[k]) !== String(swap[k]));

  async function save() {
    if (!f.source_name.trim() && !f.swap_name.trim()) return;
    setSaving(true);
    try {
      const updated = await apiPut(`/athletes/${athleteId}/food-swaps/${swap.id}`, {
        category: f.category,
        source_name: f.source_name, source_amount: +f.source_amount, source_unit: f.source_unit,
        swap_name: f.swap_name, swap_amount: +f.swap_amount, swap_unit: f.swap_unit,
        sort_order: f.sort_order,
      });
      onSaved(updated);
      toast.show("Swap saved", "success");
    } catch(err) { toast.show(err.message, "error"); }
    setSaving(false);
  }

  async function del() {
    setSaving(true);
    try {
      await apiDel(`/athletes/${athleteId}/food-swaps/${swap.id}`);
      onDeleted(swap.id);
    } catch(err) { toast.show(err.message, "error"); setSaving(false); }
  }

  const base = {
    background: "var(--surface)", border: "1px solid var(--border2)",
    borderRadius: 6, padding: "6px 8px", color: "var(--text)",
    fontFamily: "var(--font)", fontSize: 13, width: "100%",
  };
  const numStyle = { ...base, width: 72 };
  const selStyle = { ...base, width: 66 };

  return (
    <tr style={{ borderBottom: "1px solid var(--border)", verticalAlign: "top" }}>
      <td style={{ padding: "8px 10px" }}>
        <FoodInput value={f.source_name}
          onChange={v => { sf("source_name", v); setSrcFood(lookupFood(v)); }}
          onFoodSelected={handleSrcFoodSelected}
          placeholder="Source food…" inputStyle={base}/>
        {srcNotInLib && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
            <input type="number" min="0" max="9999" step="1"
              value={manualSrcKcal || ""}
              onChange={ev => setManualSrcKcal(ev.target.value ? +ev.target.value : null)}
              placeholder="kcal/100g"
              style={{ ...base, width: 80, fontSize: 11, padding: "3px 6px", borderColor: "var(--yellow)" }}/>
            <span style={{ fontSize: 10, color: "var(--yellow)", whiteSpace: "nowrap" }}>kcal/100g</span>
          </div>
        )}
      </td>
      <td style={{ padding: "8px 6px" }}>
        <input type="number" min="0" max="10000" step="0.1"
          value={f.source_amount}
          onChange={ev => sf("source_amount", ev.target.value)}
          style={numStyle}/>
        <KcalBadge kcal={srcKcalAuto} green={false}/>
      </td>
      <td style={{ padding: "8px 6px" }}>
        <select value={f.source_unit}
          onChange={ev => sf("source_unit", ev.target.value)}
          style={selStyle}>
          {SWAP_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </td>
      <td style={{ padding: "8px 10px", textAlign: "center", color: "var(--muted)", fontSize: 18, userSelect: "none", verticalAlign: "middle" }}>
        ⇄
      </td>
      <td style={{ padding: "8px 10px" }}>
        <FoodInput value={f.swap_name}
          onChange={v => { sf("swap_name", v); setSwpFood(lookupFood(v)); }}
          onFoodSelected={handleSwpFoodSelected}
          placeholder="Equivalent food…" inputStyle={base}/>
      </td>
      <td style={{ padding: "8px 6px" }}>
        <input type="number" min="0" max="10000" step="0.1"
          value={f.swap_amount}
          onChange={ev => sf("swap_amount", ev.target.value)}
          style={{ ...numStyle, borderColor: swpFood ? "var(--accent)" : "var(--border2)" }}/>
        <KcalBadge kcal={swpKcal} green={kcalMatched}/>
      </td>
      <td style={{ padding: "8px 6px" }}>
        <select value={f.swap_unit}
          onChange={ev => sf("swap_unit", ev.target.value)}
          style={selStyle}>
          {SWAP_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </td>
      <td style={{ padding: "8px 8px", whiteSpace: "nowrap", verticalAlign: "middle" }}>
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
          {dirty && (
            <button className="btn btn-primary btn-sm btn-icon" title="Save" onClick={save} disabled={saving}>
              {saving ? <Spinner/> : <Icon name="save" size={13}/>}
            </button>
          )}
          <button className="btn btn-ghost btn-sm btn-icon" title="Delete" onClick={del} disabled={saving}>
            <Icon name="trash" size={13}/>
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── New swap row ──────────────────────────────────────────────────────────────
function NewSwapRow({ category, athleteId, onSaved, onCancel, toast }) {
  const [f, setF]             = useState({
    source_name: "", source_amount: 100, source_unit: "g",
    swap_name:   "", swap_amount:   100, swap_unit:   "g",
  });
  const [saving, setSaving]   = useState(false);
  const [srcFood, setSrcFood] = useState(null);
  const [swpFood, setSwpFood] = useState(null);
  const [manualSrcKcal, setManualSrcKcal] = useState(null);

  const sf = (k, v) => setF(p => ({ ...p, [k]: v }));

  const srcKcalAuto = calcKcal(srcFood, f.source_amount, f.source_unit);
  const srcKcal     = srcKcalAuto !== null ? srcKcalAuto : (
    manualSrcKcal ? Math.round(manualSrcKcal * (toGrams(parseFloat(f.source_amount)||0, f.source_unit)) / 100) : null
  );
  const swpKcal     = calcKcal(swpFood, f.swap_amount, f.swap_unit);
  const kcalMatched = srcKcal !== null && swpKcal !== null && srcKcal === swpKcal;

  // Auto-calc swap amount whenever source kcal or swap food changes
  useEffect(() => {
    if (srcKcal !== null && swpFood) {
      const auto = autoSwapAmount(srcKcal, swpFood, f.swap_unit);
      if (auto !== null) sf("swap_amount", auto);
    }
  }, [srcKcal, swpFood, f.swap_unit]);

  function handleSrcFoodSelected(food) { setSrcFood(food); }
  function handleSwpFoodSelected(food) { setSwpFood(food); }

  const srcNotInLib = f.source_name.trim() && !srcFood;

  async function save() {
    if (!f.source_name.trim() || !f.swap_name.trim()) {
      toast.show("Both food names are required", "error"); return;
    }
    setSaving(true);
    try {
      const created = await apiPost(`/athletes/${athleteId}/food-swaps`, {
        category,
        source_name: f.source_name, source_amount: +f.source_amount, source_unit: f.source_unit,
        swap_name: f.swap_name, swap_amount: +f.swap_amount, swap_unit: f.swap_unit,
        sort_order: 0,
      });
      onSaved(created);
      toast.show("Swap added", "success");
    } catch(err) { toast.show(err.message, "error"); setSaving(false); }
  }

  const base = {
    background: "var(--surface)", border: "1px solid var(--accent)",
    borderRadius: 6, padding: "6px 8px", color: "var(--text)",
    fontFamily: "var(--font)", fontSize: 13, width: "100%",
  };
  const numStyle = { ...base, width: 72 };
  const selStyle = { ...base, width: 66 };

  return (
    <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--accent-dim)", verticalAlign: "top" }}>
      <td style={{ padding: "8px 10px" }}>
        <FoodInput value={f.source_name}
          onChange={v => { sf("source_name", v); setSrcFood(lookupFood(v)); }}
          onFoodSelected={handleSrcFoodSelected}
          placeholder="Source food…" inputStyle={base}/>
        {srcNotInLib && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
            <input type="number" min="0" max="9999" step="1"
              value={manualSrcKcal || ""}
              onChange={ev => setManualSrcKcal(ev.target.value ? +ev.target.value : null)}
              placeholder="kcal/100g"
              style={{ ...base, width: 80, fontSize: 11, padding: "3px 6px", borderColor: "var(--yellow)" }}/>
            <span style={{ fontSize: 10, color: "var(--yellow)", whiteSpace: "nowrap" }}>kcal/100g</span>
          </div>
        )}
      </td>
      <td style={{ padding: "8px 6px" }}>
        <input type="number" min="0" max="10000" step="0.1"
          value={f.source_amount}
          onChange={ev => sf("source_amount", ev.target.value)}
          style={numStyle}/>
        <KcalBadge kcal={srcKcalAuto} green={false}/>
      </td>
      <td style={{ padding: "8px 6px" }}>
        <select value={f.source_unit}
          onChange={ev => sf("source_unit", ev.target.value)}
          style={selStyle}>
          {SWAP_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </td>
      <td style={{ padding: "8px 10px", textAlign: "center", color: "var(--muted)", fontSize: 18, verticalAlign: "middle" }}>⇄</td>
      <td style={{ padding: "8px 10px" }}>
        <FoodInput value={f.swap_name}
          onChange={v => { sf("swap_name", v); setSwpFood(lookupFood(v)); }}
          onFoodSelected={handleSwpFoodSelected}
          placeholder="Equivalent food…" inputStyle={base}/>
      </td>
      <td style={{ padding: "8px 6px" }}>
        <input type="number" min="0" max="10000" step="0.1"
          value={f.swap_amount}
          onChange={ev => sf("swap_amount", ev.target.value)}
          style={{ ...numStyle, borderColor: swpFood ? "var(--green)" : "var(--accent)" }}/>
        <KcalBadge kcal={swpKcal} green={kcalMatched}/>
      </td>
      <td style={{ padding: "8px 6px" }}>
        <select value={f.swap_unit}
          onChange={ev => sf("swap_unit", ev.target.value)}
          style={selStyle}>
          {SWAP_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </td>
      <td style={{ padding: "8px 8px", whiteSpace: "nowrap", verticalAlign: "middle" }}>
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
          <button className="btn btn-primary btn-sm btn-icon" onClick={save} disabled={saving} title="Add">
            {saving ? <Spinner/> : <Icon name="check" size={13}/>}
          </button>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onCancel} title="Cancel">
            <Icon name="x" size={13}/>
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Category section ──────────────────────────────────────────────────────────
function SwapSection({ cat, swaps, athleteId, onUpdate, onDelete, onAdd, toast }) {
  const [addingRow, setAddingRow] = useState(false);

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 32, height: 32, borderRadius: 8, background: `${cat.color}22`,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name={cat.icon} size={16} color={cat.color}/>
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{cat.label}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {swaps.length} swap{swaps.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setAddingRow(true)} disabled={addingRow}>
          <Icon name="plus" size={13}/>Add Swap
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)" }}>
              <th style={thStyle}>Source Food</th>
              <th style={{ ...thStyle, width: 88 }}>Amount</th>
              <th style={{ ...thStyle, width: 72 }}>Unit</th>
              <th style={{ ...thStyle, width: 36, textAlign: "center" }}></th>
              <th style={thStyle}>Swap Food</th>
              <th style={{ ...thStyle, width: 88 }}>Amount</th>
              <th style={{ ...thStyle, width: 72 }}>Unit</th>
              <th style={{ ...thStyle, width: 64 }}></th>
            </tr>
          </thead>
          <tbody>
            {swaps.map(s => (
              <SwapRow key={s.id} swap={s} athleteId={athleteId}
                onSaved={onUpdate} onDeleted={onDelete} toast={toast}/>
            ))}
            {addingRow && (
              <NewSwapRow
                category={cat.key} athleteId={athleteId}
                onSaved={created => { onAdd(created); setAddingRow(false); }}
                onCancel={() => setAddingRow(false)}
                toast={toast}/>
            )}
            {swaps.length === 0 && !addingRow && (
              <tr>
                <td colSpan={8} style={{ padding: "24px 10px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                  No swaps yet — click <strong>Add Swap</strong> to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: "left", padding: "6px 10px", fontSize: 11, fontWeight: 700,
  color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap",
};

// ── Food Swaps Tab ─────────────────────────────────────────────────────────────
function FoodSwapsTab({ athleteId, toast }) {
  const [swaps, setSwaps]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [athleteId]);

  async function load() {
    setLoading(true);
    try {
      const d = await apiGet(`/athletes/${athleteId}/food-swaps`);
      setSwaps(d);
    } catch(err) { toast.show(err.message, "error"); }
    setLoading(false);
  }

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Spinner/></div>
  );

  return (
    <div>
      <div className="section-header" style={{ marginBottom: 20 }}>
        <div>
          <div className="section-title">Food Swaps</div>
          <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>
            Interchangeable foods with equivalent portions. Type a food name to pick from the library
            — the swap amount auto-calculates to match calories.
          </div>
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", alignSelf: "center" }}>
          {swaps.length} total swap{swaps.length !== 1 ? "s" : ""}
        </div>
      </div>

      {SWAP_CATEGORIES.map(cat => (
        <SwapSection key={cat.key} cat={cat}
          swaps={swaps.filter(s => s.category === cat.key)}
          athleteId={athleteId}
          onUpdate={updated => setSwaps(prev => prev.map(s => s.id === updated.id ? updated : s))}
          onDelete={id => setSwaps(prev => prev.filter(s => s.id !== id))}
          onAdd={created => setSwaps(prev => [...prev, created])}
          toast={toast}/>
      ))}
    </div>
  );
}
