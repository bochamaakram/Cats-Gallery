const express = require("express");
const mysql = require("mysql2/promise");

const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Create connection pool with promise API
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 4000,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: true,
  },
});

// Get all cats
app.get("/api/cats", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM cats");
    res.json(rows);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// Get cat by id
app.get("/api/cats/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM cats WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Cat not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// Post cats
app.post("/api/cats", async (req, res) => {
  const { name, tag, pfp } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }
  if (!tag) {
    return res.status(400).json({ error: "Tag is required" });
  }

  try {
    const query = pfp
      ? "INSERT INTO cats (name, tag, pfp) VALUES (?, ?, ?)"
      : "INSERT INTO cats (name, tag) VALUES (?, ?)";
    const params = pfp ? [name, tag, pfp] : [name, tag];
    const [result] = await pool.query(query, params);
    res
      .status(201)
      .json({ message: "Cat added successfully", id: result.insertId });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// Delete a record
app.delete("/api/cats/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM cats WHERE id = ?", [req.params.id]);
    res.json({ message: `Record Num: ${req.params.id} deleted successfully` });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// Update a record by ID
app.put("/api/cats/:id", async (req, res) => {
  const catId = req.params.id;
  const updates = req.body;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No fields provided for update." });
  }

  const fields = [];
  const values = [];
  for (const key in updates) {
    if (["name", "tag", "pfp"].includes(key)) {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  }

  if (fields.length === 0) {
    return res
      .status(400)
      .json({ error: "No valid fields provided for update." });
  }

  values.push(catId);

  try {
    const [result] = await pool.query(
      `UPDATE cats SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: `Cat with ID ${catId} not found.` });
    }
    res.json({ message: `Record Num: ${catId} updated successfully` });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// User Signup
app.post("/api/users/signup", async (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ error: "Name and password are required" });
  }

  try {
    const [existing] = await pool.query("SELECT id FROM users WHERE name = ?", [
      name,
    ]);

    if (existing.length > 0) {
      return res.status(409).json({ error: "User already exists" });
    }

    const [result] = await pool.query(
      "INSERT INTO users (name, password) VALUES (?, ?)",
      [name, password]
    );
    res
      .status(201)
      .json({ message: "User created successfully", id: result.insertId });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// User Login
app.post("/api/users/login", async (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ error: "Name and password are required" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, name, created_at FROM users WHERE name = ? AND password = ?",
      [name, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({ message: "Login successful", user: rows[0] });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Export for Vercel serverless
module.exports = app;
