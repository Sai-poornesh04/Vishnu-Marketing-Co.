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

// Normalize DB → API format
const mapBill = (b) => ({
  id: b.id,
  billNo: b.billno,
  billDate: b.billdate,
  customerId: b.customerid,
  customerName: b.customername,
  customerAddress: b.customeraddress,
  totalAmount: b.totalamount,
  billTable: safeJson(b.billtable, []),
  createdAt: b.createdat,
});

// -------------------- SAVE --------------------

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
        "INSERT",
        null,
        billNo,
        toSqlDate(billDate ?? date),
        Number(customerId),
        customerName,
        customerAddress,
        total,
        JSON.stringify(itemsClean),
        null,
        null,
        null,
        null,
        null,
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

// -------------------- UPDATE --------------------

const updateBill = async (req, res) => {
  try {
    const id = toIntOrNull(req.params.id);

    await db.query(
      `SELECT * FROM sp_bills(
        $1,$2,$3,$4,$5,$6,$7,$8,$9,
        $10,$11,$12,$13,$14
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
        null,
        null,
        null,
        null,
        null,
      ]
    );

    res.json({ message: "Bill updated successfully" });
  } catch (err) {
    console.error("UPDATE ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------- GET BY ID --------------------

const getBillById = async (req, res) => {
  try {
    const id = toIntOrNull(req.params.id);

    const result = await db.query(
      `SELECT * FROM sp_bills(
        $1,$2,$3,$4,$5,$6,$7,$8,$9,
        $10,$11,$12,$13,$14
      )`,
      [
        "GET_BY_ID",
        id,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ]
    );

    if (!result.rows.length)
      return res.status(404).json({ message: "Bill not found" });

    res.json(mapBill(result.rows[0]));
  } catch (err) {
    console.error("GET_BY_ID ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------- GET ALL --------------------

const getAllBills = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM sp_bills(
        $1,$2,$3,$4,$5,$6,$7,$8,$9,
        $10,$11,$12,$13,$14
      )`,
      [
        "GET_ALL",
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ]
    );

    res.json(result.rows.map(mapBill));
  } catch (err) {
    console.error("GET_ALL ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------- SEARCH --------------------

const searchBills = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM sp_bills(
        $1,$2,$3,$4,$5,$6,$7,$8,$9,
        $10,$11,$12,$13,$14
      )`,
      [
        "SEARCH",
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        req.query.billNo || null,
        req.query.customerName || null,
        req.query.customerId ? Number(req.query.customerId) : null,
        req.query.fromDate ? toSqlDate(req.query.fromDate) : null,
        req.query.toDate ? toSqlDate(req.query.toDate) : null,
      ]
    );

    res.json(result.rows.map(mapBill));
  } catch (err) {
    console.error("SEARCH ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------- DELETE --------------------

const deleteBill = async (req, res) => {
  try {
    const id = toIntOrNull(req.params.id);

    await db.query(
      `SELECT * FROM sp_bills(
        $1,$2,$3,$4,$5,$6,$7,$8,$9,
        $10,$11,$12,$13,$14
      )`,
      [
        "DELETE",
        id,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ]
    );

    res.json({ message: "Bill deleted successfully" });
  } catch (err) {
    console.error("DELETE ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------- CUSTOMER BY ID --------------------

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
      customerAddress: c.customeraddress,
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
  getCustomerById,
};