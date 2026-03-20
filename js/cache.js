// cache.js v3 — Smart TTL cache + background preload

const _store = new Map();

const Cache = {
  set(key, data, ttlMs = 60000) {
    _store.set(key, { data, exp: Date.now() + ttlMs });
  },
  get(key) {
    const e = _store.get(key);
    if (!e) return null;
    if (Date.now() > e.exp) { _store.delete(key); return null; }
    return e.data;
  },
  invalidate(...keys) { keys.forEach(k => _store.delete(k)); },
  invalidateAll()     { _store.clear(); },

  // Preload common dropdowns in background (non-blocking)
  async preload() {
    try {
      const [pRes, dRes] = await Promise.all([
        sb.from('patients').select('id, name').order('name').limit(500),
        sb.from('doctors').select('id, name').order('name').limit(100),
      ]);
      if (pRes.data) Cache.set('dropdown_patients', pRes.data, 5 * 60000);
      if (dRes.data) Cache.set('dropdown_doctors',  dRes.data, 5 * 60000);
    } catch(e) { /* silent */ }
  }
};
