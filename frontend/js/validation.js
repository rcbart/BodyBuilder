// ─── Validation Rules ─────────────────────────────────────────────────────────
const rules = {
  required:    (v) => (!v && v !== 0) || v === "" ? "Required" : null,
  numeric:     (v) => v !== "" && v !== null && v !== undefined && isNaN(Number(v)) ? "Must be a number" : null,
  positiveNum: (v) => { if (v === "" || v == null) return null; return Number(v) < 0 ? "Must be ≥ 0" : null; },
  range:       (min, max) => (v) => {
    if (v === "" || v == null) return null;
    const n = Number(v);
    return (n < min || n > max) ? `Must be ${min}–${max}` : null;
  },
  maxLen:      (n) => (v) => v && v.length > n ? `Max ${n} characters` : null,
  email:       (v) => { if (!v) return null; return v.includes("@") && v.includes(".") ? null : "Invalid email"; },
  noScript:    (v) => { if (!v) return null; return /<script/i.test(v) ? "Invalid characters" : null; },
};

function validate(value, validators) {
  for (const fn of validators) {
    const e = fn(value);
    if (e) return e;
  }
  return null;
}
