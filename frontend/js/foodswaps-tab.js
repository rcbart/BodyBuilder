// ─── Food Swaps Tab ────────────────────────────────────────────────────────────

const SWAP_CATEGORIES = [
  { key: "fruits_veg", label: "Fruits & Vegetables", icon: "leaf",    color: "var(--green)"  },
  { key: "fats",       label: "Fats",                icon: "droplet", color: "var(--yellow)" },
  { key: "carbs",      label: "Carbs",               icon: "zap",     color: "var(--accent)" },
];

const SWAP_UNITS = ["g", "oz", "ml"];

// ── Inline-editable swap row ───────────────────────────────────────────────────
function SwapRow({ swap, athleteId, onSaved, onDeleted, toast }) {
  const [f, setF]       = useState({ ...swap });
  const [saving, setSaving] = useState(false);
  const sf = (k, v) => setF(p => ({ ...p, [k]: v }));

  const dirty = ["source_name","source_amount","source_unit","swap_name","swap_amount","swap_unit"]
    .some(k => String(f[k]) !== String(swap[k]));

  async function save() {
    if (!f.source_name.trim() && !f.swap_name.trim()) return;
    setSaving(true);
    try {
      const updated = await apiPut(`/athletes/${athleteId}/food-swaps/${swap.id}`, {
        category:      f.category,
        source_name:   f.source_name,
        source_amount: +f.source_amount,
        source_unit:   f.source_unit,
        swap_name:     f.swap_name,
        swap_amount:   +f.swap_amount,
        swap_unit:     f.swap_unit,
        sort_order:    f.sort_order,
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

  const inputStyle = {
    background: "var(--surface)",
    border: "1px solid var(--border2)",
    borderRadius: 6,
    padding: "6px 8px",
    color: "var(--text)",
    fontFamily: "var(--font)",
    fontSize: 13,
    width: "100%",
  };
  const numStyle = { ...inputStyle, width: 72 };
  const selStyle = { ...inputStyle, width: 66 };

  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      {/* Source food */}
      <td style={{ padding: "8px 10px" }}>
        <input value={f.source_name} maxLength={150}
          onChange={ev => sf("source_name", ev.target.value)}
          placeholder="Source food…"
          style={inputStyle}/>
      </td>
      {/* Source amount */}
      <td style={{ padding: "8px 6px" }}>
        <input type="number" min="0" max="10000" step="0.1"
          value={f.source_amount}
          onChange={ev => sf("source_amount", ev.target.value)}
          style={numStyle}/>
      </td>
      {/* Source unit */}
      <td style={{ padding: "8px 6px" }}>
        <select value={f.source_unit} onChange={ev => sf("source_unit", ev.target.value)} style={selStyle}>
          {SWAP_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </td>
      {/* Arrow */}
      <td style={{ padding: "8px 10px", textAlign: "center", color: "var(--muted)", fontSize: 18, userSelect: "none" }}>
        ⇄
      </td>
      {/* Swap food */}
      <td style={{ padding: "8px 10px" }}>
        <input value={f.swap_name} maxLength={150}
          onChange={ev => sf("swap_name", ev.target.value)}
          placeholder="Equivalent food…"
          style={inputStyle}/>
      </td>
      {/* Swap amount */}
      <td style={{ padding: "8px 6px" }}>
        <input type="number" min="0" max="10000" step="0.1"
          value={f.swap_amount}
          onChange={ev => sf("swap_amount", ev.target.value)}
          style={numStyle}/>
      </td>
      {/* Swap unit */}
      <td style={{ padding: "8px 6px" }}>
        <select value={f.swap_unit} onChange={ev => sf("swap_unit", ev.target.value)} style={selStyle}>
          {SWAP_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </td>
      {/* Actions */}
      <td style={{ padding: "8px 8px", whiteSpace: "nowrap" }}>
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

// ── New row (unsaved) ──────────────────────────────────────────────────────────
function NewSwapRow({ category, athleteId, onSaved, onCancel, toast }) {
  const [f, setF]       = useState({
    source_name: "", source_amount: 100, source_unit: "g",
    swap_name:   "", swap_amount:   100, swap_unit:   "g",
  });
  const [saving, setSaving] = useState(false);
  const sf = (k, v) => setF(p => ({ ...p, [k]: v }));

  async function save() {
    if (!f.source_name.trim() || !f.swap_name.trim()) {
      toast.show("Both food names are required", "error"); return;
    }
    setSaving(true);
    try {
      const created = await apiPost(`/athletes/${athleteId}/food-swaps`, {
        category,
        source_name:   f.source_name,
        source_amount: +f.source_amount,
        source_unit:   f.source_unit,
        swap_name:     f.swap_name,
        swap_amount:   +f.swap_amount,
        swap_unit:     f.swap_unit,
        sort_order:    0,
      });
      onSaved(created);
      toast.show("Swap added", "success");
    } catch(err) { toast.show(err.message, "error"); setSaving(false); }
  }

  const inputStyle = {
    background: "var(--surface)",
    border: "1px solid var(--accent)",
    borderRadius: 6,
    padding: "6px 8px",
    color: "var(--text)",
    fontFamily: "var(--font)",
    fontSize: 13,
    width: "100%",
  };
  const numStyle = { ...inputStyle, width: 72 };
  const selStyle = { ...inputStyle, width: 66 };

  return (
    <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--accent-dim)" }}>
      <td style={{ padding: "8px 10px" }}>
        <input value={f.source_name} maxLength={150} autoFocus
          onChange={ev => sf("source_name", ev.target.value)}
          placeholder="Source food…" style={inputStyle}
          onKeyDown={ev => ev.key === "Enter" && save()}/>
      </td>
      <td style={{ padding: "8px 6px" }}>
        <input type="number" min="0" max="10000" step="0.1"
          value={f.source_amount} onChange={ev => sf("source_amount", ev.target.value)} style={numStyle}/>
      </td>
      <td style={{ padding: "8px 6px" }}>
        <select value={f.source_unit} onChange={ev => sf("source_unit", ev.target.value)} style={selStyle}>
          {SWAP_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </td>
      <td style={{ padding: "8px 10px", textAlign: "center", color: "var(--muted)", fontSize: 18 }}>⇄</td>
      <td style={{ padding: "8px 10px" }}>
        <input value={f.swap_name} maxLength={150}
          onChange={ev => sf("swap_name", ev.target.value)}
          placeholder="Equivalent food…" style={inputStyle}
          onKeyDown={ev => ev.key === "Enter" && save()}/>
      </td>
      <td style={{ padding: "8px 6px" }}>
        <input type="number" min="0" max="10000" step="0.1"
          value={f.swap_amount} onChange={ev => sf("swap_amount", ev.target.value)} style={numStyle}/>
      </td>
      <td style={{ padding: "8px 6px" }}>
        <select value={f.swap_unit} onChange={ev => sf("swap_unit", ev.target.value)} style={selStyle}>
          {SWAP_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </td>
      <td style={{ padding: "8px 8px", whiteSpace: "nowrap" }}>
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

// ── Category Section ───────────────────────────────────────────────────────────
function SwapSection({ cat, swaps, athleteId, onUpdate, onDelete, onAdd, toast }) {
  const [addingRow, setAddingRow] = useState(false);

  function handleSaved(updated) {
    onUpdate(updated);
  }

  function handleAdded(created) {
    onAdd(created);
    setAddingRow(false);
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      {/* Section header */}
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
              <th style={{ ...thStyle, width: 80 }}>Amount</th>
              <th style={{ ...thStyle, width: 72 }}>Unit</th>
              <th style={{ ...thStyle, width: 36, textAlign: "center" }}></th>
              <th style={thStyle}>Swap Food</th>
              <th style={{ ...thStyle, width: 80 }}>Amount</th>
              <th style={{ ...thStyle, width: 72 }}>Unit</th>
              <th style={{ ...thStyle, width: 64 }}></th>
            </tr>
          </thead>
          <tbody>
            {swaps.map(s => (
              <SwapRow
                key={s.id}
                swap={s}
                athleteId={athleteId}
                onSaved={handleSaved}
                onDeleted={onDelete}
                toast={toast}
              />
            ))}
            {addingRow && (
              <NewSwapRow
                category={cat.key}
                athleteId={athleteId}
                onSaved={handleAdded}
                onCancel={() => setAddingRow(false)}
                toast={toast}
              />
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
  textAlign: "left",
  padding: "6px 10px",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: 0.4,
  whiteSpace: "nowrap",
};

// ── Food Swaps Tab ─────────────────────────────────────────────────────────────
function FoodSwapsTab({ athleteId, toast }) {
  const [swaps, setSwaps] = useState([]);
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

  function handleUpdate(updated) {
    setSwaps(prev => prev.map(s => s.id === updated.id ? updated : s));
  }

  function handleDelete(id) {
    setSwaps(prev => prev.filter(s => s.id !== id));
  }

  function handleAdd(created) {
    setSwaps(prev => [...prev, created]);
  }

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
      <Spinner/>
    </div>
  );

  return (
    <div>
      <div className="section-header" style={{ marginBottom: 20 }}>
        <div>
          <div className="section-title">Food Swaps</div>
          <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>
            Interchangeable foods with equivalent portions — edit any row and save with the
            <span style={{ display: "inline-flex", verticalAlign: "middle", margin: "0 4px" }}>
              <Icon name="save" size={12} color="var(--accent)"/>
            </span>
            button.
          </div>
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", alignSelf: "center" }}>
          {swaps.length} total swap{swaps.length !== 1 ? "s" : ""}
        </div>
      </div>

      {SWAP_CATEGORIES.map(cat => (
        <SwapSection
          key={cat.key}
          cat={cat}
          swaps={swaps.filter(s => s.category === cat.key)}
          athleteId={athleteId}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onAdd={handleAdd}
          toast={toast}
        />
      ))}
    </div>
  );
}
