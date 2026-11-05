import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

// 1. Users & Authentication
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").default("").notNull(),
  role: text("role", { enum: ["admin", "staff"] })
    .default("staff")
    .notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  mustChangePassword: boolean("must_change_password").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. Parties (Farmers & Clients)
export const parties = pgTable("parties", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: text("type", { enum: ["farmer", "client", "both"] }).notNull(),
  name: text("name").notNull(),
  phone: text("phone").default(""),
  village: text("village").default(""),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 3. Products (Commodities)
export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").unique().notNull(),
  nameMr: text("name_mr").notNull(),
  nameEn: text("name_en").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 4. Bills (Purchase & Sale Mandi Invoices)
export const bills = pgTable("bills", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: text("kind", { enum: ["purchase", "sale"] }).notNull(),
  billNo: text("bill_no").notNull(),
  billDate: text("bill_date").notNull(), // 'YYYY-MM-DD'
  partyId: uuid("party_id").references(() => parties.id),
  partyName: text("party_name").notNull(),
  partyPhone: text("party_phone").default(""),
  partyVillage: text("party_village").default(""),
  hamali: numeric("hamali", { precision: 14, scale: 2 }).default("0").notNull(),
  paidNow: numeric("paid_now", { precision: 14, scale: 2 }).default("0").notNull(),
  note: text("note").default(""),
  createdBy: uuid("created_by").references(() => users.id),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: uuid("deleted_by").references(() => users.id),
  deleteReason: text("delete_reason").default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 5. Bill Items (Crop rows)
export const billItems = pgTable("bill_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  billId: uuid("bill_id")
    .references(() => bills.id, { onDelete: "cascade" })
    .notNull(),
  productId: uuid("product_id").references(() => products.id),
  productName: text("product_name").notNull(),
  grade: text("grade").default(""),
  bagWeights: jsonb("bag_weights").default([]).notNull(), // number[]
  cutKg: numeric("cut_kg", { precision: 12, scale: 3 }).default("0").notNull(),
  netKg: numeric("net_kg", { precision: 12, scale: 3 }).default("0").notNull(),
  ratePerKg: numeric("rate_per_kg", { precision: 14, scale: 2 }).default("0").notNull(),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 6. Payments
export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  partyId: uuid("party_id").references(() => parties.id),
  billId: uuid("bill_id").references(() => bills.id, { onDelete: "set null" }),
  partyName: text("party_name").notNull(),
  paymentDate: text("payment_date").notNull(), // 'YYYY-MM-DD'
  partyType: text("party_type", { enum: ["farmer", "client"] }).notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  kind: text("kind", { enum: ["payment", "advance"] }).notNull(),
  // direction: OUT = we paid to farmer; IN = we received from client
  direction: text("direction", { enum: ["IN", "OUT"] }).default("OUT").notNull(),
  mode: text("mode", { enum: ["cash", "upi", "bank", "cheque"] }).default("cash").notNull(),
  referenceNo: text("reference_no").default(""),        // UPI txn ID / cheque no
  voucherNo: text("voucher_no").default(""),            // PV-0001 / RC-0001
  handledBy: text("handled_by").default(""),            // who physically handled money
  paidByName: text("paid_by_name").default(""),         // driver / relative who gave/received
  timingTag: text("timing_tag", { enum: ["with_bill", "later", "advance"] }).default("with_bill").notNull(),
  note: text("note").default(""),
  createdBy: uuid("created_by").references(() => users.id),
  recordedBy: uuid("recorded_by").references(() => users.id), // logged-in user who entered this
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: uuid("deleted_by").references(() => users.id),
  deleteReason: text("delete_reason").default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 7. Calls (Call Register & Reminders)
export const calls = pgTable("calls", {
  id: uuid("id").defaultRandom().primaryKey(),
  partyId: uuid("party_id").references(() => parties.id),
  callerName: text("caller_name").notNull(),
  phone: text("phone").default(""),
  product: text("product").default(""),
  quantityKg: numeric("quantity_kg", { precision: 12, scale: 3 }).default("0"),
  location: text("location").default(""),
  followUpDate: text("follow_up_date").default(""),
  status: text("status", { enum: ["pending", "completed"] }).default("pending").notNull(),
  notes: text("notes").default(""),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: uuid("deleted_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 8. Enquiries (Public website contact)
export const enquiries = pgTable("enquiries", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  product: text("product").notNull(),
  message: text("message").default(""),
  status: text("status", { enum: ["new", "contacted", "closed"] }).default("new").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 9. Settings
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 10. Audit Log
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  userEmail: text("user_email").default(""),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").default(""),
  details: jsonb("details").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 11. Payment Allocations (Bill-wise payment FIFO tracking)
export const paymentAllocations = pgTable("payment_allocations", {
  id: uuid("id").defaultRandom().primaryKey(),
  paymentId: uuid("payment_id")
    .references(() => payments.id, { onDelete: "cascade" })
    .notNull(),
  billId: uuid("bill_id")
    .references(() => bills.id, { onDelete: "cascade" })
    .notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 12. Bill Shares (Secure public read-only bill links)
export const billShares = pgTable("bill_shares", {
  id: uuid("id").defaultRandom().primaryKey(),
  billId: uuid("bill_id")
    .references(() => bills.id, { onDelete: "cascade" })
    .notNull(),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 13. Counters (Race-safe sequence numbers for vouchers, bills etc.)
export const counters = pgTable("counters", {
  key: text("key").primaryKey(),
  nextVal: integer("next_val").default(1).notNull(),
});

// 14. Stock Adjustments (Wastage, moisture loss, correction, opening stock)
export const stockAdjustments = pgTable("stock_adjustments", {
  id: uuid("id").defaultRandom().primaryKey(),
  product: text("product").notNull(),
  date: text("date").notNull(), // 'YYYY-MM-DD'
  kgChange: numeric("kg_change", { precision: 12, scale: 3 }).notNull(),
  reason: text("reason", { enum: ["wastage", "moisture_loss", "correction", "opening_stock"] }).notNull(),
  note: text("note").default(""),
  createdBy: uuid("created_by").references(() => users.id),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});


