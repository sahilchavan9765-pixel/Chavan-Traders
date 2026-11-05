import { PGlite } from '@electric-sql/pglite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', '.pgdata');

async function run() {
  const pg = new PGlite(dataDir);
  
  // Get payments columns
  const cols = await pg.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'payments' ORDER BY ordinal_position"
  );
  console.log('\n=== payments columns ===');
  cols.rows.forEach(r => console.log(' -', r.column_name, ':', r.data_type));
  
  // Get bills columns
  const billCols = await pg.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'bills' ORDER BY ordinal_position"
  );
  console.log('\n=== bills columns ===');
  billCols.rows.forEach(r => console.log(' -', r.column_name));
  
  // Row counts
  const tables = ['users','parties','bills','bill_items','payments','payment_allocations','settings','stock_adjustments','calls','enquiries'];
  console.log('\n=== row counts ===');
  for (const t of tables) {
    try {
      const r = await pg.query('SELECT COUNT(*) as n FROM ' + t);
      console.log(' ', t + ':', r.rows[0].n);
    } catch(e) {
      console.log(' ', t + ': MISSING -', e.message.slice(0, 60));
    }
  }
  
  // Show all payments
  try {
    const pmts = await pg.query('SELECT id, party_name, amount, mode, payment_date FROM payments WHERE deleted_at IS NULL ORDER BY payment_date');
    console.log('\n=== active payments ===');
    pmts.rows.forEach(r => console.log(' ', JSON.stringify(r)));
  } catch(e) {
    console.log('\npayments query failed:', e.message);
  }
  
  await pg.close();
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });

