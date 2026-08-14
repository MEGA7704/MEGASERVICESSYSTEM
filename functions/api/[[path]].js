import { INITIAL_SCHEMA_SQL, REQUIRED_TABLES, SCHEMA_VERSION } from './schema.js';

const SESSION_COOKIE = 'msws_session';
const DEFAULT_SESSION_TTL = 60 * 60 * 8;
const PBKDF2_ITERATIONS = 120000;

const FULL_ROLES = new Set(['super_admin', 'admin', 'director']);
const MANAGER_ROLES = new Set(['super_admin', 'admin', 'director', 'manager']);
const FINANCE_ROLES = new Set(['super_admin', 'admin', 'director', 'manager', 'cashier', 'accountant']);
const STOCK_ROLES = new Set(['super_admin', 'admin', 'director', 'manager', 'stock_manager', 'sales_agent']);
const WORK_ROLES = new Set(['super_admin', 'admin', 'director', 'manager', 'office_agent', 'employee', 'cashier', 'sales_agent']);

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');

  try {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) enforceSameOrigin(request);

    if (path === 'health' && request.method === 'GET') return health(env);
    if (path === 'bootstrap/status' && request.method === 'GET') return bootstrapStatus(env);
    if (path === 'bootstrap' && request.method === 'POST') return bootstrap(request, env);
    if (path === 'auth/login' && request.method === 'POST') return login(request, env);
    if (path === 'auth/logout' && request.method === 'POST') return logout(request, env);

    const auth = await requireAuth(request, env);
    if (path === 'auth/me' && request.method === 'GET') return json({ ok: true, user: auth.user });

    if (path === 'dashboard' && request.method === 'GET') return dashboard(env, auth);
    if (path === 'search' && request.method === 'GET') return universalSearch(env, url.searchParams.get('q') || '');

    if (path === 'clients' && request.method === 'GET') return listClients(env, url.searchParams);
    if (path === 'clients' && request.method === 'POST') return createClient(request, env, auth);
    if (/^clients\/[^/]+$/.test(path) && request.method === 'GET') return getClient(env, path.split('/')[1]);
    if (/^clients\/[^/]+$/.test(path) && request.method === 'PUT') return updateClient(request, env, auth, path.split('/')[1]);

    if (path === 'services' && request.method === 'GET') return listServices(env);
    if (path === 'services' && request.method === 'POST') return createService(request, env, auth);
    if (/^services\/[^/]+$/.test(path) && request.method === 'PUT') return updateService(request, env, auth, path.split('/')[1]);

    if (path === 'jobs' && request.method === 'GET') return listJobs(env, url.searchParams);
    if (path === 'jobs' && request.method === 'POST') return createJob(request, env, auth);
    if (/^jobs\/[^/]+$/.test(path) && request.method === 'PUT') return updateJob(request, env, auth, path.split('/')[1]);
    if (/^jobs\/[^/]+\/payment$/.test(path) && request.method === 'POST') return payJob(request, env, auth, path.split('/')[1]);

    if (path === 'cash/accounts' && request.method === 'GET') return listCashAccounts(env);
    if (path === 'cash/transactions' && request.method === 'GET') return listCashTransactions(env, url.searchParams);
    if (path === 'cash/transactions' && request.method === 'POST') return createCashTransaction(request, env, auth);
    if (path === 'cash/closure' && request.method === 'POST') return closeCash(request, env, auth);

    if (path === 'mobile-money' && request.method === 'GET') return listMobileMoney(env, url.searchParams);
    if (path === 'mobile-money' && request.method === 'POST') return createMobileMoney(request, env, auth);

    if (path === 'products' && request.method === 'GET') return listProducts(env, url.searchParams);
    if (path === 'products' && request.method === 'POST') return createProduct(request, env, auth);
    if (/^products\/[^/]+$/.test(path) && request.method === 'PUT') return updateProduct(request, env, auth, path.split('/')[1]);
    if (/^products\/[^/]+\/stock$/.test(path) && request.method === 'POST') return adjustStock(request, env, auth, path.split('/')[1]);

    if (path === 'sales' && request.method === 'GET') return listSales(env, url.searchParams);
    if (path === 'sales' && request.method === 'POST') return createSale(request, env, auth);
    if (/^sales\/[^/]+$/.test(path) && request.method === 'GET') return getSale(env, path.split('/')[1]);

    if (path === 'credits' && request.method === 'GET') return listCredits(env, url.searchParams);
    if (path === 'credits' && request.method === 'POST') return createCredit(request, env, auth);
    if (/^credits\/[^/]+\/repay$/.test(path) && request.method === 'POST') return repayCredit(request, env, auth, path.split('/')[1]);

    if (path === 'expenses' && request.method === 'GET') return listExpenses(env, url.searchParams);
    if (path === 'expenses' && request.method === 'POST') return createExpense(request, env, auth);

    if (path === 'documents' && request.method === 'GET') return listDocuments(env, url.searchParams);
    if (path === 'documents' && request.method === 'POST') return createDocument(request, env, auth);
    if (/^documents\/[^/]+$/.test(path) && request.method === 'GET') return getDocument(env, path.split('/')[1]);
    if (/^documents\/[^/]+$/.test(path) && request.method === 'PUT') return updateDocument(request, env, auth, path.split('/')[1]);

    if (path === 'employees' && request.method === 'GET') return listEmployees(env);
    if (path === 'employees' && request.method === 'POST') return createEmployee(request, env, auth);
    if (path === 'users' && request.method === 'GET') return listUsers(env, auth);
    if (path === 'users' && request.method === 'POST') return createUser(request, env, auth);

    if (path === 'suppliers' && request.method === 'GET') return listSuppliers(env);
    if (path === 'suppliers' && request.method === 'POST') return createSupplier(request, env, auth);

    if (path === 'reports/summary' && request.method === 'GET') return reportSummary(env, url.searchParams);
    if (path === 'audit' && request.method === 'GET') return listAudit(env, auth, url.searchParams);

    if (path === 'settings' && request.method === 'GET') return getSettings(env);
    if (path === 'settings' && request.method === 'PUT') return updateSettings(request, env, auth);

    return json({ ok: false, error: 'Route API introuvable.' }, 404);
  } catch (error) {
    console.error('API_ERROR', error?.stack || error);
    const status = Number(error?.status || 500);
    const code = error?.code || (status >= 500 ? 'SERVER_ERROR' : 'REQUEST_ERROR');
    const safeKnownServerError = status >= 500 && error?.code && error?.message;
    return json({
      ok: false,
      error: safeKnownServerError ? error.message : (status >= 500 ? "Une erreur serveur est survenue. Vos données n'ont pas été volontairement supprimées." : (error?.message || 'Requête invalide.')),
      code
    }, status);
  }
}

function enforceSameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return;
  const req = new URL(request.url);
  const src = new URL(origin);
  if (src.host !== req.host) throw httpError(403, 'Origine de requête refusée.', 'CSRF_BLOCKED');
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
  });
}

function httpError(status, message, code) {
  const e = new Error(message); e.status = status; e.code = code; return e;
}

async function bodyJson(request) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > 1_000_000) throw httpError(413, 'Données trop volumineuses.');
  try { return await request.json(); } catch { throw httpError(400, 'Corps JSON invalide.'); }
}

function clean(value, max = 500) {
  if (value === null || value === undefined) return null;
  return String(value).trim().slice(0, max);
}
function int(value, def = 0) { const n = Number(value); return Number.isFinite(n) ? Math.round(n) : def; }
function num(value, def = 0) { const n = Number(value); return Number.isFinite(n) ? n : def; }
function uuid() { return crypto.randomUUID(); }
function nowIso() { return new Date().toISOString(); }
function dateKey() { return new Date().toISOString().slice(0, 10).replaceAll('-', ''); }
function ref(prefix) { return `${prefix}-${dateKey()}-${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`; }
function clientRef() { return `MS-CL-${new Date().getUTCFullYear()}-${crypto.randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase()}`; }
function employeeRef() { return `MS-EMP-${crypto.randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase()}`; }
function pageParams(sp) {
  const page = Math.max(1, int(sp.get('page'), 1));
  const size = Math.min(100, Math.max(5, int(sp.get('size'), 20)));
  return { page, size, offset: (page - 1) * size };
}
function b64(bytes) { return btoa(String.fromCharCode(...bytes)); }
function fromB64(s) { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }
function randomBytes(n = 32) { const a = new Uint8Array(n); crypto.getRandomValues(a); return a; }
function hex(bytes) { return [...bytes].map(b => b.toString(16).padStart(2, '0')).join(''); }
async function sha256Hex(value) { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value))))); }

