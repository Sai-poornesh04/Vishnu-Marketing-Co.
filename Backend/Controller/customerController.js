const db = require("../Config/db");

const toIntOrNull = (v) => {
  const n = Number(String(v ?? "").trim());
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  return i > 0 ? i : null;
};

const getAllCustomers = (req, res) => {
  const sql = `CALL sp_customers('GET_ALL', NULL, NULL, NULL)`;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ error: err.sqlMessage || err.message });
    res.json(result?.[0] || []);
  });
};

const updateCustomer = (req, res) => {
  const idNum = toIntOrNull(req.params.id);
  if (!idNum) return res.status(400).json({ message: "Invalid customer id" });

  const customerName = String(req.body.customerName ?? "").trim();
  const customerAddress = String(req.body.customerAddress ?? "").trim();

  const sql = `CALL sp_customers('UPDATE', ?, ?, ?)`;
  db.query(sql, [idNum, customerName, customerAddress], (err) => {
    if (err) return res.status(500).json({ error: err.sqlMessage || err.message });
    res.json({ id: idNum, customerName, customerAddress });
  });
};

module.exports = { getAllCustomers, updateCustomer };