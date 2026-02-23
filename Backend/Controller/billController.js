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

const toIntOrNull = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  return i > 0 ? i : null;
};

const toNumOrZero = (v) => {
  const s = String(v ?? "").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const cleanItems = (items) => {
  const arr = Array.isArray(items) ? items : safeJson(items, []);
  return (Array.isArray(arr) ? arr : [])
    .map((it) => ({
      name: String(it?.name ?? "").trim(),
      qty: String(it?.qty ?? "").trim(),
      price: String(it?.price ?? "").trim()
    }))
    .filter((it) => it.name || it.qty || it.price);
};

const calcTotalAmount = (items) => {
  return items.reduce((sum, it) => {
    const qty = toNumOrZero(it.qty);
    const price = toNumOrZero(it.price);
    return sum + qty * price;
  }, 0);
};

// -------------------- Bills --------------------

const saveBill = (req, res) => {
  const {
    billNo,
    billDate,
    date,
    customerId,
    customerName,
    customerAddress,
    totalAmount,
    items
  } = req.body;

  const billNoStr = String(billNo ?? "").trim();
  const billDateSql = toMysqlDate(billDate ?? date);
  const customerIdNum = toIntOrNull(customerId);
  const itemsClean = cleanItems(items);

  if (!billNoStr || !billDateSql || !customerIdNum || itemsClean.length === 0) {
    return res.status(400).json({
      message: "Invalid payload",
      details: {
        billNo: !!billNoStr,
        billDate: !!billDateSql,
        customerId: !!customerIdNum,
        itemsCount: itemsClean.length
      }
    });
  }

  const billTable = JSON.stringify(itemsClean);
  const total = totalAmount != null ? toNumOrZero(totalAmount) : calcTotalAmount(itemsClean);

  const sql = `
    CALL sp_bills(
      'INSERT',
      NULL,
      ?, ?, ?, ?, ?, ?, ?,
      NULL, NULL, NULL, NULL, NULL
    )
  `;

  db.query(
    sql,
    [
      billNoStr,
      billDateSql,
      customerIdNum,
      String(customerName ?? ""),
      String(customerAddress ?? ""),
      total,
      billTable
    ],
    (err, result) => {
      if (err) {
        console.error("INSERT ERROR 👉", err);
        return res.status(500).json({ error: err.sqlMessage || err.message });
      }

      const insertedId = result?.[0]?.[0]?.insertedId ?? null;
      res.json({ message: "Bill saved successfully", id: insertedId });
    }
  );
};

const updateBill = (req, res) => {
  const { id } = req.params;

  const {
    billNo,
    billDate,
    date,
    customerId,
    customerName,
    customerAddress,
    totalAmount,
    items
  } = req.body;

  const idNum = toIntOrNull(id);
  const billNoStr = String(billNo ?? "").trim();
  const billDateSql = toMysqlDate(billDate ?? date);
  const customerIdNum = toIntOrNull(customerId);
  const itemsClean = cleanItems(items);

  if (!idNum || !billNoStr || !billDateSql || !customerIdNum || itemsClean.length === 0) {
    return res.status(400).json({
      message: "Invalid payload",
      details: {
        id: !!idNum,
        billNo: !!billNoStr,
        billDate: !!billDateSql,
        customerId: !!customerIdNum,
        itemsCount: itemsClean.length
      }
    });
  }

  const billTable = JSON.stringify(itemsClean);
  const total = totalAmount != null ? toNumOrZero(totalAmount) : calcTotalAmount(itemsClean);

  const sql = `
    CALL sp_bills(
      'UPDATE',
      ?,
      ?, ?, ?, ?, ?, ?, ?,
      NULL, NULL, NULL, NULL, NULL
    )
  `;

  db.query(
    sql,
    [
      idNum,
      billNoStr,
      billDateSql,
      customerIdNum,
      String(customerName ?? ""),
      String(customerAddress ?? ""),
      total,
      billTable
    ],
    (err) => {
      if (err) {
        console.error("UPDATE ERROR 👉", err);
        return res.status(500).json({ error: err.sqlMessage || err.message });
      }

      res.json({ message: "Bill updated successfully" });
    }
  );
};

const getBillById = (req, res) => {
  const idNum = toIntOrNull(req.params.id);
  if (!idNum) return res.status(400).json({ message: "Invalid id" });

  const sql = `
    CALL sp_bills(
      'GET_BY_ID',
      ?,
      NULL, NULL, NULL, NULL, NULL, NULL, NULL,
      NULL, NULL, NULL, NULL, NULL
    )
  `;

  db.query(sql, [idNum], (err, result) => {
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

const getAllBills = (req, res) => {
  const sql = `
    CALL sp_bills(
      'GET_ALL',
      NULL,
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
    res.json(
      rows.map((b) => ({
        ...b,
        billTable: safeJson(b.billTable, [])
      }))
    );
  });
};

const searchBills = (req, res) => {
  const billNo = (req.query.billNo ?? "").trim() || null;

  const customerIdRaw = (req.query.customerId ?? "").toString().trim();
  const customerId = customerIdRaw ? parseInt(customerIdRaw, 10) : null;

  const billDate = req.query.billDate ? toMysqlDate(req.query.billDate) : null;
  const fromDate = req.query.fromDate ? toMysqlDate(req.query.fromDate) : null;
  const toDate = req.query.toDate ? toMysqlDate(req.query.toDate) : null;

  const sql = `
    CALL sp_bills(
      'SEARCH',
      NULL,
      NULL, NULL, NULL, NULL, NULL, NULL, NULL,
      ?, ?, ?, ?, ?
    )
  `;

  db.query(
    sql,
    [
      billNo,
      null,                 // customerName (not used)
      customerId,
      billDate || fromDate,
      billDate || toDate
    ],
    (err, result) => {
      if (err) {
        console.error("SEARCH ERROR 👉", err);
        return res.status(500).json({ error: err.sqlMessage || err.message });
      }

      const rows = result?.[0] || [];
      res.json(
        rows.map((b) => ({
          ...b,
          billTable: safeJson(b.billTable, [])
        }))
      );
    }
  );
};
const deleteBill = (req, res) => {
  const idNum = toIntOrNull(req.params.id);
  if (!idNum) return res.status(400).json({ message: "Invalid id" });

  const sql = `
    CALL sp_bills(
      'DELETE',
      ?,
      NULL, NULL, NULL, NULL, NULL, NULL, NULL,
      NULL, NULL, NULL, NULL, NULL
    )
  `;

  db.query(sql, [idNum], (err) => {
    if (err) {
      console.error("DELETE ERROR 👉", err);
      return res.status(500).json({ error: err.sqlMessage || err.message });
    }

    res.json({ message: "Bill deleted successfully" });
  });
};

// -------------------- Customers (UPDATED) --------------------
// Uses your stored procedure sp_getCustomerById
// Returns: { id, customerName, customerAddress } OR null (404)

const getCustomerById = (req, res) => {
  const idNum = toIntOrNull(req.params.id);
  if (!idNum) return res.status(400).json({ message: "Invalid customer id" });

  const sql = `CALL sp_getCustomerById(?)`;

  db.query(sql, [idNum], (err, result) => {
    if (err) {
      console.error("CUSTOMER FETCH ERROR 👉", err);
      return res.status(500).json({ error: err.sqlMessage || err.message });
    }

    // mysql stored procedure result shape
    const customer = result?.[0]?.[0] || null;

    if (!customer) return res.status(404).json(null);

    res.json({
      id: customer.id,
      customerName: customer.customerName,
      customerAddress: customer.customerAddress
    });
  });
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
