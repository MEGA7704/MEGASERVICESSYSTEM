import fs from 'node:fs';
const required = [
  'public/index.html', 'public/styles.css', 'public/app.js', 'public/_routes.json',
  'functions/api/[[path]].js', 'functions/api/schema.js',
  'migrations/0001_initial.sql', 'migrations/0002_add_supplier_orders.sql', 'migrations/0003_sessions.sql',
  'wrangler.toml'
];
let failed = false;
for (const f of required) {
  if (!fs.existsSync(f)) { console.error('MISSING', f); failed = true; }
}
const wrangler = fs.readFileSync('wrangler.toml','utf8');
for (const needle of [
  'pages_build_output_dir = "./public"',
  '1b2c5789-288b-4741-b26a-41e7df08ddc3',
  '44f6968fcb75493e9e7d5bbdacabf760',
  'binding = "SYSTEME_DB"',
  'binding = "SYSTEME_KV"'
]) {
  if (!wrangler.includes(needle)) { console.error('WRANGLER_CONFIG_MISSING', needle); failed = true; }
}
const api = fs.readFileSync('functions/api/[[path]].js','utf8');
for (const needle of ['installInitialSchema', 'databaseSchemaState', 'INITIAL_SCHEMA_SQL']) {
  if (!api.includes(needle)) { console.error('FIRST_RUN_INIT_MISSING', needle); failed = true; }
}
if (failed) process.exit(1);
console.log('MSWS v1.2 source check: OK');
