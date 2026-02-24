const express = require("express");
const router = express.Router();
const controller = require("../Controller/savedBillsController");

router.get("/all", controller.getAllSavedBills);
router.get("/search", controller.searchSavedBills);
router.get("/:id", controller.getSavedBillById);
router.put("/:id", controller.updateSavedBill);
router.delete("/:id", controller.deleteSavedBill);

module.exports = router;