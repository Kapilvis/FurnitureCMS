'use strict';
/* Netlify Blobs storage for the Netlify function.
   Stores: catalog (key "catalog"), uploads (image bytes), auth (key "user"), fails, audit, backups.
   The catalogue is seeded from the bundled data/catalog.json the first time it is read. */

function createBlobStorage({ getStore, seed, maxBackups = 40 }) {
  const store = name => getStore({ name, consistency: 'strong' });
  const rand = () => Math.random().toString(16).slice(2, 8);

  return {
    async getCatalog() {
      const s = store('catalog');
      const found = await s.get('catalog', { type: 'json' });
      if (found) return found;
      await s.setJSON('catalog', seed);
      return JSON.parse(JSON.stringify(seed));
    },
    async saveCatalog(obj) {
      const s = store('catalog');
      const prev = await s.get('catalog', { type: 'text' });
      if (prev) {
        const b = store('backups');
        await b.set('catalog-' + new Date().toISOString().replace(/[:.]/g, '-'), prev);
        const { blobs } = await b.list();
        const keys = blobs.map(x => x.key).sort();
        for (const k of keys.slice(0, Math.max(0, keys.length - maxBackups))) await b.delete(k);
      }
      await s.setJSON('catalog', obj);
    },
    async saveUpload(name, buf, type) { await store('uploads').set(name, new Uint8Array(buf), { metadata: { contentType: type } }); },
    async getUpload(name) {
      const data = await store('uploads').get(name, { type: 'arrayBuffer' });
      return data ? Buffer.from(data) : null;
    },
    async deleteUpload(name) { await store('uploads').delete(name); },
    async getAuth() { return store('auth').get('user', { type: 'json' }); },
    async saveAuth(user) { await store('auth').setJSON('user', user); },
    async getFail(key) { return store('fails').get(key, { type: 'json' }); },
    async setFail(key, val) { await store('fails').setJSON(key, val); },
    async delFail(key) { await store('fails').delete(key); },
    async audit(entry) { await store('audit').setJSON(entry.at.replace(/[:.]/g, '-') + '-' + rand(), entry); }
  };
}

module.exports = { createBlobStorage };
