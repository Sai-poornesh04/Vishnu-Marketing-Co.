const express = require("express");
const router = express.Router();
const customersController = require("../Controller/customerController");

router.get("/all", customersController.getAllCustomers);
router.put("/:id", customersController.updateCustomer);

module.exports = router;