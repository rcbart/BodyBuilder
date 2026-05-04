// ─── API Helpers ─────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:8000/api";

async function apiFetch(method, path, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(API_BASE + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || JSON.stringify(err));
  }
  return res.json();
}

const apiGet  = (path)        => apiFetch("GET",    path);
const apiPut  = (path, body)  => apiFetch("PUT",    path, body);
const apiPost = (path, body)  => apiFetch("POST",   path, body);
const apiDel  = (path)        => apiFetch("DELETE", path);
