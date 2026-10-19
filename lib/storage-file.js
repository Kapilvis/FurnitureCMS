'use strict';
/* File-system storage for server.js: data/catalog.json, data/users.json, data/backups/, data/audit.log and the uploads folder. */
const fsp = require('fs').promises;
const path = require('path');

function createFileStorage({ dataDir, uploadDir, maxBackups = 40 }) {
  const catalogFile = path.join(dataDir, 'catalog.json');
  const usersFile = path.join(dataDir, 'users.json');
  const backupDir = path.join(dataDir, 'backups');
  const auditFile = path.join(dataDir, 'audit.log');
  const fails = new Map();

  async function atomicWrite(file, text) {
    const tmp = file + '.' + process.pid + '.tmp';
    await fsp.writeFile(tmp, text);
    await fsp.rename(tmp, file);
  }
  async function backup() {
    try {
      await fsp.mkdir(backupDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      await fsp.copyFile(catalogFile, path.join(backupDir, 'catalog-' + stamp + '.json'));
      const files = (await fsp.readdir(backupDir)).filter(f => f.startsWith('catalog-')).sort();
      for (const f of files.slice(0, Math.max(0, files.length - maxBackups))) await fsp.unlink(path.join(backupDir, f));
    } catch (e) { console.error('backup failed:', e.message); }
  }

  return {
    async getCatalog() { return JSON.parse(await fsp.readFile(catalogFile, 'utf8')); },
    async saveCatalog(obj) { await backup(); await atomicWrite(catalogFile, JSON.stringify(obj, null, 2) + '\n'); },
    async saveUpload(name, buf) { await fsp.mkdir(uploadDir, { recursive: true }); await fsp.writeFile(path.join(uploadDir, name), buf); },
    async getUpload(name) { try { return await fsp.readFile(path.join(uploadDir, name)); } catch (e) { return null; } },
    async deleteUpload(name) { await fsp.unlink(path.join(uploadDir, name)); },
    async getAuth() {
      try { const u = JSON.parse(await fsp.readFile(usersFile, 'utf8')); return (u.users && u.users[0]) || null; } catch (e) { return null; }
    },
    async saveAuth(user) { await atomicWrite(usersFile, JSON.stringify({ users: [user] }, null, 2) + '\n'); },
    async getFail(key) { return fails.get(key) || null; },
    async setFail(key, val) { fails.set(key, val); },
    async delFail(key) { fails.delete(key); },
    async audit(entry) { await fsp.appendFile(auditFile, JSON.stringify(entry) + '\n'); }
  };
}

module.exports = { createFileStorage };
