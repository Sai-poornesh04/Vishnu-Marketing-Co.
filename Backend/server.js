const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const authRoutes = require("./Routes/authRoutes");
const billRoutes = require("./Routes/billRoutes");
const savedBillsRoutes = require("./Routes/savedBillsRoutes");
const customerRoutes = require("./Routes/customerRoutes");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Billing API is running"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/saved-bills", savedBillsRoutes);
app.use("/api/customers", customerRoutes);

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});