async function derivePassword(password, saltBytes) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: PBKDF2_ITERATIONS }, key, 256);
  return b64(new Uint8Array(bits));
}
function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 10) throw httpError(400, 'Le mot de passe doit contenir au moins 10 caractères.');
}
async function passwordRecord(password) {
  validatePassword(password);
  const salt = randomBytes(16);
  return { salt: b64(salt), hash: await derivePassword(password, salt) };
}
async function verifyPassword(password, salt, expected) {
  const actual = await derivePassword(password, fromB64(salt));
  if (actual.length !== expected.length) return false;
  let diff = 0; for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function parseCookie(request, name) {
  const cookie = request.headers.get('cookie') || '';
  for (const part of cookie.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}
function sessionCookie(request, token, ttl) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ttl}${secure}`;
}
function clearSessionCookie(request) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}
async function createSession(request, env, user) {
  const token = hex(randomBytes(32));
  const tokenHash = await sha256Hex(token);
  const ttl = Math.max(1800, int(env.SESSION_TTL, DEFAULT_SESSION_TTL));
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
  await env.SYSTEME_DB.prepare(`INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)`).bind(tokenHash, user.id, expiresAt, nowIso()).run();
  if (env.SYSTEME_KV?.put) {
    try { await env.SYSTEME_KV.put(`session:${tokenHash}`, JSON.stringify({ user_id: user.id, role: user.role, expires_at: expiresAt }), { expirationTtl: ttl }); }
    catch (e) { console.warn('KV_SESSION_CACHE_WRITE_FAILED', e?.message || e); }
  }
  return { token, tokenHash, ttl };
}
async function requireAuth(request, env) {
  const token = parseCookie(request, SESSION_COOKIE);
  if (!token) throw httpError(401, 'Connexion requise.', 'AUTH_REQUIRED');
  const tokenHash = await sha256Hex(token);
  let session = null;
  if (env.SYSTEME_KV?.get) {
    try { session = await env.SYSTEME_KV.get(`session:${tokenHash}`, { type: 'json' }); }
    catch (e) { console.warn('KV_SESSION_CACHE_READ_FAILED', e?.message || e); }
  }
  if (!session?.user_id) {
    session = await env.SYSTEME_DB.prepare(`SELECT user_id,expires_at FROM sessions WHERE token_hash=? AND expires_at>?`).bind(tokenHash, nowIso()).first();
    if (session?.user_id && env.SYSTEME_KV?.put) {
      const seconds = Math.max(60, Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000));
      try { await env.SYSTEME_KV.put(`session:${tokenHash}`, JSON.stringify(session), { expirationTtl: seconds }); } catch {}
    }
  }
  if (!session?.user_id) throw httpError(401, 'Session expirée.', 'SESSION_EXPIRED');
  const user = await env.SYSTEME_DB.prepare(`SELECT id,name,email,phone,role,active,employee_id,last_login_at FROM users WHERE id=?`).bind(session.user_id).first();
  if (!user || !user.active) throw httpError(401, 'Compte inactif ou session invalide.');
  return { user, token, tokenHash };
}
function requireRole(auth, roles) {
  if (!roles.has(auth.user.role)) throw httpError(403, 'Vous ne disposez pas des droits nécessaires.', 'FORBIDDEN');
}

async function audit(env, auth, request, action, entityType, entityId, oldData = null, newData = null) {
  try {
    await env.SYSTEME_DB.prepare(`INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,old_data,new_data,ip_address,user_agent) VALUES(?,?,?,?,?,?,?,?,?)`)
      .bind(uuid(), auth?.user?.id || null, action, entityType || null, entityId || null,
        oldData ? JSON.stringify(oldData).slice(0, 10000) : null,
        newData ? JSON.stringify(newData).slice(0, 10000) : null,
        request?.headers.get('CF-Connecting-IP') || null,
        request?.headers.get('User-Agent')?.slice(0, 500) || null).run();
  } catch (e) { console.warn('AUDIT_FAILED', e?.message || e); }
}

function assertCloudflareBindings(env) {
  if (!env.SYSTEME_DB || typeof env.SYSTEME_DB.prepare !== 'function') {
    throw httpError(503, 'Binding D1 SYSTEME_DB absent. Ajoutez la base systeme-d1 au projet Cloudflare Pages.', 'D1_BINDING_MISSING');
  }
}

function splitSqlStatements(sql) {
  const out = [];
  let current = '';
  let quote = null;
  let lineComment = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i], next = sql[i + 1];
    if (lineComment) {
      if (ch === '\n') { lineComment = false; current += ch; }
      continue;
    }
    if (!quote && ch === '-' && next === '-') { lineComment = true; i++; continue; }
    if (quote) {
      current += ch;
      if (ch === quote) {
        if (sql[i + 1] === quote) { current += sql[++i]; }
        else quote = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"') { quote = ch; current += ch; continue; }
    if (ch === ';') {
      const stmt = current.trim();
      if (stmt) out.push(stmt);
      current = '';
      continue;
    }
    current += ch;
  }
  const tail = current.trim();
  if (tail) out.push(tail);
  return out;
}


async function databaseSchemaState(env) {
  if (!env.SYSTEME_DB || typeof env.SYSTEME_DB.prepare !== 'function') {
    return { ready: false, missing: [...REQUIRED_TABLES], binding_missing: true };
  }
  const placeholders = REQUIRED_TABLES.map(() => '?').join(',');
  const rows = await env.SYSTEME_DB.prepare(`SELECT name FROM sqlite_schema WHERE type='table' AND name IN (${placeholders})`)
    .bind(...REQUIRED_TABLES).all();
  const present = new Set((rows.results || []).map(r => r.name));
  const missing = REQUIRED_TABLES.filter(name => !present.has(name));
  return { ready: missing.length === 0, missing, binding_missing: false };
}
async function installInitialSchema(env) {
  assertCloudflareBindings(env);
  const statements = splitSqlStatements(INITIAL_SCHEMA_SQL);
  const chunkSize = 12;
  for (let i = 0; i < statements.length; i += chunkSize) {
    const chunk = statements.slice(i, i + chunkSize);
    try {
      await env.SYSTEME_DB.batch(chunk.map(sql => env.SYSTEME_DB.prepare(sql)));
    } catch (e) {
      console.error('D1_SCHEMA_CHUNK_FAILED', { start: i + 1, end: i + chunk.length, message: e?.message || String(e) });
      throw httpError(500, `Initialisation D1 interrompue au bloc SQL ${Math.floor(i / chunkSize) + 1}. Rechargez la page puis réessayez.`, 'D1_SCHEMA_INIT_FAILED');
    }
  }
  const state = await databaseSchemaState(env);
  if (!state.ready) throw httpError(500, `Initialisation D1 incomplète. Tables manquantes : ${state.missing.join(', ')}`, 'D1_SCHEMA_INIT_FAILED');
  return state;
}
async function health(env) {
  const d1Bound = !!env.SYSTEME_DB && typeof env.SYSTEME_DB.prepare === 'function';
  const kvBound = !!env.SYSTEME_KV && typeof env.SYSTEME_KV.get === 'function';
  let db = null, schema = { ready: false, missing: [...REQUIRED_TABLES] };
  if (d1Bound) {
    db = await env.SYSTEME_DB.prepare(`SELECT 1 ok`).first();
    schema = await databaseSchemaState(env);
  }
  return json({ ok: true, app: 'MEGA SERVICES WORK SYSTEM', database: d1Bound && db?.ok === 1 ? 'connected' : 'missing', database_initialized: schema.ready, schema_version: schema.ready ? SCHEMA_VERSION : 0, missing_tables: schema.missing, kv: kvBound, bootstrap_secret_configured: !!env.BOOTSTRAP_TOKEN, time: nowIso() });
}
async function bootstrapStatus(env) {
  const d1Bound = !!env.SYSTEME_DB && typeof env.SYSTEME_DB.prepare === 'function';
  const kvBound = !!env.SYSTEME_KV && typeof env.SYSTEME_KV.get === 'function' && typeof env.SYSTEME_KV.put === 'function';
  if (!d1Bound) return json({ ok: true, initialized: false, database_initialized: false, schema_version: 0, missing_tables: [...REQUIRED_TABLES], d1_bound: false, kv_bound: kvBound, repair_needed: false, bootstrap_secret_configured: !!env.BOOTSTRAP_TOKEN });
  const schema = await databaseSchemaState(env);
  let initialized = false;
  const usersTable = await env.SYSTEME_DB.prepare(`SELECT 1 ok FROM sqlite_schema WHERE type='table' AND name='users' LIMIT 1`).first();
  if (usersTable?.ok === 1) {
    const row = await env.SYSTEME_DB.prepare(`SELECT COUNT(*) count FROM users`).first();
    initialized = Number(row?.count || 0) > 0;
  }
  if (!schema.ready) return json({ ok: true, initialized, database_initialized: false, schema_version: 0, missing_tables: schema.missing, d1_bound: true, kv_bound: kvBound, repair_needed: initialized, bootstrap_secret_configured: !!env.BOOTSTRAP_TOKEN });
  return json({ ok: true, initialized, database_initialized: true, schema_version: SCHEMA_VERSION, missing_tables: [], d1_bound: true, kv_bound: kvBound, repair_needed: false, bootstrap_secret_configured: !!env.BOOTSTRAP_TOKEN });
}
async function bootstrap(request, env) {
  assertCloudflareBindings(env);
  if (!env.BOOTSTRAP_TOKEN) throw httpError(503, 'Configurez d’abord le secret Cloudflare BOOTSTRAP_TOKEN.', 'BOOTSTRAP_SECRET_MISSING');
  const b = await bodyJson(request);
  if (!b.bootstrap_token || b.bootstrap_token !== env.BOOTSTRAP_TOKEN) throw httpError(403, 'Code d’initialisation incorrect.', 'BOOTSTRAP_TOKEN_INVALID');
  const email = clean(b.email, 254)?.toLowerCase();
  const name = clean(b.name, 150);
  if (!email || !name) throw httpError(400, 'Nom et email obligatoires.');
  validatePassword(b.password); // validation avant toute écriture D1
  let schema = await databaseSchemaState(env);
  if (!schema.ready) schema = await installInitialSchema(env);
  const count = await env.SYSTEME_DB.prepare(`SELECT COUNT(*) count FROM users`).first();
  if (Number(count?.count || 0) > 0) throw httpError(409, 'Le système est déjà initialisé.', 'ALREADY_INITIALIZED');
  const pw = await passwordRecord(b.password);
  const employeeId = uuid(), userId = uuid();
  const names = name.split(/\s+/); const last = names.shift() || name; const first = names.join(' ') || 'Administrateur';
  try {
    await env.SYSTEME_DB.batch([
      env.SYSTEME_DB.prepare(`INSERT INTO employees(id,matricule,first_name,last_name,email,function_title,status) VALUES(?,?,?,?,?,'Super Administrateur','active')`).bind(employeeId, employeeRef(), first, last, email),
      env.SYSTEME_DB.prepare(`INSERT INTO users(id,employee_id,name,email,password_hash,password_salt,role,active) VALUES(?,?,?,?,?,?,'super_admin',1)`).bind(userId, employeeId, name, email, pw.hash, pw.salt)
    ]);
  } catch (e) {
    console.error('BOOTSTRAP_USER_CREATE_FAILED', e?.message || e);
    throw httpError(500, 'La base est prête mais la création du Super Administrateur a échoué. Vérifiez que cet email n’existe pas déjà puis réessayez.', 'BOOTSTRAP_USER_CREATE_FAILED');
  }
  const user = { id: userId, name, email, role: 'super_admin', employee_id: employeeId, active: 1 };
  let session;
  try { session = await createSession(request, env, user); }
  catch (e) {
    console.error('BOOTSTRAP_SESSION_FAILED', e?.message || e);
    throw httpError(500, 'Le Super Administrateur a été créé, mais la session n’a pas pu être ouverte. Rechargez la page et connectez-vous avec votre email et votre mot de passe.', 'BOOTSTRAP_SESSION_FAILED');
  }
  await audit(env, { user }, request, 'SYSTEM_BOOTSTRAP', 'user', userId, null, { email, role: 'super_admin' });
  return json({ ok: true, user }, 201, { 'set-cookie': sessionCookie(request, session.token, session.ttl) });
}
async function login(request, env) {
  assertCloudflareBindings(env);
  let schema = await databaseSchemaState(env);
  if (!schema.ready) schema = await installInitialSchema(env);
  const b = await bodyJson(request); const email = clean(b.email, 254)?.toLowerCase(); const password = b.password;
  if (!email || !password) throw httpError(400, 'Email et mot de passe obligatoires.');
  const user = await env.SYSTEME_DB.prepare(`SELECT * FROM users WHERE lower(email)=?`).bind(email).first();
  if (!user || !user.active) throw httpError(401, 'Identifiants incorrects.');
  if (user.locked_until && new Date(user.locked_until) > new Date()) throw httpError(429, 'Compte temporairement verrouillé. Réessayez plus tard.');
  const ok = await verifyPassword(password, user.password_salt, user.password_hash);
  if (!ok) {
    const failed = Number(user.failed_logins || 0) + 1;
    const locked = failed >= 6 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
    await env.SYSTEME_DB.prepare(`UPDATE users SET failed_logins=?, locked_until=? WHERE id=?`).bind(failed >= 6 ? 0 : failed, locked, user.id).run();
    throw httpError(401, 'Identifiants incorrects.');
  }
  await env.SYSTEME_DB.prepare(`UPDATE users SET failed_logins=0, locked_until=NULL, last_login_at=? WHERE id=?`).bind(nowIso(), user.id).run();
  const safe = { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, employee_id: user.employee_id, active: user.active };
  const s = await createSession(request, env, safe);
  await audit(env, { user: safe }, request, 'LOGIN', 'user', user.id);
  return json({ ok: true, user: safe }, 200, { 'set-cookie': sessionCookie(request, s.token, s.ttl) });
}
async function logout(request, env) {
  const token = parseCookie(request, SESSION_COOKIE);
  if (token) {
    const tokenHash = await sha256Hex(token);
    try { await env.SYSTEME_DB.prepare(`DELETE FROM sessions WHERE token_hash=?`).bind(tokenHash).run(); } catch {}
    if (env.SYSTEME_KV?.delete) { try { await env.SYSTEME_KV.delete(`session:${tokenHash}`); } catch {} }
  }
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie(request) });
}

async function dashboard(env) {
  const today = new Date().toISOString().slice(0, 10);
  const [clients, jobs, tx, expenses, sales, credits, jobStates, accounts, lowStock] = await Promise.all([
    env.SYSTEME_DB.prepare(`SELECT COUNT(*) count FROM clients WHERE date(created_at)=date(?)`).bind(today).first(),
    env.SYSTEME_DB.prepare(`SELECT COUNT(*) count, COALESCE(SUM(total),0) total FROM jobs WHERE date(created_at)=date(?)`).bind(today).first(),
    env.SYSTEME_DB.prepare(`SELECT COALESCE(SUM(CASE WHEN type IN ('income','transfer_in','correction','credit_repayment','sale','mobile_money') THEN amount ELSE 0 END),0) income, COALESCE(SUM(CASE WHEN type IN ('expense','transfer_out') THEN amount ELSE 0 END),0) outgoing FROM cash_transactions WHERE cancelled=0 AND date(created_at)=date(?)`).bind(today).first(),
    env.SYSTEME_DB.prepare(`SELECT COALESCE(SUM(amount),0) amount FROM expenses WHERE date(expense_date)=date(?)`).bind(today).first(),
    env.SYSTEME_DB.prepare(`SELECT COUNT(*) count, COALESCE(SUM(total),0) total FROM sales WHERE status='completed' AND date(created_at)=date(?)`).bind(today).first(),
    env.SYSTEME_DB.prepare(`SELECT COUNT(*) count, COALESCE(SUM(balance),0) balance FROM credits WHERE status IN ('active','late')`).first(),
    env.SYSTEME_DB.prepare(`SELECT status, COUNT(*) count FROM jobs GROUP BY status`).all(),
    accountBalances(env),
    env.SYSTEME_DB.prepare(`SELECT id,code,name,stock_quantity,min_stock FROM products WHERE active=1 AND stock_quantity<=min_stock ORDER BY stock_quantity ASC LIMIT 10`).all()
  ]);
  return json({ ok: true, today: { clients: clients?.count || 0, jobs: jobs?.count || 0, job_total: jobs?.total || 0, cash_income: tx?.income || 0, cash_outgoing: tx?.outgoing || 0, expenses: expenses?.amount || 0, sales_count: sales?.count || 0, sales_total: sales?.total || 0, estimated_result: int(tx?.income) - int(tx?.outgoing) }, credits: { active_count: credits?.count || 0, balance: credits?.balance || 0 }, job_states: jobStates.results || [], accounts, low_stock: lowStock.results || [] });
}

async function universalSearch(env, q) {
  q = clean(q, 100) || ''; if (q.length < 2) return json({ ok: true, results: [] });
  const like = `%${q}%`;
  const [clients, jobs, docs, products, credits] = await Promise.all([
    env.SYSTEME_DB.prepare(`SELECT id,reference,trim(COALESCE(first_name,'')||' '||last_name) title,phone subtitle,'client' type FROM clients WHERE reference LIKE ? OR last_name LIKE ? OR first_name LIKE ? OR phone LIKE ? LIMIT 8`).bind(like, like, like, like).all(),
    env.SYSTEME_DB.prepare(`SELECT id,reference,title, status subtitle,'job' type FROM jobs WHERE reference LIKE ? OR title LIKE ? LIMIT 8`).bind(like, like).all(),
    env.SYSTEME_DB.prepare(`SELECT id,reference,title,document_type subtitle,'document' type FROM documents WHERE reference LIKE ? OR title LIKE ? LIMIT 8`).bind(like, like).all(),
    env.SYSTEME_DB.prepare(`SELECT id,code reference,name title,CAST(stock_quantity AS TEXT) subtitle,'product' type FROM products WHERE code LIKE ? OR name LIKE ? LIMIT 8`).bind(like, like).all(),
    env.SYSTEME_DB.prepare(`SELECT c.id,c.reference,cl.last_name||' '||COALESCE(cl.first_name,'') title,CAST(c.balance AS TEXT)||' FCFA' subtitle,'credit' type FROM credits c JOIN clients cl ON cl.id=c.client_id WHERE c.reference LIKE ? OR cl.last_name LIKE ? LIMIT 8`).bind(like, like).all()
  ]);
  return json({ ok: true, results: [...clients.results, ...jobs.results, ...docs.results, ...products.results, ...credits.results] });
}

async function listClients(env, sp) {
  const { page, size, offset } = pageParams(sp); const q = clean(sp.get('q'), 100) || ''; const like = `%${q}%`;
  const where = q ? `WHERE reference LIKE ? OR last_name LIKE ? OR first_name LIKE ? OR phone LIKE ? OR whatsapp LIKE ?` : '';
  const binds = q ? [like, like, like, like, like] : [];
  const rows = await env.SYSTEME_DB.prepare(`SELECT * FROM clients ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...binds, size, offset).all();
  const count = await env.SYSTEME_DB.prepare(`SELECT COUNT(*) count FROM clients ${where}`).bind(...binds).first();
  return json({ ok: true, items: rows.results, page, size, total: count?.count || 0 });
}
async function createClient(request, env, auth) {
  requireRole(auth, WORK_ROLES); const b = await bodyJson(request);
  const last = clean(b.last_name, 120); if (!last) throw httpError(400, 'Le nom du client est obligatoire.');
  const phone = clean(b.phone, 30);
  if (phone) { const dupe = await env.SYSTEME_DB.prepare(`SELECT id,reference,last_name,first_name FROM clients WHERE phone=? OR whatsapp=? LIMIT 1`).bind(phone, phone).first(); if (dupe) throw httpError(409, `Un client utilisant ce numéro existe déjà (${dupe.reference}).`, 'DUPLICATE_CLIENT'); }
  const id = uuid(), reference = clientRef();
  await env.SYSTEME_DB.prepare(`INSERT INTO clients(id,reference,civility,first_name,last_name,sex,birth_date,profession,company,phone,phone2,whatsapp,email,city,commune,district,address,nationality,id_type,id_number,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, reference, clean(b.civility, 20), clean(b.first_name, 120), last, clean(b.sex, 20), clean(b.birth_date, 20), clean(b.profession, 120), clean(b.company, 160), phone, clean(b.phone2, 30), clean(b.whatsapp, 30), clean(b.email, 254), clean(b.city, 100), clean(b.commune, 100), clean(b.district, 100), clean(b.address, 300), clean(b.nationality, 100), clean(b.id_type, 50), clean(b.id_number, 100), clean(b.notes, 1000)).run();
  await audit(env, auth, request, 'CREATE', 'client', id, null, { reference, last_name: last, phone });
  return json({ ok: true, id, reference }, 201);
}
async function getClient(env, id) {
  const client = await env.SYSTEME_DB.prepare(`SELECT * FROM clients WHERE id=?`).bind(id).first(); if (!client) throw httpError(404, 'Client introuvable.');
  const [jobs, tx, docs, credits, sales] = await Promise.all([
    env.SYSTEME_DB.prepare(`SELECT id,reference,title,status,total,paid,balance,created_at FROM jobs WHERE client_id=? ORDER BY created_at DESC LIMIT 50`).bind(id).all(),
    env.SYSTEME_DB.prepare(`SELECT id,reference,type,description,amount,payment_method,created_at FROM cash_transactions WHERE client_id=? ORDER BY created_at DESC LIMIT 50`).bind(id).all(),
    env.SYSTEME_DB.prepare(`SELECT id,reference,title,document_type,status,updated_at FROM documents WHERE client_id=? ORDER BY updated_at DESC LIMIT 50`).bind(id).all(),
    env.SYSTEME_DB.prepare(`SELECT id,reference,total_due,amount_paid,balance,status,due_date FROM credits WHERE client_id=? ORDER BY created_at DESC`).bind(id).all(),
    env.SYSTEME_DB.prepare(`SELECT id,reference,total,paid,balance,status,created_at FROM sales WHERE client_id=? ORDER BY created_at DESC LIMIT 50`).bind(id).all()
  ]);
  return json({ ok: true, client, history: { jobs: jobs.results, transactions: tx.results, documents: docs.results, credits: credits.results, sales: sales.results } });
}
async function updateClient(request, env, auth, id) {
  requireRole(auth, WORK_ROLES); const old = await env.SYSTEME_DB.prepare(`SELECT * FROM clients WHERE id=?`).bind(id).first(); if (!old) throw httpError(404, 'Client introuvable.');
  const b = await bodyJson(request); const last = clean(b.last_name ?? old.last_name, 120); if (!last) throw httpError(400, 'Nom obligatoire.');
  await env.SYSTEME_DB.prepare(`UPDATE clients SET civility=?,first_name=?,last_name=?,sex=?,birth_date=?,profession=?,company=?,phone=?,phone2=?,whatsapp=?,email=?,city=?,commune=?,district=?,address=?,nationality=?,id_type=?,id_number=?,notes=?,active=?,updated_at=? WHERE id=?`)
    .bind(clean(b.civility ?? old.civility,20),clean(b.first_name ?? old.first_name,120),last,clean(b.sex ?? old.sex,20),clean(b.birth_date ?? old.birth_date,20),clean(b.profession ?? old.profession,120),clean(b.company ?? old.company,160),clean(b.phone ?? old.phone,30),clean(b.phone2 ?? old.phone2,30),clean(b.whatsapp ?? old.whatsapp,30),clean(b.email ?? old.email,254),clean(b.city ?? old.city,100),clean(b.commune ?? old.commune,100),clean(b.district ?? old.district,100),clean(b.address ?? old.address,300),clean(b.nationality ?? old.nationality,100),clean(b.id_type ?? old.id_type,50),clean(b.id_number ?? old.id_number,100),clean(b.notes ?? old.notes,1000),b.active === undefined ? old.active : (b.active ? 1 : 0),nowIso(),id).run();
  await audit(env, auth, request, 'UPDATE', 'client', id, old, b); return json({ ok: true });
}

async function listServices(env) {
  const rows = await env.SYSTEME_DB.prepare(`SELECT s.*,c.name category_name FROM services s LEFT JOIN service_categories c ON c.id=s.category_id ORDER BY c.name,s.name`).all();
  const cats = await env.SYSTEME_DB.prepare(`SELECT * FROM service_categories WHERE active=1 ORDER BY name`).all();
  return json({ ok: true, items: rows.results, categories: cats.results });
}
async function createService(request, env, auth) {
  requireRole(auth, MANAGER_ROLES); const b = await bodyJson(request); const name = clean(b.name,150), code=clean(b.code,50)?.toUpperCase(); if(!name||!code) throw httpError(400,'Code et nom obligatoires.'); const id=uuid();
  await env.SYSTEME_DB.prepare(`INSERT INTO services(id,code,category_id,name,description,unit,price,cost,active) VALUES(?,?,?,?,?,?,?,?,1)`).bind(id,code,clean(b.category_id,60),name,clean(b.description,500),clean(b.unit,30)||'unité',Math.max(0,int(b.price)),Math.max(0,int(b.cost))).run();
  await audit(env,auth,request,'CREATE','service',id,null,{code,name}); return json({ok:true,id},201);
}
async function updateService(request, env, auth, id) {
  requireRole(auth, MANAGER_ROLES); const old=await env.SYSTEME_DB.prepare(`SELECT * FROM services WHERE id=?`).bind(id).first(); if(!old) throw httpError(404,'Service introuvable.'); const b=await bodyJson(request);
  await env.SYSTEME_DB.prepare(`UPDATE services SET code=?,category_id=?,name=?,description=?,unit=?,price=?,cost=?,active=?,updated_at=? WHERE id=?`).bind(clean(b.code??old.code,50)?.toUpperCase(),clean(b.category_id??old.category_id,60),clean(b.name??old.name,150),clean(b.description??old.description,500),clean(b.unit??old.unit,30),Math.max(0,int(b.price??old.price)),Math.max(0,int(b.cost??old.cost)),b.active===undefined?old.active:(b.active?1:0),nowIso(),id).run(); await audit(env,auth,request,'UPDATE','service',id,old,b); return json({ok:true});
}

async function listJobs(env, sp) {
  const {page,size,offset}=pageParams(sp); const status=clean(sp.get('status'),30); const q=clean(sp.get('q'),100)||''; const clauses=[]; const binds=[];
  if(status){clauses.push('j.status=?');binds.push(status);} if(q){clauses.push('(j.reference LIKE ? OR j.title LIKE ? OR c.last_name LIKE ? OR c.phone LIKE ?)'); const l=`%${q}%`; binds.push(l,l,l,l);}
  const where=clauses.length?`WHERE ${clauses.join(' AND ')}`:'';
  const rows=await env.SYSTEME_DB.prepare(`SELECT j.*,c.last_name client_last_name,c.first_name client_first_name,c.phone client_phone,s.name service_name,e.first_name employee_first_name,e.last_name employee_last_name FROM jobs j LEFT JOIN clients c ON c.id=j.client_id LEFT JOIN services s ON s.id=j.service_id LEFT JOIN employees e ON e.id=j.assigned_employee_id ${where} ORDER BY j.created_at DESC LIMIT ? OFFSET ?`).bind(...binds,size,offset).all();
  const count=await env.SYSTEME_DB.prepare(`SELECT COUNT(*) count FROM jobs j LEFT JOIN clients c ON c.id=j.client_id ${where}`).bind(...binds).first(); return json({ok:true,items:rows.results,page,size,total:count?.count||0});
}
async function createJob(request, env, auth) {
  requireRole(auth, WORK_ROLES); const b=await bodyJson(request); const title=clean(b.title,180); if(!title) throw httpError(400,'Intitulé du travail obligatoire.');
  const quantity=Math.max(0.01,num(b.quantity,1)); const unitPrice=Math.max(0,int(b.unit_price)); const discount=Math.max(0,int(b.discount)); const total=Math.max(0,Math.round(quantity*unitPrice)-discount); const paid=Math.min(total,Math.max(0,int(b.paid))); const balance=total-paid; const id=uuid(), reference=ref('MS-TR');
  const stmts=[env.SYSTEME_DB.prepare(`INSERT INTO jobs(id,reference,client_id,service_id,title,description,quantity,unit_price,discount,total,paid,balance,priority,status,due_at,assigned_employee_id,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,reference,clean(b.client_id,60),clean(b.service_id,60),title,clean(b.description,2000),quantity,unitPrice,discount,total,paid,balance,clean(b.priority,30)||'normal',clean(b.status,30)||'received',clean(b.due_at,40),clean(b.assigned_employee_id,60),auth.user.id)];
  if(paid>0){const account=clean(b.cash_account_id,60)||'cash-main'; const txid=uuid(), txref=ref('MS-MVT'); stmts.push(env.SYSTEME_DB.prepare(`INSERT INTO cash_transactions(id,reference,account_id,client_id,job_id,type,category,description,amount,payment_method,related_type,related_id,created_by) VALUES(?,?,?,?,?,'income','Prestation',?,?,?,?,?,?)`).bind(txid,txref,account,clean(b.client_id,60),id,`Paiement travail ${reference}`,paid,clean(b.payment_method,40)||'cash','job',id,auth.user.id)); stmts.push(env.SYSTEME_DB.prepare(`INSERT INTO receipts(id,reference,client_id,amount,payment_method,related_type,related_id,created_by) VALUES(?,?,?,?,?,'job',?,?)`).bind(uuid(),ref('MS-REC'),clean(b.client_id,60),paid,clean(b.payment_method,40)||'cash',id,auth.user.id));}
  await env.SYSTEME_DB.batch(stmts); await audit(env,auth,request,'CREATE','job',id,null,{reference,title,total,paid,balance}); return json({ok:true,id,reference,total,paid,balance},201);
}
async function updateJob(request, env, auth, id) {
  requireRole(auth, WORK_ROLES); const old=await env.SYSTEME_DB.prepare(`SELECT * FROM jobs WHERE id=?`).bind(id).first(); if(!old) throw httpError(404,'Travail introuvable.'); const b=await bodyJson(request);
  const status=clean(b.status??old.status,30); const allowed=['received','waiting','in_progress','review','completed','ready','delivered','cancelled']; if(!allowed.includes(status)) throw httpError(400,'Statut invalide.');
  await env.SYSTEME_DB.prepare(`UPDATE jobs SET title=?,description=?,priority=?,status=?,due_at=?,assigned_employee_id=?,updated_at=? WHERE id=?`).bind(clean(b.title??old.title,180),clean(b.description??old.description,2000),clean(b.priority??old.priority,30),status,clean(b.due_at??old.due_at,40),clean(b.assigned_employee_id??old.assigned_employee_id,60),nowIso(),id).run(); await audit(env,auth,request,'UPDATE','job',id,old,b); return json({ok:true});
}
async function payJob(request, env, auth, id) {
  requireRole(auth, FINANCE_ROLES); const job=await env.SYSTEME_DB.prepare(`SELECT * FROM jobs WHERE id=?`).bind(id).first(); if(!job) throw httpError(404,'Travail introuvable.'); const b=await bodyJson(request); const amount=Math.max(1,int(b.amount)); if(amount>job.balance) throw httpError(400,'Le paiement dépasse le reste à payer.'); const account=clean(b.cash_account_id,60)||'cash-main'; const newPaid=int(job.paid)+amount, newBalance=int(job.balance)-amount;
  await env.SYSTEME_DB.batch([
    env.SYSTEME_DB.prepare(`UPDATE jobs SET paid=?,balance=?,updated_at=? WHERE id=?`).bind(newPaid,newBalance,nowIso(),id),
    env.SYSTEME_DB.prepare(`INSERT INTO cash_transactions(id,reference,account_id,client_id,job_id,type,category,description,amount,payment_method,related_type,related_id,created_by) VALUES(?,?,?,?,?,'income','Prestation',?,?,?,?,?,?)`).bind(uuid(),ref('MS-MVT'),account,job.client_id,id,`Paiement travail ${job.reference}`,amount,clean(b.payment_method,40)||'cash','job',id,auth.user.id),
    env.SYSTEME_DB.prepare(`INSERT INTO receipts(id,reference,client_id,amount,payment_method,related_type,related_id,created_by) VALUES(?,?,?,?,?,'job',?,?)`).bind(uuid(),ref('MS-REC'),job.client_id,amount,clean(b.payment_method,40)||'cash',id,auth.user.id)
  ]); await audit(env,auth,request,'PAYMENT','job',id,job,{amount,new_balance:newBalance}); return json({ok:true,paid:newPaid,balance:newBalance});
}

