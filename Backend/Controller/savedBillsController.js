const db = require("../Config/db");

// -------------------- Helpers --------------------

const safeJson = (v, fallback) => {
  try {
    if (!v) return fallback;
    return typeof v === "string" ? JSON.parse(v) : v;
  } catch {
    return fallback;
  }
};

const toSqlDate = (v) => {
  const s = String(v || "").trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split("-");
    return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }

  return s;
};

const toIntOrNull = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
};

// -------------------- GET ALL SAVED BILLS --------------------

const getAllSavedBills = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM sp_bills(
        $1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,
        NULL,NULL,NULL,NULL,NULL
      )`,
      ["GET_ALL"]
    );

    res.json(
      result.rows.map((b) => ({
        ...b,
        billtable: safeJson(b.billtable, []),
      }))
    );
  } catch (err) {
    console.error("GET_ALL ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------- GET BY ID --------------------

const getSavedBillById = async (req, res) => {
  try {
    const id = toIntOrNull(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const result = await db.query(
      `SELECT * FROM sp_bills(
        $1,$2,NULL,NULL,NULL,NULL,NULL,NULL,NULL,
        NULL,NULL,NULL,NULL,NULL
      )`,
      ["GET_BY_ID", id]
    );

    if (!result.rows.length)
      return res.status(404).json({ message: "Bill not found" });

    const bill = result.rows[0];
    bill.billtable = safeJson(bill.billtable, []);

    res.json(bill);
  } catch (err) {
    console.error("GET_BY_ID ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------- SEARCH --------------------

const searchSavedBills = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM sp_bills(
        $1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,
        $2,$3,$4,$5,$6
      )`,
      [
        "SEARCH",
        req.query.billNo || null,
        req.query.customerName || null,
        req.query.customerId ? Number(req.query.customerId) : null,
        req.query.fromDate ? toSqlDate(req.query.fromDate) : null,
        req.query.toDate ? toSqlDate(req.query.toDate) : null,
      ]
    );

    res.json(
      result.rows.map((b) => ({
        ...b,
        billtable: safeJson(b.billtable, []),
      }))
    );
  } catch (err) {
    console.error("SEARCH ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------- DELETE (Soft Delete) --------------------

const deleteSavedBill = async (req, res) => {
  try {
    const id = toIntOrNull(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    await db.query(
      `SELECT * FROM sp_bills(
        $1,$2,NULL,NULL,NULL,NULL,NULL,NULL,NULL,
        NULL,NULL,NULL,NULL,NULL
      )`,
      ["DELETE", id]
    );

    res.json({ message: "Saved bill deleted successfully" });
  } catch (err) {
    console.error("DELETE ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------- GET ALL CUSTOMERS --------------------

const getAllCustomers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM sp_customers($1,NULL,NULL)`,
      ["GET_ALL"]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET_ALL_CUSTOMERS ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------- UPDATE SAVED BILL --------------------

const updateSavedBill = async (req, res) => {
  try {
    const id = toIntOrNull(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    await db.query(
      `SELECT * FROM sp_bills(
        $1,$2,$3,$4,$5,$6,$7,$8,
        NULL,NULL,NULL,NULL,NULL
      )`,
      [
        "UPDATE",
        id,
        req.body.billNo,
        toSqlDate(req.body.billDate),
        req.body.customerId,
        req.body.customerName,
        req.body.customerAddress,
        Number(req.body.totalAmount ?? 0),
        JSON.stringify(req.body.items || []),
      ]
    );

    res.json({ message: "Saved bill updated successfully" });
  } catch (err) {
    console.error("UPDATE ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllSavedBills,
  getSavedBillById,
  searchSavedBills,
  deleteSavedBill,
  getAllCustomers,
  updateSavedBill,
};