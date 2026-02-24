const db = require("../Config/db");

exports.getAllCustomers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM sp_customers($1)`,
      ["GET_ALL"]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, customerAddress } = req.body;

    await db.query(
      `SELECT * FROM sp_customers($1,$2,$3,$4)`,
      ["UPDATE", id, customerName, customerAddress]
    );

    res.json({ message: "Updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};