async function accountBalances(env) {
  const rows=await env.SYSTEME_DB.prepare(`SELECT a.id,a.code,a.name,a.type,a.opening_balance + COALESCE(SUM(CASE WHEN t.cancelled=0 AND t.type IN ('income','transfer_in','correction','credit_repayment','sale','mobile_money') THEN t.amount WHEN t.cancelled=0 AND t.type IN ('expense','transfer_out') THEN -t.amount ELSE 0 END),0) balance FROM cash_accounts a LEFT JOIN cash_transactions t ON t.account_id=a.id WHERE a.active=1 GROUP BY a.id ORDER BY a.name`).all(); return rows.results;
}
async function listCashAccounts(env){return json({ok:true,items:await accountBalances(env)});}
async function listCashTransactions(env, sp){const {page,size,offset}=pageParams(sp); const rows=await env.SYSTEME_DB.prepare(`SELECT t.*,a.name account_name,c.last_name client_last_name,c.first_name client_first_name FROM cash_transactions t JOIN cash_accounts a ON a.id=t.account_id LEFT JOIN clients c ON c.id=t.client_id ORDER BY t.created_at DESC LIMIT ? OFFSET ?`).bind(size,offset).all(); const c=await env.SYSTEME_DB.prepare(`SELECT COUNT(*) count FROM cash_transactions`).first(); return json({ok:true,items:rows.results,page,size,total:c?.count||0});}
async function createCashTransaction(request, env, auth){requireRole(auth,FINANCE_ROLES); const b=await bodyJson(request); const type=clean(b.type,30); const allowed=['income','expense','transfer_in','transfer_out','correction']; if(!allowed.includes(type)) throw httpError(400,'Type de mouvement invalide.'); const amount=Math.max(1,int(b.amount)); const description=clean(b.description,300); if(!description) throw httpError(400,'Description obligatoire.'); const id=uuid(),reference=ref('MS-MVT'); await env.SYSTEME_DB.prepare(`INSERT INTO cash_transactions(id,reference,account_id,client_id,type,category,description,amount,payment_method,created_by) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(id,reference,clean(b.account_id,60)||'cash-main',clean(b.client_id,60),type,clean(b.category,100),description,amount,clean(b.payment_method,40),auth.user.id).run(); await audit(env,auth,request,'CREATE','cash_transaction',id,null,{reference,type,amount}); return json({ok:true,id,reference},201);}
async function closeCash(request, env, auth){requireRole(auth,FINANCE_ROLES); const b=await bodyJson(request); const accountId=clean(b.account_id,60)||'cash-main'; const balances=await accountBalances(env); const acc=balances.find(x=>x.id===accountId); if(!acc) throw httpError(404,'Caisse introuvable.'); const actual=int(b.actual_balance); const date=clean(b.closure_date,20)||new Date().toISOString().slice(0,10); const diff=actual-int(acc.balance); await env.SYSTEME_DB.prepare(`INSERT INTO cash_closures(id,account_id,closure_date,theoretical_balance,actual_balance,difference,justification,created_by) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(account_id,closure_date) DO UPDATE SET theoretical_balance=excluded.theoretical_balance,actual_balance=excluded.actual_balance,difference=excluded.difference,justification=excluded.justification,created_by=excluded.created_by,created_at=CURRENT_TIMESTAMP`).bind(uuid(),accountId,date,int(acc.balance),actual,diff,clean(b.justification,500),auth.user.id).run(); await audit(env,auth,request,'CASH_CLOSURE','cash_account',accountId,null,{date,theoretical:acc.balance,actual,difference:diff}); return json({ok:true,theoretical:int(acc.balance),actual,difference:diff});}

async function listMobileMoney(env,sp){const {page,size,offset}=pageParams(sp); const rows=await env.SYSTEME_DB.prepare(`SELECT m.*,c.last_name client_last_name,c.first_name client_first_name FROM mobile_money_transactions m LEFT JOIN clients c ON c.id=m.client_id ORDER BY m.created_at DESC LIMIT ? OFFSET ?`).bind(size,offset).all(); const c=await env.SYSTEME_DB.prepare(`SELECT COUNT(*) count FROM mobile_money_transactions`).first(); return json({ok:true,items:rows.results,page,size,total:c?.count||0});}
async function createMobileMoney(request,env,auth){requireRole(auth,new Set([...FINANCE_ROLES,'mobile_money_agent'])); const b=await bodyJson(request); const operator=clean(b.operator,30),op=clean(b.operation_type,30); if(!['wave','orange_money','mtn_money','moov_money','other'].includes(operator)) throw httpError(400,'Opérateur invalide.'); if(!['deposit','withdrawal','transfer','payment','commission','float_in','float_out'].includes(op)) throw httpError(400,"Type d'opération invalide."); const amount=Math.max(0,int(b.amount)),fees=Math.max(0,int(b.fees)),commission=Math.max(0,int(b.commission)); if(amount<=0&&commission<=0) throw httpError(400,'Montant invalide.'); const map={wave:'cash-wave',orange_money:'cash-orange',mtn_money:'cash-mtn',moov_money:'cash-moov'}; const wallet=clean(b.cash_account_id,60)||map[operator]||'cash-main'; const physical=clean(b.physical_cash_account_id,60)||'cash-main'; const id=uuid(),reference=ref('MS-MM'); const stmts=[env.SYSTEME_DB.prepare(`INSERT INTO mobile_money_transactions(id,reference,operator,operation_type,client_id,customer_phone,amount,fees,commission,cash_account_id,note,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,reference,operator,op,clean(b.client_id,60),clean(b.customer_phone,30),amount,fees,commission,wallet,clean(b.note,500),auth.user.id)];
  const tx=(account,type,desc,val)=>env.SYSTEME_DB.prepare(`INSERT INTO cash_transactions(id,reference,account_id,client_id,type,category,description,amount,payment_method,related_type,related_id,created_by) VALUES(?,?,?,?,?,'Mobile Money',?,?,?,'mobile_money',?,?)`).bind(uuid(),ref('MS-MVT'),account,clean(b.client_id,60),type,desc,Math.max(0,val),operator,id,auth.user.id);
  if(op==='deposit'||op==='payment'||op==='transfer'){stmts.push(tx(wallet,'transfer_out',`${operator} ${op} - sortie solde électronique`,amount));stmts.push(tx(physical,'transfer_in',`${operator} ${op} - entrée espèces`,amount+fees)); if(commission>0) stmts.push(tx(wallet,'income',`${operator} commission`,commission));}
  else if(op==='withdrawal'){stmts.push(tx(wallet,'transfer_in',`${operator} retrait - entrée solde électronique`,amount+commission));stmts.push(tx(physical,'transfer_out',`${operator} retrait - sortie espèces`,amount));}
  else if(op==='commission'){stmts.push(tx(wallet,'income',`${operator} commission`,commission||amount));}
  else if(op==='float_in'){stmts.push(tx(wallet,'transfer_in',`${operator} approvisionnement float`,amount));stmts.push(tx(physical,'transfer_out',`${operator} approvisionnement float`,amount));}
  else if(op==='float_out'){stmts.push(tx(wallet,'transfer_out',`${operator} retrait de float`,amount));stmts.push(tx(physical,'transfer_in',`${operator} retrait de float`,amount));}
  await env.SYSTEME_DB.batch(stmts); await audit(env,auth,request,'CREATE','mobile_money',id,null,{reference,operator,op,amount,fees,commission}); return json({ok:true,id,reference},201);}

