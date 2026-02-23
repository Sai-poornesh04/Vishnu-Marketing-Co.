const jwt = require("jsonwebtoken");

exports.login = (req, res) => {
  const { username, password } = req.body;

  // Default credentials
  if (username === "admin" && password === "admin") {
    const token = jwt.sign(
      { username },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1h" }
    );

    return res.json({
      success: true,
      token,
      user: { username }
    });
  }

  return res.status(401).json({
    success: false,
    message: "Invalid credentials"
  });
};