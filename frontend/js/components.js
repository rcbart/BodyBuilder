// ─── Shared UI Components ─────────────────────────────────────────────────────
const { useState, useEffect, useCallback, useRef } = React;

// ── Toast System ──────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3800);
    return () => clearTimeout(t);
  }, []);
  const colors = { success: "var(--green)", error: "var(--red)", info: "var(--accent)" };
  const icons  = { success: "check", error: "x", info: "info" };
  return (
    <div className="toast">
      <Icon name={icons[type] || "info"} size={16} color={colors[type] || "var(--accent)"} />
      <span>{message}</span>
    </div>
  );
}

function useToast() {
  const [t, setT] = useState(null);
  const show = useCallback((message, type = "info") => setT({ message, type, key: Date.now() }), []);
  const Toaster = t ? <Toast key={t.key} message={t.message} type={t.type} onClose={() => setT(null)} /> : null;
  return { show, Toaster };
}

// ── Form Field Wrapper ─────────────────────────────────────────────────────────
function FF({ label, error, children, full, hint }) {
  return (
    <div className="form-group" style={full ? { gridColumn: "1/-1" } : {}}>
      {label && <label className="form-label">{label}</label>}
      {children}
      {error && <span className="field-err">{error}</span>}
      {hint && !error && <span style={{ fontSize: 11, color: "var(--muted)" }}>{hint}</span>}
    </div>
  );
}

// ── Toggle Group (AM/PM, Male/Female, etc.) ───────────────────────────────────
function ToggleGroup({ options, value, onChange }) {
  return (
    <div className="toggle-group">
      {options.map(opt => (
        <button
          key={opt.value}
          className={"toggle-opt" + (value === opt.value ? " active" : "")}
          onClick={() => onChange(opt.value)}
          type="button"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Dialog Close Button ────────────────────────────────────────────────────────
// Shared ✕ button used at the top-right of every dialog.
function DialogCloseBtn({ onClose }) {
  return (
    <button
      onClick={onClose}
      style={{ background:"none", border:"none", cursor:"pointer", color:"var(--muted)",
               padding:4, lineHeight:1, fontSize:18, fontWeight:700 }}
      title="Close"
    >✕</button>
  );
}

// ── Dialog Title Row ──────────────────────────────────────────────────────────
// Renders the standard dialog header: icon + title text on the left, ✕ on the right.
function DialogTitle({ icon, size = 20, children, onClose }) {
  return (
    <div className="dialog-title" style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <span style={{ display:"flex", alignItems:"center", gap:8 }}>
        {icon && <Icon name={icon} size={size}/>}
        {children}
      </span>
      <DialogCloseBtn onClose={onClose}/>
    </div>
  );
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, confirmLabel = "Delete", danger = true, onConfirm, onClose }) {
  return (
    <div className="overlay" style={{ zIndex: 200 }}>
      <div className="dialog" style={{ maxWidth: 380 }}>
        <div className="dialog-title" style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Icon name="alert" size={20} color={danger ? "var(--red)" : "var(--accent)"} />
            {title}
          </span>
          <DialogCloseBtn onClose={onClose}/>
        </div>
        <p style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.6 }}>{message}</p>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={() => { onConfirm(); onClose(); }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function useConfirm() {
  const [cfg, setCfg] = useState(null);
  const confirm = useCallback((title, message, opts = {}) => {
    return new Promise(resolve => {
      setCfg({ title, message, ...opts, onConfirm: () => resolve(true), onClose: () => { setCfg(null); resolve(false); } });
    });
  }, []);
  const Confirmer = cfg ? <ConfirmDialog {...cfg} /> : null;
  return { confirm, Confirmer };
}

// ── Version Dialog ─────────────────────────────────────────────────────────────
function VersionDialog({ current, onSave, onClose }) {
  const [f, setF] = useState({ major: current.major, minor: current.minor, tiny: current.tiny, notes: current.notes || "" });
  const [e, setE] = useState({});

  function validate_() {
    const err = {};
    ["major", "minor", "tiny"].forEach(k => {
      err[k] = validate(f[k], [rules.required, rules.numeric, rules.range(0, 999)]);
    });
    err.notes = validate(f.notes, [rules.maxLen(200)]);
    setE(err);
    return Object.values(err).every(v => !v);
  }

  async function save() {
    if (!validate_()) return;
    await onSave({ major: +f.major, minor: +f.minor, tiny: +f.tiny, notes: f.notes });
    onClose();
  }

  return (
    <div className="overlay">
      <div className="dialog">
        <DialogTitle icon="tag" onClose={onClose}>Set Version</DialogTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
          {["major", "minor", "tiny"].map(k => (
            <FF key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} error={e[k]}>
              <input type="number" min="0" max="999" className={e[k] ? "err" : ""}
                value={f[k]} onChange={ev => setF(p => ({ ...p, [k]: ev.target.value }))} />
            </FF>
          ))}
        </div>
        <FF label="Release Notes" error={e.notes}>
          <textarea rows={3} value={f.notes} onChange={ev => setF(p => ({ ...p, notes: ev.target.value }))} placeholder="What changed…" maxLength={200} />
        </FF>
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}><Icon name="save" size={14} />Save Version</button>
        </div>
      </div>
    </div>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────────
function Spinner() { return <span className="spinner" />; }

// ── Loading Skeleton ───────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div style={{ padding: 56, textAlign: "center" }}>
      <Spinner />
      <div style={{ color: "var(--muted)", marginTop: 12, fontSize: 13 }}>Loading…</div>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────
function EmptyState({ icon = "clipboard", title, message, action }) {
  return (
    <div className="empty-state">
      <Icon name={icon} size={48} />
      <h3>{title}</h3>
      <p>{message}</p>
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}

// ── Shared utility ─────────────────────────────────────────────────────────────
// Returns initials from a full name string (e.g. "John Doe" → "JD").
function initials(name = "") {
  return name.trim().split(/\s+/).map(w => w[0] || "").join("").toUpperCase().slice(0, 2) || "?";
}
