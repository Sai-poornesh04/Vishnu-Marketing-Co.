const db = require("../Config/db");

const getCustomerById = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM sp_getCustomerById($1)`,
      [req.params.id]
    );

    if (!result.rows.length) return res.status(404).json(null);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("CUSTOMER FETCH ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

const getAllCustomers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM sp_customers($1,NULL,NULL)`,
      ["GET_ALL"]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("CUSTOMER LIST ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

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

    const updated = result.rows[0];

    res.json({
      id: updated.id,
      customerName: updated.customername,
      customerAddress: updated.customeraddress,
    });
  } catch (err) {
    console.error("UPDATE CUSTOMER ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllCustomers,
  updateCustomer
};