async function listProducts(env,sp){const {page,size,offset}=pageParams(sp); const q=clean(sp.get('q'),100)||''; const l=`%${q}%`; const where=q?'WHERE p.code LIKE ? OR p.name LIKE ? OR p.barcode LIKE ?':''; const binds=q?[l,l,l]:[]; const rows=await env.SYSTEME_DB.prepare(`SELECT p.*,c.name category_name,s.business_name supplier_name,(p.sale_price-p.purchase_price) margin FROM products p LEFT JOIN product_categories c ON c.id=p.category_id LEFT JOIN suppliers s ON s.id=p.supplier_id ${where} ORDER BY p.name LIMIT ? OFFSET ?`).bind(...binds,size,offset).all(); const c=await env.SYSTEME_DB.prepare(`SELECT COUNT(*) count FROM products p ${where}`).bind(...binds).first(); const cats=await env.SYSTEME_DB.prepare(`SELECT * FROM product_categories WHERE active=1 ORDER BY name`).all(); return json({ok:true,items:rows.results,categories:cats.results,page,size,total:c?.count||0});}
async function createProduct(request,env,auth){requireRole(auth,STOCK_ROLES); const b=await bodyJson(request); const code=clean(b.code,60)?.toUpperCase(),name=clean(b.name,160); if(!code||!name) throw httpError(400,'Code et nom obligatoires.'); const id=uuid(); await env.SYSTEME_DB.prepare(`INSERT INTO products(id,code,barcode,category_id,supplier_id,name,description,purchase_price,sale_price,stock_quantity,min_stock,unit,active) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1)`).bind(id,code,clean(b.barcode,100),clean(b.category_id,60),clean(b.supplier_id,60),name,clean(b.description,500),Math.max(0,int(b.purchase_price)),Math.max(0,int(b.sale_price)),Math.max(0,num(b.stock_quantity)),Math.max(0,num(b.min_stock)),clean(b.unit,30)||'unité').run(); await audit(env,auth,request,'CREATE','product',id,null,{code,name}); return json({ok:true,id},201);}
async function updateProduct(request,env,auth,id){requireRole(auth,STOCK_ROLES); const old=await env.SYSTEME_DB.prepare(`SELECT * FROM products WHERE id=?`).bind(id).first(); if(!old) throw httpError(404,'Produit introuvable.'); const b=await bodyJson(request); await env.SYSTEME_DB.prepare(`UPDATE products SET code=?,barcode=?,category_id=?,supplier_id=?,name=?,description=?,purchase_price=?,sale_price=?,min_stock=?,unit=?,active=?,updated_at=? WHERE id=?`).bind(clean(b.code??old.code,60)?.toUpperCase(),clean(b.barcode??old.barcode,100),clean(b.category_id??old.category_id,60),clean(b.supplier_id??old.supplier_id,60),clean(b.name??old.name,160),clean(b.description??old.description,500),Math.max(0,int(b.purchase_price??old.purchase_price)),Math.max(0,int(b.sale_price??old.sale_price)),Math.max(0,num(b.min_stock??old.min_stock)),clean(b.unit??old.unit,30),b.active===undefined?old.active:(b.active?1:0),nowIso(),id).run(); await audit(env,auth,request,'UPDATE','product',id,old,b); return json({ok:true});}
async function adjustStock(request,env,auth,id){requireRole(auth,STOCK_ROLES); const product=await env.SYSTEME_DB.prepare(`SELECT * FROM products WHERE id=?`).bind(id).first(); if(!product) throw httpError(404,'Produit introuvable.'); const b=await bodyJson(request); const type=clean(b.movement_type,30); if(!['in','out','return','adjustment'].includes(type)) throw httpError(400,'Type de mouvement invalide.'); const quantity=Math.abs(num(b.quantity)); if(quantity<=0) throw httpError(400,'Quantité invalide.'); let delta=(type==='in'||type==='return')?quantity:-quantity; if(type==='adjustment') delta=num(b.quantity); const next=num(product.stock_quantity)+delta; if(next<0) throw httpError(409,'Stock insuffisant.'); const movementId=uuid(); await env.SYSTEME_DB.batch([env.SYSTEME_DB.prepare(`UPDATE products SET stock_quantity=?,updated_at=? WHERE id=?`).bind(next,nowIso(),id),env.SYSTEME_DB.prepare(`INSERT INTO stock_movements(id,reference,product_id,movement_type,quantity,unit_cost,note,created_by) VALUES(?,?,?,?,?,?,?,?)`).bind(movementId,ref('MS-STK'),id,type,delta,Math.max(0,int(b.unit_cost??product.purchase_price)),clean(b.note,500),auth.user.id)]); await audit(env,auth,request,'STOCK_ADJUST','product',id,product,{movement_type:type,quantity:delta,new_stock:next}); return json({ok:true,stock_quantity:next});}

