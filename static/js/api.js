// @ts-check
const API_BASE = /** @type {any} */ (window).CI_API_BASE || '/api';

export const session = {
  token: localStorage.getItem('ci_token') || '',
  player: JSON.parse(localStorage.getItem('ci_player') || 'null'),
  save() {
    if (this.token) localStorage.setItem('ci_token', this.token); else localStorage.removeItem('ci_token');
    if (this.player) localStorage.setItem('ci_player', JSON.stringify(this.player)); else localStorage.removeItem('ci_player');
  },
  clear() { this.token = ''; this.player = null; this.save(); },
};

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (session.token) headers.set('Authorization', `Bearer ${session.token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text || 'Invalid server response' }; }
  if (!response.ok) throw new Error(data.error || data.message || `Request failed (${response.status})`);
  return data;
}
