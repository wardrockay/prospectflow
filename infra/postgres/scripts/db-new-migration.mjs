import fs from 'node:fs';
import path from 'node:path';

function pad(n) {
  return String(n).padStart(2, '0');
}

function nowStamp() {
  const d = new Date();
  // Timestamp local machine: YYYYMMDD_HHMMSS
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
}

function slugify(s) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const [, , domain, ...rest] = process.argv;
const name = rest.join(' ').trim();

if (!domain || !name) {
  console.error('Usage: node scripts/db-new-migration.mjs <domain> <name>');
  console.error('Example: node scripts/db-new-migration.mjs crm "add department"');
  process.exit(1);
}

const stamp = nowStamp();
const filename = `V${stamp}__${slugify(domain)}_${slugify(name)}.sql`;

const migrationsDir = path.resolve(process.cwd(), 'db', 'migrations');
fs.mkdirSync(migrationsDir, { recursive: true });

const fullpath = path.join(migrationsDir, filename);

const template = `-- ${filename}
-- Domain: ${domain}
-- Purpose: ${name}

-- Write safe migrations:
-- 1) add nullable column
-- 2) backfill
-- 3) add NOT NULL / constraints in a later migration

`;

fs.writeFileSync(fullpath, template, { encoding: 'utf8', flag: 'wx' });

console.log(`Created: ${fullpath}`);