async function listSales(env,sp){const {page,size,offset}=pageParams(sp); const rows=await env.SYSTEME_DB.prepare(`SELECT s.*,c.last_name client_last_name,c.first_name client_first_name FROM sales s LEFT JOIN clients c ON c.id=s.client_id ORDER BY s.created_at DESC LIMIT ? OFFSET ?`).bind(size,offset).all(); const c=await env.SYSTEME_DB.prepare(`SELECT COUNT(*) count FROM sales`).first(); return json({ok:true,items:rows.results,page,size,total:c?.count||0});}
async function getSale(env,id){const sale=await env.SYSTEME_DB.prepare(`SELECT s.*,c.last_name client_last_name,c.first_name client_first_name,c.phone client_phone FROM sales s LEFT JOIN clients c ON c.id=s.client_id WHERE s.id=?`).bind(id).first(); if(!sale) throw httpError(404,'Vente introuvable.'); const items=await env.SYSTEME_DB.prepare(`SELECT * FROM sale_items WHERE sale_id=?`).bind(id).all(); return json({ok:true,sale,items:items.results});}
async function createSale(request,env,auth){requireRole(auth,STOCK_ROLES); const b=await bodyJson(request); if(!Array.isArray(b.items)||b.items.length===0) throw httpError(400,'Ajoutez au moins un article.'); const productIds=[...new Set(b.items.map(x=>clean(x.product_id,60)).filter(Boolean))]; if(productIds.length!==b.items.length) throw httpError(400,'Chaque ligne doit contenir un produit.'); const placeholders=productIds.map(()=>'?').join(','); const products=await env.SYSTEME_DB.prepare(`SELECT * FROM products WHERE id IN (${placeholders})`).bind(...productIds).all(); const map=new Map(products.results.map(p=>[p.id,p])); let subtotal=0; const normalized=[]; for(const item of b.items){const p=map.get(item.product_id); if(!p) throw httpError(404,'Un produit est introuvable.'); const qty=Math.max(0.01,num(item.quantity)); if(num(p.stock_quantity)<qty) throw httpError(409,`Stock insuffisant pour ${p.name}.`); const price=Math.max(0,int(item.unit_price??p.sale_price)); const total=Math.round(qty*price); subtotal+=total; normalized.push({p,qty,price,total});} const discount=Math.min(subtotal,Math.max(0,int(b.discount))); const total=subtotal-discount; const paid=Math.min(total,Math.max(0,int(b.paid??total))); const balance=total-paid; const saleId=uuid(),reference=ref('MS-VTE'); const stmts=[env.SYSTEME_DB.prepare(`INSERT INTO sales(id,reference,client_id,subtotal,discount,total,paid,balance,payment_method,cash_account_id,status,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,'completed',?)`).bind(saleId,reference,clean(b.client_id,60),subtotal,discount,total,paid,balance,clean(b.payment_method,40)||'cash',clean(b.cash_account_id,60)||'cash-main',auth.user.id)]; for(const x of normalized){stmts.push(env.SYSTEME_DB.prepare(`INSERT INTO sale_items(id,sale_id,product_id,description,quantity,unit_price,total) VALUES(?,?,?,?,?,?,?)`).bind(uuid(),saleId,x.p.id,x.p.name,x.qty,x.price,x.total));stmts.push(env.SYSTEME_DB.prepare(`UPDATE products SET stock_quantity=stock_quantity-?,updated_at=? WHERE id=?`).bind(x.qty,nowIso(),x.p.id));stmts.push(env.SYSTEME_DB.prepare(`INSERT INTO stock_movements(id,reference,product_id,movement_type,quantity,unit_cost,note,related_type,related_id,created_by) VALUES(?,?,?,'sale',?,?,?,'sale',?,?)`).bind(uuid(),ref('MS-STK'),x.p.id,-x.qty,x.p.purchase_price,`Vente ${reference}`,saleId,auth.user.id));}
  if(paid>0){stmts.push(env.SYSTEME_DB.prepare(`INSERT INTO cash_transactions(id,reference,account_id,client_id,type,category,description,amount,payment_method,related_type,related_id,created_by) VALUES(?,?,?,?,'sale','Vente',?,?,?,?,?,?)`).bind(uuid(),ref('MS-MVT'),clean(b.cash_account_id,60)||'cash-main',clean(b.client_id,60),`Vente ${reference}`,paid,clean(b.payment_method,40)||'cash','sale',saleId,auth.user.id));stmts.push(env.SYSTEME_DB.prepare(`INSERT INTO receipts(id,reference,client_id,amount,payment_method,related_type,related_id,created_by) VALUES(?,?,?,?,?,'sale',?,?)`).bind(uuid(),ref('MS-REC'),clean(b.client_id,60),paid,clean(b.payment_method,40)||'cash',saleId,auth.user.id));}
  stmts.push(env.SYSTEME_DB.prepare(`INSERT INTO invoices(id,reference,client_id,sale_id,total,paid,balance,status,created_by) VALUES(?,?,?,?,?,?,?, ?,?)`).bind(uuid(),ref('MS-FAC'),clean(b.client_id,60),saleId,total,paid,balance,balance===0?'paid':paid>0?'partial':'issued',auth.user.id)); await env.SYSTEME_DB.batch(stmts); await audit(env,auth,request,'CREATE','sale',saleId,null,{reference,total,paid,balance,items:normalized.length}); return json({ok:true,id:saleId,reference,total,paid,balance},201);}

