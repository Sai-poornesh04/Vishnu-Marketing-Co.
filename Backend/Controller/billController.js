const db = require("../Config/db");

const safeJson = (v, fallback) => {
  try {
    if (!v) return fallback;
    if (typeof v === "string") return JSON.parse(v);
    return v;
  } catch {
    return fallback;
  }
};

const toIntOrNull = (v) => {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
};

// -------------------- SAVE BILL --------------------
exports.saveBill = async (req, res) => {
  try {
    const {
      billNo, billDate, customerId,
      customerName, customerAddress,
      totalAmount, items
    } = req.body;

    const result = await db.query(
      `SELECT * FROM sp_bills(
        $1,$2,$3,$4,$5,$6,$7,$8,$9,
        $10,$11,$12,$13,$14
      )`,
      [
        "INSERT",
        null,
        billNo,
        billDate,
        customerId,
        customerName,
        customerAddress,
        totalAmount,
        JSON.stringify(items),
        null,null,null,null,null
      ]
    );

    res.json({ message: "Bill saved", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------- GET ALL --------------------
exports.getAllBills = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM sp_bills($1)`,
      ["GET_ALL"]
    );

    res.json(
      result.rows.map(b => ({
        ...b,
        billtable: safeJson(b.billtable, [])
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -------------------- GET BY ID --------------------
exports.getBillById = async (req, res) => {
  try {
    const id = toIntOrNull(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const result = await db.query(
      `SELECT * FROM sp_bills($1,$2)`,
      ["GET_BY_ID", id]
    );

    if (!result.rows.length)
      return res.status(404).json({ message: "Not found" });

    const bill = result.rows[0];
    bill.billtable = safeJson(bill.billtable, []);
    res.json(bill);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -------------------- DELETE --------------------
exports.deleteBill = async (req, res) => {
  try {
    const id = toIntOrNull(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    await db.query(
      `SELECT * FROM sp_bills($1,$2)`,
      ["DELETE", id]
    );

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};