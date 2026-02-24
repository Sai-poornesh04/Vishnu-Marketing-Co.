const express = require("express");
const router = express.Router();
const customersController = require("../Controller/customerController");

router.get("/all", customersController.getAllCustomers);
router.get("/:id", customersController.getCustomerById);   // ✅ added
router.put("/:id", customersController.updateCustomer);

module.exports = router;