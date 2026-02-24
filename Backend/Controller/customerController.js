const db = require("../Config/db");

// -------------------- Helpers --------------------

const toIntOrNull = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
};

const mapCustomer = (c) => ({
  id: c.id,
  customerName: c.customername,
  customerAddress: c.customeraddress,
  createdAt: c.createdat
});

// -------------------- GET BY ID --------------------

const getCustomerById = async (req, res) => {
  try {
    const id = toIntOrNull(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid customer id" });

    const result = await db.query(
      `SELECT * FROM sp_getCustomerById($1)`,
      [id]
    );

    if (!result.rows.length)
      return res.status(404).json(null);

    res.json(mapCustomer(result.rows[0]));
  } catch (err) {
    console.error("CUSTOMER FETCH ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------- GET ALL --------------------

const getAllCustomers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM sp_customers($1,$2,$3)`,
      ["GET_ALL"]
    );

    res.json(result.rows.map(mapCustomer));
  } catch (err) {
    console.error("CUSTOMER LIST ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------- UPDATE --------------------

const updateCustomer = async (req, res) => {
  try {
    const idNum = toIntOrNull(req.params.id);
    if (!idNum)
      return res.status(400).json({ message: "Invalid customer id" });

    const customerName = String(req.body.customerName ?? "").trim();
    const customerAddress = String(req.body.customerAddress ?? "").trim();

    const result = await db.query(
      `SELECT * FROM sp_customers($1,$2,$3)`,
      ["UPDATE", idNum, customerName, customerAddress]
    );

    if (!result.rows.length)
      return res.status(404).json({ message: "Customer not found" });

    res.json(mapCustomer(result.rows[0]));
  } catch (err) {
    console.error("UPDATE CUSTOMER ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getCustomerById,
  getAllCustomers,
  updateCustomer
};