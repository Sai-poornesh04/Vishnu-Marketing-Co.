const express = require("express");
const router = express.Router();
const savedBillsController = require("../Controller/savedBillsController");

// GET all saved bills
router.get("/all", savedBillsController.getAllSavedBills);

// SEARCH saved bills
router.get("/search", savedBillsController.searchSavedBills);

// GET single bill by id
router.get("/:id", savedBillsController.getSavedBillById);

// UPDATE existing saved bill  ✅
router.put("/:id", savedBillsController.updateSavedBill);

// DELETE saved bill
router.delete("/:id", savedBillsController.deleteSavedBill);

module.exports = router;