async function listCredits(env,sp){const {page,size,offset}=pageParams(sp); const rows=await env.SYSTEME_DB.prepare(`SELECT cr.*,c.last_name client_last_name,c.first_name client_first_name,c.phone client_phone FROM credits cr JOIN clients c ON c.id=cr.client_id ORDER BY cr.created_at DESC LIMIT ? OFFSET ?`).bind(size,offset).all(); const c=await env.SYSTEME_DB.prepare(`SELECT COUNT(*) count FROM credits`).first(); return json({ok:true,items:rows.results,page,size,total:c?.count||0});}
async function createCredit(request,env,auth){requireRole(auth,FINANCE_ROLES); const b=await bodyJson(request); const clientId=clean(b.client_id,60); if(!clientId) throw httpError(400,'Client obligatoire.'); const client=await env.SYSTEME_DB.prepare(`SELECT id FROM clients WHERE id=?`).bind(clientId).first(); if(!client) throw httpError(404,'Client introuvable.'); const principal=Math.max(1,int(b.principal)); const rate=Math.max(0,num(b.interest_rate)); const fees=Math.max(0,int(b.fees)); const months=Math.max(1,int(b.duration_months,1)); const totalDue=Math.round(principal+(principal*rate/100)+fees); const id=uuid(),reference=ref('MS-CRD'); const start=clean(b.start_date,20)||new Date().toISOString().slice(0,10); await env.SYSTEME_DB.prepare(`INSERT INTO credits(id,reference,client_id,principal,interest_rate,fees,duration_months,total_due,amount_paid,balance,start_date,due_date,purpose,status,created_by) VALUES(?,?,?,?,?,?,?,?,0,?,?,?,?, 'active',?)`).bind(id,reference,clientId,principal,rate,fees,months,totalDue,totalDue,start,clean(b.due_date,20),clean(b.purpose,500),auth.user.id).run(); await audit(env,auth,request,'CREATE','credit',id,null,{reference,principal,total_due:totalDue}); return json({ok:true,id,reference,total_due:totalDue,balance:totalDue},201);}
async function repayCredit(request,env,auth,id){requireRole(auth,FINANCE_ROLES); const credit=await env.SYSTEME_DB.prepare(`SELECT * FROM credits WHERE id=?`).bind(id).first(); if(!credit) throw httpError(404,'Crédit introuvable.'); if(!['active','late'].includes(credit.status)) throw httpError(409,'Ce crédit ne peut pas recevoir de remboursement.'); const b=await bodyJson(request); const amount=Math.max(1,int(b.amount)); if(amount>int(credit.balance)) throw httpError(400,'Le remboursement dépasse la dette restante.'); const newPaid=int(credit.amount_paid)+amount,newBalance=int(credit.balance)-amount,newStatus=newBalance===0?'paid':credit.status; const payId=uuid(),payRef=ref('MS-RMB'),account=clean(b.cash_account_id,60)||'cash-main',method=clean(b.payment_method,40)||'cash'; await env.SYSTEME_DB.batch([env.SYSTEME_DB.prepare(`UPDATE credits SET amount_paid=?,balance=?,status=?,updated_at=? WHERE id=?`).bind(newPaid,newBalance,newStatus,nowIso(),id),env.SYSTEME_DB.prepare(`INSERT INTO credit_payments(id,reference,credit_id,client_id,amount,cash_account_id,payment_method,note,created_by) VALUES(?,?,?,?,?,?,?,?,?)`).bind(payId,payRef,id,credit.client_id,amount,account,method,clean(b.note,500),auth.user.id),env.SYSTEME_DB.prepare(`INSERT INTO cash_transactions(id,reference,account_id,client_id,type,category,description,amount,payment_method,related_type,related_id,created_by) VALUES(?,?,?,?,'credit_repayment','Remboursement crédit',?,?,?,?,?,?)`).bind(uuid(),ref('MS-MVT'),account,credit.client_id,`Remboursement ${credit.reference}`,amount,method,'credit',id,auth.user.id),env.SYSTEME_DB.prepare(`INSERT INTO receipts(id,reference,client_id,amount,payment_method,related_type,related_id,created_by) VALUES(?,?,?,?,?,'credit',?,?)`).bind(uuid(),ref('MS-REC'),credit.client_id,amount,method,id,auth.user.id)]); await audit(env,auth,request,'REPAYMENT','credit',id,credit,{amount,new_balance:newBalance}); return json({ok:true,payment_reference:payRef,amount_paid:newPaid,balance:newBalance,status:newStatus});}

