const express = require("express");
const router = express.Router();
const controller = require("../Controller/billController");

/* ===== BILL ROUTES ===== */
router.post("/save", controller.saveBill);
router.get("/all", controller.getAllBills);
router.get("/search", controller.searchBills);
router.put("/:id", controller.updateBill);
router.get("/:id", controller.getBillById);
router.delete("/:id", controller.deleteBill);

module.exports = router;