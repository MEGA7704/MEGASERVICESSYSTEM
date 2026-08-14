import fs from 'node:fs';
const required = [
  'public/index.html', 'public/styles.css', 'public/app.js', 'public/_routes.json',
  'functions/api/[[path]].js', 'migrations/0001_initial.sql', 'wrangler.toml',
  '.github/workflows/deploy.yml'
];
let failed = false;
for (const f of required) {
  if (!fs.existsSync(f)) { console.error('MISSING', f); failed = true; }
}
const wrangler = fs.readFileSync('wrangler.toml','utf8');
for (const needle of ['1b2c5789-288b-4741-b26a-41e7df08ddc3','44f6968fcb75493e9e7d5bbdacabf760','binding = "SYSTEME_DB"','binding = "SYSTEME_KV"']) {
  if (!wrangler.includes(needle)) { console.error('WRANGLER_BINDING_MISSING', needle); failed = true; }
}
if (failed) process.exit(1);
console.log('MSWS source check: OK');
