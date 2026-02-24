const db = require("../Config/db");

/* ===== GET ALL ===== */
const getAllCustomers = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, customername, customeraddress
       FROM customers
       WHERE flag = 1
       ORDER BY id ASC`
    );

    res.json(rows);
  } catch (err) {
    console.error("GET ALL CUSTOMERS ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

/* ===== GET BY ID ===== */
const getCustomerById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const { rows } = await db.query(
      `SELECT id, customername, customeraddress
       FROM customers
       WHERE id = $1 AND flag = 1`,
      [id]
    );

    if (!rows.length)
      return res.status(404).json({ message: "Customer not found" });

    res.json(rows[0]);
  } catch (err) {
    console.error("GET CUSTOMER ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

/* ===== UPDATE ===== */
const updateCustomer = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const { customerName, customerAddress } = req.body;

    const { rows } = await db.query(
      `UPDATE customers
       SET customername = $1,
           customeraddress = $2
       WHERE id = $3
       RETURNING id, customername, customeraddress`,
      [customerName, customerAddress, id]
    );

    if (!rows.length)
      return res.status(404).json({ message: "Customer not found" });

    res.json(rows[0]);
  } catch (err) {
    console.error("UPDATE CUSTOMER ERROR 👉", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  updateCustomer
};