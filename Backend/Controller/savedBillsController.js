const db = require("../Config/db");

const safeJson = (v, fallback) => {
  try {
    if (v == null) return fallback;
    if (typeof v === "string") return JSON.parse(v);
    return v;
  } catch {
    return fallback;
  }
};

const toMysqlDate = (v) => {
  const s = String(v || "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split("-");
    return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }
  return s;
};

/* ================= GET ALL ================= */

const getAllSavedBills = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM sp_bills(
        'GET_ALL',
        NULL,NULL,NULL,NULL,NULL,NULL,NULL,
        NULL,NULL,NULL,NULL,NULL
      )`
    );

    res.json(rows.map(b => ({
      ...b,
      billtable: safeJson(b.billtable, [])
    })));

  } catch (err) {
    console.error("GET_ALL ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

/* ================= GET BY ID ================= */

const getSavedBillById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const { rows } = await db.query(
      `SELECT * FROM sp_bills(
        'GET_BY_ID',
        $1,
        NULL,NULL,NULL,NULL,NULL,NULL,NULL,
        NULL,NULL,NULL,NULL,NULL
      )`,
      [id]
    );

    if (!rows.length)
      return res.status(404).json({ message: "Bill not found" });

    const bill = rows[0];
    bill.billtable = safeJson(bill.billtable, []);

    res.json(bill);

  } catch (err) {
    console.error("GET_BY_ID ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

/* ================= SEARCH ================= */

const searchSavedBills = async (req, res) => {
  try {
    const billNo = req.query.billNo || null;
    const customerName = req.query.customerName || null;
    const customerId = req.query.customerId
      ? parseInt(req.query.customerId, 10)
      : null;

    const fromDate = req.query.fromDate
      ? toMysqlDate(req.query.fromDate)
      : null;

    const toDate = req.query.toDate
      ? toMysqlDate(req.query.toDate)
      : null;

    const { rows } = await db.query(
      `SELECT * FROM sp_bills(
        'SEARCH',
        NULL,
        NULL,NULL,NULL,NULL,NULL,NULL,NULL,
        $1,$2,$3,$4,$5
      )`,
      [billNo, customerName, customerId, fromDate, toDate]
    );

    res.json(rows.map(b => ({
      ...b,
      billtable: safeJson(b.billtable, [])
    })));

  } catch (err) {
    console.error("SEARCH ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

/* ================= DELETE ================= */

const deleteSavedBill = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    await db.query(
      `SELECT * FROM sp_bills(
        'DELETE',
        $1,
        NULL,NULL,NULL,NULL,NULL,NULL,NULL,
        NULL,NULL,NULL,NULL,NULL
      )`,
      [id]
    );

    res.json({ message: "Saved bill deleted successfully" });

  } catch (err) {
    console.error("DELETE ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

/* ================= UPDATE ================= */

const updateSavedBill = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const {
      billNo,
      billDate,
      customerId,
      customerName,
      customerAddress,
      totalAmount,
      items
    } = req.body;

    const billTableJson = JSON.stringify(items || []);

    await db.query(
      `SELECT * FROM sp_bills(
        'UPDATE',
        $1,
        $2,$3,$4,$5,$6,$7,$8,
        NULL,NULL,NULL,NULL,NULL
      )`,
      [
        id,
        billNo,
        toMysqlDate(billDate),
        customerId,
        customerName,
        customerAddress,
        totalAmount,
        billTableJson
      ]
    );

    res.json({ message: "Saved bill updated successfully" });

  } catch (err) {
    console.error("UPDATE ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

/* ================= EXPORT ================= */

module.exports = {
  getAllSavedBills,
  getSavedBillById,
  searchSavedBills,
  deleteSavedBill,
  updateSavedBill
};