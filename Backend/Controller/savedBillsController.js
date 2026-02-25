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

// -------------------- GET ALL --------------------

const getAllSavedBills = async (req, res) => {
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

    res.json(mapBill(result.rows[0]));
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

    res.json(result.rows.map(mapBill));
  } catch (err) {
    console.error("SEARCH ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------- DELETE --------------------

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

    res.json(
      result.rows.map(c => ({
        id: c.id,
        customerName: c.customername,
        customerAddress: c.customeraddress,
        createdAt: c.createdat
      }))
    );
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

    const custId = toIntOrNull(req.body.customerId);
    const sqlDate = toSqlDate(req.body.billDate);
    const itemsJson = JSON.stringify(req.body.items || []);
    const totalAmt = Number(req.body.totalAmount ?? 0);

    // Logging the data so you can see exactly what is being sent to DB
    console.log(`Attempting to UPDATE Bill ID: ${id}`);
    console.log(`Payload: No:${req.body.billNo}, Date:${sqlDate}, Cust:${custId}, Amt:${totalAmt}`);

    // We explicitly bind all 14 parameters. 
    // We also cast $9 to ::jsonb just in case your DB strictly requires it.
    await db.query(
      `SELECT * FROM sp_bills(
        $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, 
        $10, $11, $12, $13, $14
      )`,
      [
        "UPDATE",                  // $1
        id,                        // $2
        req.body.billNo,           // $3
        sqlDate,                   // $4
        custId,                    // $5
        req.body.customerName,     // $6
        req.body.customerAddress,  // $7
        totalAmt,                  // $8
        itemsJson,                 // $9
        null,                      // $10 (search bill no)
        null,                      // $11 (search cust name)
        null,                      // $12 (search cust id)
        null,                      // $13 (search from date)
        null                       // $14 (search to date)
      ]
    );

    console.log(`✅ Successfully updated Bill ID: ${id}`);
    res.json({ message: "Saved bill updated successfully" });

  } catch (err) {
    // This will print the EXACT database error in your VS Code terminal
    console.error("❌ UPDATE ERROR 👉", err.message);
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