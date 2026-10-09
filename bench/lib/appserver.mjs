// Minimal client for `codex app-server` (JSON-RPC over stdio, one JSON object per line).
// Used by the bench to drive Codex's native Plan mode, which `codex exec` cannot select
// (exec sends `collaboration_mode: None`). Protocol: `codex app-server generate-json-schema`.

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { EventEmitter } from 'node:events';

export class AppServer extends EventEmitter {
  constructor({ codex = 'codex', args = [], cwd, env = process.env, log = null } = {}) {
    super();
    this.proc = spawn(codex, ['app-server', ...args], { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
    this.log = log; // function(direction, message)
    this.stderr = '';
    this.proc.stderr.on('data', (d) => { this.stderr += d.toString(); if (this.stderr.length > 200000) this.stderr = this.stderr.slice(-100000); });
    this.proc.on('exit', (code) => {
      for (const { reject } of this.pending.values()) reject(new Error(`app-server exited (${code}): ${this.stderr.slice(-2000)}`));
      this.pending.clear();
      this.emit('exit', code);
    });
    createInterface({ input: this.proc.stdout }).on('line', (line) => this.#onLine(line));
  }

  #send(msg) {
    this.log?.('out', msg);
    this.proc.stdin.write(JSON.stringify(msg) + '\n');
  }

  async #onLine(line) {
    if (!line.trim()) return;
    let msg;
    try { msg = JSON.parse(line); } catch { return; }
    this.log?.('in', msg);
    if (msg.id !== undefined && msg.method === undefined) {
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      if (msg.error) p.reject(Object.assign(new Error(msg.error.message || 'rpc error'), { rpc: msg.error }));
      else p.resolve(msg.result);
      return;
    }
    if (msg.id !== undefined && msg.method) {
      const h = this.handlers.get(msg.method);
      try {
        const result = h ? await h(msg.params) : null;
        if (h) this.#send({ id: msg.id, result });
        else this.#send({ id: msg.id, error: { code: -32601, message: `client does not handle ${msg.method}` } });
      } catch (err) {
        this.#send({ id: msg.id, error: { code: -32000, message: String(err?.message || err) } });
      }
      return;
    }
    if (msg.method) this.emit('notification', msg.method, msg.params);
  }

  request(method, params, timeoutMs = 120000) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { this.pending.delete(id); reject(new Error(`timeout: ${method}`)); }, timeoutMs);
      this.pending.set(id, { resolve: (v) => { clearTimeout(t); resolve(v); }, reject: (e) => { clearTimeout(t); reject(e); } });
      this.#send({ id, method, params });
    });
  }

  notify(method, params) { this.#send({ method, params }); }

  onRequest(method, fn) { this.handlers.set(method, fn); }

  async initialize() {
    const r = await this.request('initialize', { clientInfo: { name: 'codex-plan-ledger-bench', version: '0.1.0' }, capabilities: { experimentalApi: true } });
    this.notify('initialized', {});
    return r;
  }

  /** Start a turn and resolve with the TurnCompleted payload plus collected items. */
  runTurn(params, timeoutMs = 15 * 60 * 1000) {
    const startedAt = Date.now();
    return new Promise((resolve, reject) => {
      const items = [];
      let turnId = null;
      let usage = null;
      const hooks = [];
      const onN = (method, p) => {
        if (p?.threadId && p.threadId !== params.threadId) return;
        if (method === 'turn/started') turnId = p.turn?.id || turnId;
        if (method === 'item/completed' && (!turnId || p.turnId === turnId)) items.push(p.item);
        if (method === 'thread/tokenUsage/updated') { usage = p.tokenUsage; this.lastUsage = p.tokenUsage; }
        if (method === 'hook/completed') hooks.push(p.run);
        if (method === 'turn/completed' && (!turnId || p.turn?.id === turnId)) {
          clearTimeout(t);
          this.off('notification', onN);
          resolve({ turn: p.turn, items, usage, hooks, startedAt });
        }
      };
      const t = setTimeout(() => { this.off('notification', onN); reject(new Error('turn timeout')); }, timeoutMs);
      this.on('notification', onN);
      this.request('turn/start', params).then((r) => { turnId = r?.turn?.id || turnId; }, (e) => { clearTimeout(t); this.off('notification', onN); reject(e); });
    });
  }

  close() {
    try { this.proc.stdin.end(); } catch {}
    setTimeout(() => { try { this.proc.kill(); } catch {} }, 2000).unref();
  }
}
