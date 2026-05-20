// ─── API Helpers ─────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:8000/api";

async function apiFetch(method, path, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  console.debug(`[API] ${method} ${path}`, body !== undefined ? body : "");
  let res;
  try {
    res = await fetch(API_BASE + path, opts);
  } catch (networkErr) {
    console.error(`[API] Network error on ${method} ${path}:`, networkErr);
    throw new Error("Network error — is the BodyBuilder server running? " + networkErr.message);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    const msg = err.detail || JSON.stringify(err);
    console.error(`[API] ${method} ${path} → HTTP ${res.status}:`, msg);
    throw new Error(msg);
  }
  console.debug(`[API] ${method} ${path} → OK`);
  return res.json();
}

const apiGet   = (path)        => apiFetch("GET",    path);
const apiPut   = (path, body)  => apiFetch("PUT",    path, body);
const apiPost  = (path, body)  => apiFetch("POST",   path, body);
const apiDel   = (path)        => apiFetch("DELETE", path);
const apiPatch = (path, body)  => apiFetch("PATCH",  path, body);