async function listExpenses(env,sp){const {page,size,offset}=pageParams(sp); const rows=await env.SYSTEME_DB.prepare(`SELECT e.*,a.name account_name,s.business_name supplier_name FROM expenses e JOIN cash_accounts a ON a.id=e.cash_account_id LEFT JOIN suppliers s ON s.id=e.supplier_id ORDER BY e.expense_date DESC,e.created_at DESC LIMIT ? OFFSET ?`).bind(size,offset).all(); const c=await env.SYSTEME_DB.prepare(`SELECT COUNT(*) count FROM expenses`).first(); return json({ok:true,items:rows.results,page,size,total:c?.count||0});}
async function createExpense(request,env,auth){requireRole(auth,FINANCE_ROLES); const b=await bodyJson(request); const amount=Math.max(1,int(b.amount)),description=clean(b.description,300),category=clean(b.category,100); if(!description||!category) throw httpError(400,'Catégorie et description obligatoires.'); const account=clean(b.cash_account_id,60)||'cash-main',id=uuid(),reference=ref('MS-DEP'); await env.SYSTEME_DB.batch([env.SYSTEME_DB.prepare(`INSERT INTO expenses(id,reference,category,description,amount,cash_account_id,supplier_id,receipt_reference,expense_date,created_by) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(id,reference,category,description,amount,account,clean(b.supplier_id,60),clean(b.receipt_reference,100),clean(b.expense_date,20)||new Date().toISOString().slice(0,10),auth.user.id),env.SYSTEME_DB.prepare(`INSERT INTO cash_transactions(id,reference,account_id,type,category,description,amount,payment_method,related_type,related_id,created_by) VALUES(?,?,?,'expense',?,?,?,?, 'expense',?,?)`).bind(uuid(),ref('MS-MVT'),account,category,description,amount,clean(b.payment_method,40)||'cash',id,auth.user.id)]); await audit(env,auth,request,'CREATE','expense',id,null,{reference,amount,category}); return json({ok:true,id,reference},201);}

async function listDocuments(env,sp){const {page,size,offset}=pageParams(sp); const rows=await env.SYSTEME_DB.prepare(`SELECT d.id,d.reference,d.client_id,d.job_id,d.title,d.document_type,d.version,d.status,d.created_at,d.updated_at,c.last_name client_last_name,c.first_name client_first_name FROM documents d LEFT JOIN clients c ON c.id=d.client_id ORDER BY d.updated_at DESC LIMIT ? OFFSET ?`).bind(size,offset).all(); const c=await env.SYSTEME_DB.prepare(`SELECT COUNT(*) count FROM documents`).first(); return json({ok:true,items:rows.results,page,size,total:c?.count||0});}
async function createDocument(request,env,auth){requireRole(auth,WORK_ROLES); const b=await bodyJson(request); const title=clean(b.title,200),type=clean(b.document_type,100); if(!title||!type) throw httpError(400,'Titre et type obligatoires.'); const id=uuid(),reference=ref('MS-DOC'),body=String(b.body_html||'').slice(0,250000); await env.SYSTEME_DB.batch([env.SYSTEME_DB.prepare(`INSERT INTO documents(id,reference,client_id,job_id,title,document_type,body_html,version,status,created_by) VALUES(?,?,?,?,?,?,?,1,?,?)`).bind(id,reference,clean(b.client_id,60),clean(b.job_id,60),title,type,body,clean(b.status,30)||'draft',auth.user.id),env.SYSTEME_DB.prepare(`INSERT INTO document_versions(id,document_id,version,body_html,created_by) VALUES(?,?,1,?,?)`).bind(uuid(),id,body,auth.user.id)]); await audit(env,auth,request,'CREATE','document',id,null,{reference,title,type}); return json({ok:true,id,reference},201);}
async function getDocument(env,id){const d=await env.SYSTEME_DB.prepare(`SELECT d.*,c.last_name client_last_name,c.first_name client_first_name,c.phone client_phone FROM documents d LEFT JOIN clients c ON c.id=d.client_id WHERE d.id=?`).bind(id).first(); if(!d) throw httpError(404,'Document introuvable.'); const versions=await env.SYSTEME_DB.prepare(`SELECT id,version,created_at,created_by FROM document_versions WHERE document_id=? ORDER BY version DESC`).bind(id).all(); return json({ok:true,document:d,versions:versions.results});}
async function updateDocument(request,env,auth,id){requireRole(auth,WORK_ROLES); const old=await env.SYSTEME_DB.prepare(`SELECT * FROM documents WHERE id=?`).bind(id).first(); if(!old) throw httpError(404,'Document introuvable.'); const b=await bodyJson(request); const body=String(b.body_html??old.body_html).slice(0,250000); const changed=body!==old.body_html; const version=changed?int(old.version)+1:int(old.version); const stmts=[env.SYSTEME_DB.prepare(`UPDATE documents SET title=?,document_type=?,body_html=?,version=?,status=?,updated_at=? WHERE id=?`).bind(clean(b.title??old.title,200),clean(b.document_type??old.document_type,100),body,version,clean(b.status??old.status,30),nowIso(),id)]; if(changed) stmts.push(env.SYSTEME_DB.prepare(`INSERT INTO document_versions(id,document_id,version,body_html,created_by) VALUES(?,?,?,?,?)`).bind(uuid(),id,version,body,auth.user.id)); await env.SYSTEME_DB.batch(stmts); await audit(env,auth,request,'UPDATE','document',id,{version:old.version,status:old.status},{version,status:b.status??old.status}); return json({ok:true,version});}

async function listEmployees(env){const rows=await env.SYSTEME_DB.prepare(`SELECT * FROM employees ORDER BY status,last_name,first_name`).all(); return json({ok:true,items:rows.results});}
async function createEmployee(request,env,auth){requireRole(auth,MANAGER_ROLES); const b=await bodyJson(request); const first=clean(b.first_name,120),last=clean(b.last_name,120); if(!first||!last) throw httpError(400,'Nom et prénom obligatoires.'); const id=uuid(),matricule=employeeRef(); await env.SYSTEME_DB.prepare(`INSERT INTO employees(id,matricule,first_name,last_name,phone,email,function_title,hire_date,salary,status) VALUES(?,?,?,?,?,?,?,?,?,'active')`).bind(id,matricule,first,last,clean(b.phone,30),clean(b.email,254),clean(b.function_title,120),clean(b.hire_date,20),Math.max(0,int(b.salary))).run(); await audit(env,auth,request,'CREATE','employee',id,null,{matricule,first,last}); return json({ok:true,id,matricule},201);}
async function listUsers(env,auth){requireRole(auth,FULL_ROLES); const rows=await env.SYSTEME_DB.prepare(`SELECT u.id,u.name,u.email,u.phone,u.role,u.active,u.employee_id,u.last_login_at,u.created_at,e.matricule FROM users u LEFT JOIN employees e ON e.id=u.employee_id ORDER BY u.created_at DESC`).all(); return json({ok:true,items:rows.results});}
async function createUser(request,env,auth){requireRole(auth,FULL_ROLES); const b=await bodyJson(request); const email=clean(b.email,254)?.toLowerCase(),name=clean(b.name,150),role=clean(b.role,40)||'employee'; const allowed=['super_admin','admin','director','manager','cashier','office_agent','mobile_money_agent','sales_agent','stock_manager','accountant','employee','readonly']; if(!email||!name||!allowed.includes(role)) throw httpError(400,'Données utilisateur invalides.'); if(role==='super_admin'&&auth.user.role!=='super_admin') throw httpError(403,'Seul le Super Admin peut créer un autre Super Admin.'); const pw=await passwordRecord(b.password); const id=uuid(); await env.SYSTEME_DB.prepare(`INSERT INTO users(id,employee_id,name,email,phone,password_hash,password_salt,role,active) VALUES(?,?,?,?,?,?,?, ?,1)`).bind(id,clean(b.employee_id,60),name,email,clean(b.phone,30),pw.hash,pw.salt,role).run(); await audit(env,auth,request,'CREATE','user',id,null,{name,email,role}); return json({ok:true,id},201);}

async function listSuppliers(env){const rows=await env.SYSTEME_DB.prepare(`SELECT * FROM suppliers ORDER BY business_name`).all(); return json({ok:true,items:rows.results});}
async function createSupplier(request,env,auth){requireRole(auth,STOCK_ROLES); const b=await bodyJson(request); const name=clean(b.business_name,180); if(!name) throw httpError(400,'Raison sociale obligatoire.'); const id=uuid(),reference=ref('MS-FOU'); await env.SYSTEME_DB.prepare(`INSERT INTO suppliers(id,reference,business_name,contact_name,phone,whatsapp,email,address,notes) VALUES(?,?,?,?,?,?,?,?,?)`).bind(id,reference,name,clean(b.contact_name,150),clean(b.phone,30),clean(b.whatsapp,30),clean(b.email,254),clean(b.address,300),clean(b.notes,500)).run(); await audit(env,auth,request,'CREATE','supplier',id,null,{reference,name}); return json({ok:true,id,reference},201);}

async function reportSummary(env,sp){const from=clean(sp.get('from'),20)||new Date(new Date().setDate(1)).toISOString().slice(0,10); const to=clean(sp.get('to'),20)||new Date().toISOString().slice(0,10); const [cash,expenses,sales,jobs,credits,topServices,daily]=await Promise.all([
  env.SYSTEME_DB.prepare(`SELECT COALESCE(SUM(CASE WHEN type IN ('income','credit_repayment','sale','mobile_money') THEN amount ELSE 0 END),0) income,COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) expense FROM cash_transactions WHERE cancelled=0 AND date(created_at) BETWEEN date(?) AND date(?)`).bind(from,to).first(),
  env.SYSTEME_DB.prepare(`SELECT COALESCE(SUM(amount),0) amount,COUNT(*) count FROM expenses WHERE date(expense_date) BETWEEN date(?) AND date(?)`).bind(from,to).first(),
  env.SYSTEME_DB.prepare(`SELECT COALESCE(SUM(total),0) total,COUNT(*) count FROM sales WHERE status='completed' AND date(created_at) BETWEEN date(?) AND date(?)`).bind(from,to).first(),
  env.SYSTEME_DB.prepare(`SELECT COALESCE(SUM(total),0) total,COUNT(*) count FROM jobs WHERE status!='cancelled' AND date(created_at) BETWEEN date(?) AND date(?)`).bind(from,to).first(),
  env.SYSTEME_DB.prepare(`SELECT COALESCE(SUM(balance),0) outstanding FROM credits WHERE status IN ('active','late')`).first(),
  env.SYSTEME_DB.prepare(`SELECT COALESCE(s.name,j.title) name,COUNT(*) count,COALESCE(SUM(j.total),0) total FROM jobs j LEFT JOIN services s ON s.id=j.service_id WHERE j.status!='cancelled' AND date(j.created_at) BETWEEN date(?) AND date(?) GROUP BY COALESCE(s.name,j.title) ORDER BY count DESC LIMIT 10`).bind(from,to).all(),
  env.SYSTEME_DB.prepare(`SELECT date(created_at) day,COALESCE(SUM(CASE WHEN type IN ('income','credit_repayment','sale','mobile_money') THEN amount WHEN type='expense' THEN -amount ELSE 0 END),0) net FROM cash_transactions WHERE cancelled=0 AND date(created_at) BETWEEN date(?) AND date(?) GROUP BY date(created_at) ORDER BY day`).bind(from,to).all()
]); return json({ok:true,from,to,cash,expenses,sales,jobs,credits,top_services:topServices.results,daily:daily.results});}
async function listAudit(env,auth,sp){requireRole(auth,FULL_ROLES); const {page,size,offset}=pageParams(sp); const rows=await env.SYSTEME_DB.prepare(`SELECT a.*,u.name user_name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT ? OFFSET ?`).bind(size,offset).all(); const c=await env.SYSTEME_DB.prepare(`SELECT COUNT(*) count FROM audit_logs`).first(); return json({ok:true,items:rows.results,page,size,total:c?.count||0});}

async function getSettings(env){const rows=await env.SYSTEME_DB.prepare(`SELECT key,value,updated_at FROM settings ORDER BY key`).all(); const settings=Object.fromEntries(rows.results.map(x=>[x.key,x.value])); return json({ok:true,settings});}
async function updateSettings(request,env,auth){requireRole(auth,MANAGER_ROLES); const b=await bodyJson(request); const allowed=['company_name','company_trade_name','company_capital','company_currency','company_city','company_country','company_phone','company_whatsapp','company_email','company_address','company_rccm','company_cc','invoice_footer','receipt_footer']; const stmts=[]; const changed={}; for(const key of allowed){if(Object.prototype.hasOwnProperty.call(b,key)){const value=clean(b[key],2000)??''; changed[key]=value; stmts.push(env.SYSTEME_DB.prepare(`INSERT INTO settings(key,value,updated_by,updated_at) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=excluded.updated_at`).bind(key,value,auth.user.id,nowIso()));}} if(!stmts.length) throw httpError(400,'Aucun paramètre valide à enregistrer.'); await env.SYSTEME_DB.batch(stmts); await audit(env,auth,request,'UPDATE','settings','company',null,changed); return json({ok:true,settings:changed});}
