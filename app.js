const express = require("express");
const mysql = require("mysql2");
const path = require("path");

const app = express();
const post = "5000";

// Serve static files from public folder
app.use(express.static(path.join(__dirname, "public")));

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

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "rootpass",
  database: "test",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

//get cats
app.get("/cats", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "DB connection error" });
    }
    connection.query("SELECT * FROM cats", (qerr, rows) => {
      connection.release();
      if (qerr) {
        console.log(qerr);
        return res.status(500).json({ error: "Query error" });
      }
      res.json(rows);
    });
  });
});
//get cat by id
app.get("/cats/:id", (req, res) => {
  const { id } = req.params;

  pool.getConnection((err, connection) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "DB connection error" });
    }
    connection.query("SELECT * FROM cats WHERE id = ?", [id], (qerr, rows) => {
      connection.release();
      if (qerr) {
        console.log(qerr);
        return res.status(500).json({ error: "Query error" });
      }
      if (rows.length === 0) {
        return res.status(404).json({ error: "Cat not found" });
      }
      res.json(rows[0]);
    });
  });
});

//post cats
app.post("/cats", (req, res) => {
  const { name, tag, pfp } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }
  if (!tag) {
    return res.status(400).json({ error: "Tag is required" });
  }

  pool.getConnection((err, connection) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "DB connection error" });
    }
    const query = pfp
      ? "INSERT INTO cats (name, tag, pfp) VALUES (?, ?, ?)"
      : "INSERT INTO cats (name, tag) VALUES (?, ?)";
    const params = pfp ? [name, tag, pfp] : [name, tag];
    connection.query(query, params, (qerr, result) => {
      connection.release();
      if (qerr) {
        console.log(qerr);
        return res.status(500).json({ error: "Query error" });
      }
      res
        .status(201)
        .json({ message: "Cat added successfully", id: result.insertId });
    });
  });
});

// Delete a record
app.delete("/cats/:id", (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error("DB connection error:", err);
      return res.status(500).json({ error: "DB connection error" });
    }
    connection.query(
      "DELETE FROM cats where id = ?",
      [req.params.id],
      (qErr, rows) => {
        connection.release();
        if (qErr) {
          console.error("Query error:", qErr);
          return res.status(500).json({ error: "Query error" });
        }
        res.json({
          message: `Record Num: ${req.params.id} deleted successfully`,
        });
      }
    );
  });
});

// Update a record by ID (Dynamic Update)
app.put("/cats/:id", (req, res) => {
  const catId = req.params.id;
  const updates = req.body;
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No fields provided for update." });
  }
  pool.getConnection((err, connection) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "DB connection error" });
    }
    const fields = [];
    const values = [];
    for (const key in updates) {
      if (["name", "tag", "pfp"].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    }
    values.push(catId);
    const query = `
      UPDATE cats 
      SET ${fields.join(", ")} 
      WHERE id = ?
    `;
    connection.query(query, values, (qerr, result) => {
      connection.release();

      if (qerr) {
        console.log(qerr);
        return res.status(500).json({ error: "Query error" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: `Cat with ID ${catId} not found or no change was made.`,
        });
      }
      res.json({
        message: `Record Num: ${catId} updated successfully (Fields updated: ${fields.length})`,
      });
    });
  });
});

// User Signup
app.post("/users/signup", (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ error: "Name and password are required" });
  }

  pool.getConnection((err, connection) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "DB connection error" });
    }

    // Check if user already exists
    connection.query(
      "SELECT id FROM users WHERE name = ?",
      [name],
      (qerr, rows) => {
        if (qerr) {
          connection.release();
          console.log(qerr);
          return res.status(500).json({ error: "Query error" });
        }

        if (rows.length > 0) {
          connection.release();
          return res.status(409).json({ error: "User already exists" });
        }

        // Create new user
        connection.query(
          "INSERT INTO users (name, password) VALUES (?, ?)",
          [name, password],
          (insertErr, result) => {
            connection.release();
            if (insertErr) {
              console.log(insertErr);
              return res.status(500).json({ error: "Query error" });
            }
            res.status(201).json({
              message: "User created successfully",
              id: result.insertId,
            });
          }
        );
      }
    );
  });
});

// User Login
app.post("/users/login", (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ error: "Name and password are required" });
  }

  pool.getConnection((err, connection) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "DB connection error" });
    }

    connection.query(
      "SELECT id, name, created_at FROM users WHERE name = ? AND password = ?",
      [name, password],
      (qerr, rows) => {
        connection.release();
        if (qerr) {
          console.log(qerr);
          return res.status(500).json({ error: "Query error" });
        }

        if (rows.length === 0) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        res.json({
          message: "Login successful",
          user: rows[0],
        });
      }
    );
  });
});

app.listen(post, () => {
  console.log("Server is running on port " + post);
});
