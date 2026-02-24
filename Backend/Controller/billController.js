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

const toNumOrZero = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const cleanItems = (items) => {
  const arr = Array.isArray(items) ? items : [];
  return arr
    .map((it) => ({
      name: String(it?.name ?? "").trim(),
      qty: String(it?.qty ?? "").trim(),
      price: String(it?.price ?? "").trim(),
    }))
    .filter((it) => it.name || it.qty || it.price);
};

const calcTotalAmount = (items) =>
  items.reduce((sum, it) => {
    return sum + toNumOrZero(it.qty) * toNumOrZero(it.price);
  }, 0);

// 🔥 Normalize DB → API format
const mapBill = (b) => ({
  id: b.id,
  billNo: b.billno,
  billDate: b.billdate,
  customerId: b.customerid,
  customerName: b.customername,
  customerAddress: b.customeraddress,
  totalAmount: b.totalamount,
  billTable: safeJson(b.billtable, []),
  createdAt: b.createdat
});

// -------------------- Bills --------------------

const saveBill = async (req, res) => {
  try {
    const {
      billNo,
      billDate,
      date,
      customerId,
      customerName,
      customerAddress,
      totalAmount,
      items,
    } = req.body;

    const itemsClean = cleanItems(items);
    const total =
      totalAmount != null
        ? toNumOrZero(totalAmount)
        : calcTotalAmount(itemsClean);

    const result = await db.query(
  `SELECT * FROM sp_bills(
    $1,$2,$3,$4,$5,$6,$7,$8,$9,
    $10,$11,$12,$13,$14
  )`,
  [
    "INSERT",                    // $1
    null,                        // $2 (id)
    billNo,                      // $3
    toSqlDate(billDate ?? date), // $4
    Number(customerId),          // $5
    customerName,                // $6
    customerAddress,             // $7
    total,                       // $8
    JSON.stringify(itemsClean),  // $9 (jsonb)
    null,                        // $10 searchBillNo
    null,                        // $11 searchCustomerName
    null,                        // $12 searchCustomerId
    null,                        // $13 searchFromDate
    null                         // $14 searchToDate
  ]
);

    res.json({
      message: "Bill saved successfully",
      id: result.rows[0]?.id ?? null,
    });
  } catch (err) {
    console.error("INSERT ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

const updateBill = async (req, res) => {
  try {
    const id = toIntOrNull(req.params.id);

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
        toNumOrZero(req.body.totalAmount),
        JSON.stringify(req.body.items || []),
      ]
    );

    res.json({ message: "Bill updated successfully" });
  } catch (err) {
    console.error("UPDATE ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

const getBillById = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM sp_bills(
        $1,$2,NULL,NULL,NULL,NULL,NULL,NULL,NULL,
        NULL,NULL,NULL,NULL,NULL
      )`,
      ["GET_BY_ID", toIntOrNull(req.params.id)]
    );

    if (!result.rows.length)
      return res.status(404).json({ message: "Bill not found" });

    res.json(mapBill(result.rows[0]));
  } catch (err) {
    console.error("GET_BY_ID ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

const getAllBills = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM sp_bills(
        $1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,
        NULL,NULL,NULL,NULL,NULL
      )`,
      ["GET_ALL"]
    );

    res.json(result.rows.map(mapBill));
  } catch (err) {
    console.error("GET_ALL ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

const searchBills = async (req, res) => {
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
        req.query.fromDate || null,
        req.query.toDate || null,
      ]
    );

    res.json(result.rows.map(mapBill));
  } catch (err) {
    console.error("SEARCH ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

const deleteBill = async (req, res) => {
  try {
    await db.query(
      `SELECT * FROM sp_bills(
        $1,$2,NULL,NULL,NULL,NULL,NULL,NULL,NULL,
        NULL,NULL,NULL,NULL,NULL
      )`,
      ["DELETE", toIntOrNull(req.params.id)]
    );

    res.json({ message: "Bill deleted successfully" });
  } catch (err) {
    console.error("DELETE ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM sp_getCustomerById($1)`,
      [req.params.id]
    );

    if (!result.rows.length) return res.status(404).json(null);

    const c = result.rows[0];

    res.json({
      id: c.id,
      customerName: c.customername,
      customerAddress: c.customeraddress
    });
  } catch (err) {
    console.error("CUSTOMER FETCH ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  saveBill,
  updateBill,
  getBillById,
  getAllBills,
  searchBills,
  deleteBill,
  getCustomerById
};