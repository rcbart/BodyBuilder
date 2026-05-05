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
  noScript:    (v) => {
    if (!v) return null;
    if (/<script/i.test(v))                                        return "Invalid characters";
    if (/javascript\s*:/i.test(v))                                 return "Invalid characters";
    if (/on\w+\s*=/i.test(v))                                      return "Invalid characters";
    if (/<\s*(iframe|object|embed|svg|link|meta|base)\b/i.test(v)) return "Invalid characters";
    return null;
  },
  safeUrl:     (v) => {
    if (!v) return null;
    // Allow http/https URLs or local exercise-image paths served by the app
    const isHttp  = /^https?:\/\//i.test(v);
    const isLocal = v.startsWith("/exercise-images/");
    if (!isHttp && !isLocal) return "URL must start with http:// or https://";
    if (v.length > 500)      return "URL too long";
    return null;
  },
};

function validate(value, validators) {
  for (const fn of validators) {
    const e = fn(value);
    if (e) return e;
  }
  return null;
}
