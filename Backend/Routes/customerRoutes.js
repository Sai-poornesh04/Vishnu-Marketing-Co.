const express = require("express");
const router = express.Router();
const customersController = require("../Controller/customerController");

// Get all customers
router.get("/all", customersController.getAllCustomers);

// Add a new customer (YOUR NEW ROUTE)
router.post("/add", customersController.createCustomer);

// Update an existing customer
router.put("/:id", customersController.updateCustomer);

module.exports = router;