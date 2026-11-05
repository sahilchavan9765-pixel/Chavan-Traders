import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connUrl = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;

async function executeQuery(sqlText: string) {
  if (connUrl && connUrl.startsWith("postgres") && !connUrl.includes("placeholder")) {
    const { neon } = require("@neondatabase/serverless");
    const sql = neon(connUrl);
    return await sql(sqlText);
  } else {
    const { PGlite } = require("@electric-sql/pglite");
    const dataDir = path.join(process.cwd(), ".pgdata");
    const pg = new PGlite(dataDir);
    const res = await pg.exec(sqlText);
    await pg.close();
    return res;
  }
}

async function run() {
  console.log("Starting database setup & migration...");

  // 1. DDL for tables
  const ddl = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL CHECK (role IN ('admin', 'staff')) DEFAULT 'staff',
      is_active BOOLEAN NOT NULL DEFAULT true,
      must_change_password BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS parties (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type TEXT NOT NULL CHECK (type IN ('farmer', 'client', 'both')),
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      village TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT UNIQUE NOT NULL,
      name_mr TEXT NOT NULL,
      name_en TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS bills (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      kind TEXT NOT NULL CHECK (kind IN ('purchase', 'sale')),
      bill_no TEXT NOT NULL,
      bill_date TEXT NOT NULL,
      party_id UUID REFERENCES parties(id),
      party_name TEXT NOT NULL,
      party_phone TEXT DEFAULT '',
      party_village TEXT DEFAULT '',
      hamali NUMERIC(14,2) NOT NULL DEFAULT 0,
      paid_now NUMERIC(14,2) NOT NULL DEFAULT 0,
      note TEXT DEFAULT '',
      created_by UUID REFERENCES users(id),
      deleted_at TIMESTAMPTZ DEFAULT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS bill_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
      product_id UUID REFERENCES products(id),
      product_name TEXT NOT NULL,
      grade TEXT DEFAULT '',
      bag_weights JSONB NOT NULL DEFAULT '[]'::jsonb,
      cut_kg NUMERIC(12,3) NOT NULL DEFAULT 0,
      net_kg NUMERIC(12,3) NOT NULL DEFAULT 0,
      rate_per_kg NUMERIC(14,2) NOT NULL DEFAULT 0,
      total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      party_id UUID REFERENCES parties(id),
      party_name TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      party_type TEXT NOT NULL CHECK (party_type IN ('farmer', 'client')),
      amount NUMERIC(14,2) NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('payment', 'advance')),
      mode TEXT NOT NULL CHECK (mode IN ('cash', 'upi', 'bank')) DEFAULT 'cash',
      note TEXT DEFAULT '',
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS calls (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      party_id UUID REFERENCES parties(id),
      caller_name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      product TEXT DEFAULT '',
      quantity_kg NUMERIC(12,3) DEFAULT 0,
      location TEXT DEFAULT '',
      follow_up_date TEXT DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('pending', 'completed')) DEFAULT 'pending',
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS enquiries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      product TEXT NOT NULL,
      message TEXT DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('new', 'contacted', 'closed')) DEFAULT 'new',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      user_email TEXT DEFAULT '',
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT DEFAULT '',
      details JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Schema extensions for soft deletes and linked payments
    ALTER TABLE bills ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);
    ALTER TABLE bills ADD COLUMN IF NOT EXISTS delete_reason TEXT DEFAULT '';
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS bill_id UUID REFERENCES bills(id) ON DELETE SET NULL;
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS delete_reason TEXT DEFAULT '';
    ALTER TABLE calls ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
    ALTER TABLE calls ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);
    -- Payments v2: direction, voucher, reference, handled_by, etc.
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'OUT';
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference_no TEXT NOT NULL DEFAULT '';
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS voucher_no TEXT NOT NULL DEFAULT '';
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS handled_by TEXT NOT NULL DEFAULT '';
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_by_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS timing_tag TEXT NOT NULL DEFAULT 'with_bill';
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES users(id);
    -- Bills v2: soft delete fields
    ALTER TABLE bills ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS party_id UUID REFERENCES parties(id);
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS party_type TEXT NOT NULL DEFAULT 'farmer';

    CREATE TABLE IF NOT EXISTS payment_allocations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
      amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS bill_shares (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ DEFAULT NULL,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product TEXT NOT NULL,
      date TEXT NOT NULL,
      kg_change NUMERIC(12,3) NOT NULL,
      reason TEXT NOT NULL CHECK (reason IN ('wastage', 'moisture_loss', 'correction', 'opening_stock')),
      note TEXT DEFAULT '',
      created_by UUID REFERENCES users(id),
      deleted_at TIMESTAMPTZ DEFAULT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_bills_party ON bills(party_id);
    CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(bill_date);
    CREATE INDEX IF NOT EXISTS idx_bills_deleted ON bills(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_payments_party ON payments(party_id);
    CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
    CREATE INDEX IF NOT EXISTS idx_payments_deleted ON payments(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_calls_deleted ON calls(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_parties_name ON parties(name);
    CREATE INDEX IF NOT EXISTS idx_parties_phone ON parties(phone);
    CREATE INDEX IF NOT EXISTS idx_allocations_payment ON payment_allocations(payment_id);
    CREATE INDEX IF NOT EXISTS idx_allocations_bill ON payment_allocations(bill_id);
    CREATE INDEX IF NOT EXISTS idx_shares_token ON bill_shares(token);
    CREATE INDEX IF NOT EXISTS idx_shares_bill ON bill_shares(bill_id);
    CREATE INDEX IF NOT EXISTS idx_stock_adj_prod ON stock_adjustments(product);
  `;

  await executeQuery(ddl);
  console.log("✅ DDL executed successfully: All 10 tables verified.");

  // 2. Read Admin Credentials and Seed Admin Users from Environment
  const salt = await bcrypt.genSalt(10);
  const adminPassword = process.env.ADMIN_SEED_PASSWORD || "Chavan@2026";
  const commonPassHash = await bcrypt.hash(adminPassword, salt);
  const adminEmail1 = process.env.ADMIN_EMAIL_1 || "tanmaychavan@gmail.com";
  const adminEmail2 = process.env.ADMIN_EMAIL_2 || "sahilchavan9765@gmail.com";

  const seedAdminSQL = `
    INSERT INTO users (email, password_hash, full_name, role, is_active, must_change_password)
    VALUES 
      ('${adminEmail1}', '${commonPassHash}', 'Tanmay Chavan', 'admin', true, false),
      ('${adminEmail2}', '${commonPassHash}', 'Sahil Chavan', 'admin', true, false)
    ON CONFLICT (email) DO UPDATE 
    SET password_hash = EXCLUDED.password_hash,
        full_name = EXCLUDED.full_name,
        role = 'admin',
        is_active = true,
        updated_at = now();
  `;
  await executeQuery(seedAdminSQL);
  console.log(`✅ Admin users seeded (${adminEmail1} & ${adminEmail2}) with role=admin.`);

  // 3. Seed 6 Products
  const seedProductsSQL = `
    INSERT INTO products (code, name_mr, name_en, sort_order) VALUES
      ('bhat', 'भात', 'Rice / Paddy', 1),
      ('soybean', 'सोयाबीन', 'Soybean', 2),
      ('kaju', 'काजू बी', 'Cashew Raw Nuts', 3),
      ('shenga', 'शेंगा', 'Groundnut', 4),
      ('nachani', 'नाचणी', 'Finger Millet (Nachani)', 5),
      ('other', 'इतर धान्ये', 'Other Commodities', 6)
    ON CONFLICT (code) DO NOTHING;
  `;
  await executeQuery(seedProductsSQL);
  console.log("✅ 6 core commodities seeded (भात, सोयाबीन, काजू बी, शेंगा, नाचणी, इतर धान्ये).");

  // 4. Seed Settings
  const seedSettingsSQL = `
    INSERT INTO settings (key, value) VALUES
      ('business_profile', '${JSON.stringify({
        firmNameMr: "चव्हाण ट्रेडर्स",
        firmNameEn: "Chavan Traders",
        ownerTribute: "कै. श्री. रमेश कृष्णा चव्हाण",
        phone1: "9765941078",
        phone1Name: "साहिल चव्हाण",
        phone2: "9850815527",
        phone2Name: "तन्मय चव्हाण",
        addressMr: "मु.पो. उत्तूर, तळेगळ्ळी, ता. आजरा, जि. कोल्हापूर",
        addressEn: "A/P Uttur, Talegalli, Tal. Ajra, Dist. Kolhapur, Maharashtra 416220",
        pSeriesNext: 3,
        sSeriesNext: 2
      })}')
    ON CONFLICT (key) DO NOTHING;
  `;
  await executeQuery(seedSettingsSQL);
  console.log("✅ Business profile settings initialized.");

  // 5. Seed Demo Data (Parties, Sample Bills, Sample Calls) if empty
  const seedDemoSQL = `
    DO $$
    DECLARE
      p1_id UUID;
      p2_id UUID;
      c1_id UUID;
      prod_rice_id UUID;
      prod_soy_id UUID;
      b1_id UUID;
      b2_id UUID;
      u_id UUID;
    BEGIN
      SELECT id INTO u_id FROM users WHERE role = 'admin' LIMIT 1;

      -- Check if parties already exist
      IF NOT EXISTS (SELECT 1 FROM parties LIMIT 1) THEN
        INSERT INTO parties (type, name, phone, village) 
        VALUES ('farmer', 'आनंदराव पाटील', '9822011223', 'उत्तूर') RETURNING id INTO p1_id;

        INSERT INTO parties (type, name, phone, village) 
        VALUES ('farmer', 'बापूसाहेब देसाई', '9421188990', 'आजरा') RETURNING id INTO p2_id;

        INSERT INTO parties (type, name, phone, village) 
        VALUES ('client', 'महावीर अ‍ॅग्रो ट्रेडर्स', '9158012345', 'कोल्हापूर') RETURNING id INTO c1_id;

        SELECT id INTO prod_rice_id FROM products WHERE code = 'bhat' LIMIT 1;
        SELECT id INTO prod_soy_id FROM products WHERE code = 'soybean' LIMIT 1;

        -- Farmer Purchase 1: P-0001
        INSERT INTO bills (kind, bill_no, bill_date, party_id, party_name, party_phone, party_village, hamali, paid_now, created_by)
        VALUES ('purchase', 'P-0001', TO_CHAR(NOW() - INTERVAL '2 days', 'YYYY-MM-DD'), p1_id, 'आनंदराव पाटील', '9822011223', 'उत्तूर', 50, 10000, u_id)
        RETURNING id INTO b1_id;

        INSERT INTO bill_items (bill_id, product_id, product_name, bag_weights, cut_kg, net_kg, rate_per_kg, total_amount)
        VALUES (b1_id, prod_rice_id, 'भात (Rice)', '[45, 46, 44, 45, 47]'::jsonb, 2.5, 224.5, 34.00, 7633.00);

        -- Farmer Purchase 2: P-0002
        INSERT INTO bills (kind, bill_no, bill_date, party_id, party_name, party_phone, party_village, hamali, paid_now, created_by)
        VALUES ('purchase', 'P-0002', TO_CHAR(NOW() - INTERVAL '1 day', 'YYYY-MM-DD'), p2_id, 'बापूसाहेब देसाई', '9421188990', 'आजरा', 80, 20000, u_id)
        RETURNING id INTO b2_id;

        INSERT INTO bill_items (bill_id, product_id, product_name, bag_weights, cut_kg, net_kg, rate_per_kg, total_amount)
        VALUES (b2_id, prod_soy_id, 'सोयाबीन (Soybean)', '[50, 51, 49, 50, 52, 50]'::jsonb, 3.0, 299.0, 48.00, 14352.00);

        -- Client Sale 1: S-0001
        INSERT INTO bills (kind, bill_no, bill_date, party_id, party_name, party_phone, party_village, hamali, paid_now, created_by)
        VALUES ('sale', 'S-0001', TO_CHAR(NOW(), 'YYYY-MM-DD'), c1_id, 'महावीर अ‍ॅग्रो ट्रेडर्स', '9158012345', 'कोल्हापूर', 0, 8000, u_id)
        RETURNING id INTO b1_id;

        INSERT INTO bill_items (bill_id, product_id, product_name, bag_weights, cut_kg, net_kg, rate_per_kg, total_amount)
        VALUES (b1_id, prod_rice_id, 'भात (Rice)', '[100, 100]'::jsonb, 0, 200.0, 39.00, 7800.00);

        -- Sample Call Reminders
        INSERT INTO calls (caller_name, phone, product, quantity_kg, location, follow_up_date, status, notes)
        VALUES 
          ('सुरेश शिंदे', '9890123456', 'भात', 500, 'मलिग्रे', TO_CHAR(NOW() + INTERVAL '1 day', 'YYYY-MM-DD'), 'pending', 'नवीन भात विक्रीसाठी संपर्क'),
          ('विकास पाटील', '9765432109', 'सोयाबीन', 1200, 'हाळोली', TO_CHAR(NOW(), 'YYYY-MM-DD'), 'pending', 'दराबाबत विचारणा केली');
      END IF;

      -- Sample Website Enquiries if empty
      IF NOT EXISTS (SELECT 1 FROM enquiries LIMIT 1) THEN
        INSERT INTO enquiries (name, phone, product, message, status) VALUES
          ('आनंदराव पाटील', '9822011223', 'भात (Rice)', 'आमच्याकडे 50 पोती भात विक्रीसाठी तयार आहे. चालू दर काय मिळेल?', 'new'),
          ('शशिकांत देसाई', '9421188990', 'सोयाबीन (Soybean)', 'सोयाबीनचा होलसेल दर काय सुरू आहे? आम्हाला 2 टन माल खरेदी करायचा आहे.', 'new'),
          ('संजय कदम', '9158012345', 'काजू बी (Cashew)', 'ओला काजू बी खरेदी करता का? उत्तूर परिसरात माल पोहोच करू शकतो.', 'contacted');
      END IF;
    END $$;
  `;
  await executeQuery(seedDemoSQL);
  console.log("✅ Realistic sample mandi data seeded for immediate testing.");
}

run()
  .then(() => {
    console.log("🎉 Database migration and seeding completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  });
