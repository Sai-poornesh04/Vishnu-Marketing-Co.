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

const getAllSavedBills = (req, res) => {
  const sql = `
    CALL sp_bills(
      'GET_ALL', NULL,
      NULL, NULL, NULL, NULL, NULL, NULL, NULL,
      NULL, NULL, NULL, NULL, NULL
    )
  `;
  db.query(sql, (err, result) => {
    if (err) {
      console.error("GET_ALL ERROR 👉", err);
      return res.status(500).json({ error: err.sqlMessage || err.message });
    }
    const rows = result?.[0] || [];
    res.json(rows.map((b) => ({ ...b, billTable: safeJson(b.billTable, []) })));
  });
};

const getSavedBillById = (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ message: "Invalid id" });

  const sql = `
    CALL sp_bills(
      'GET_BY_ID', ?,
      NULL, NULL, NULL, NULL, NULL, NULL, NULL,
      NULL, NULL, NULL, NULL, NULL
    )
  `;
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("GET_BY_ID ERROR 👉", err);
      return res.status(500).json({ error: err.sqlMessage || err.message });
    }
    const bill = result?.[0]?.[0];
    if (!bill) return res.status(404).json({ message: "Bill not found" });
    bill.billTable = safeJson(bill.billTable, []);
    res.json(bill);
  });
};

const searchSavedBills = (req, res) => {
  const billNo      = (req.query.billNo      ?? "").trim() || null;
  const customerName = (req.query.customerName ?? "").trim() || null;
  const customerId  = req.query.customerId ? parseInt(req.query.customerId, 10) : null;
  const billDate    = req.query.billDate ? toMysqlDate(req.query.billDate) : null;
  const fromDate    = req.query.fromDate ? toMysqlDate(req.query.fromDate) : null;
  const toDate      = req.query.toDate   ? toMysqlDate(req.query.toDate)   : null;

  const sql = `
    CALL sp_bills(
      'SEARCH', NULL,
      NULL, NULL, NULL, NULL, NULL, NULL, NULL,
      ?, ?, ?, ?, ?
    )
  `;
  db.query(
    sql,
    [billNo, customerName, customerId, billDate || fromDate, billDate || toDate],
    (err, result) => {
      if (err) {
        console.error("SEARCH ERROR 👉", err);
        return res.status(500).json({ error: err.sqlMessage || err.message });
      }
      const rows = result?.[0] || [];
      res.json(rows.map((b) => ({ ...b, billTable: safeJson(b.billTable, []) })));
    }
  );
};

const deleteSavedBill = (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ message: "Invalid id" });

  const sql = `
    CALL sp_bills(
      'DELETE', ?,
      NULL, NULL, NULL, NULL, NULL, NULL, NULL,
      NULL, NULL, NULL, NULL, NULL
    )
  `;
  db.query(sql, [id], (err) => {
    if (err) {
      console.error("DELETE ERROR 👉", err);
      return res.status(500).json({ error: err.sqlMessage || err.message });
    }
    res.json({ message: "Saved bill deleted successfully" });
  });
};

const getAllCustomers = (req, res) => {
  const sql = `
    SELECT id, customerName, customerAddress
    FROM customers
    WHERE flag = 1
    ORDER BY id ASC
  `;
  db.query(sql, (err, result) => {
    if (err) {
      console.error("GET_ALL_CUSTOMERS ERROR 👉", err);
      return res.status(500).json({ error: err.sqlMessage || err.message });
    }
    res.json(Array.isArray(result) ? result : []);
  });
};


// controllers/savedBillsController.js
const updateSavedBill = (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ message: "Invalid id" });

  const billNo = (req.body.billNo ?? "").trim() || null;
  const billDate = req.body.billDate ? toMysqlDate(req.body.billDate) : null;
  const customerId = req.body.customerId ? parseInt(req.body.customerId, 10) : null;
  const customerName = (req.body.customerName ?? "").trim() || null;
  const customerAddress = (req.body.customerAddress ?? "").trim() || null;

  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const totalAmount = Number(req.body.totalAmount ?? 0);

  const billTableJson = JSON.stringify(items);

  const sql = `
    CALL sp_bills(
      'UPDATE', ?,
      ?, ?, ?, ?, ?, ?, ?,
      NULL, NULL, NULL, NULL, NULL
    )
  `;

  db.query(
    sql,
    [
      id,
      billNo,
      billDate,
      customerId,
      customerName,
      customerAddress,
      totalAmount,
      billTableJson
    ],
    (err) => {
      if (err) {
        console.error("UPDATE ERROR 👉", err);
        return res.status(500).json({ error: err.sqlMessage || err.message });
      }
      res.json({ message: "Saved bill updated successfully" });
    }
  );
};

module.exports = {
  getAllSavedBills,
  getSavedBillById,
  searchSavedBills,
  deleteSavedBill,
  getAllCustomers,
  updateSavedBill,
};