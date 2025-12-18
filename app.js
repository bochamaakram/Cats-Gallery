import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/cloudflare-workers";
import bcrypt from "bcryptjs";
import { sign, verify } from "hono/jwt";

const app = new Hono();

// CORS middleware
app.use("/*", cors());

// Serve static files from public folder
app.use("/*", serveStatic({ root: "./public" }));

// JWT Secret (set in Cloudflare Dashboard)
const getJwtSecret = (c) => c.env.JWT_SECRET || "default-secret-change-me";

// Auth middleware
const authMiddleware = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = await verify(token, getJwtSecret(c));
    c.set("user", payload);
    await next();
  } catch (error) {
    return c.json({ error: "Invalid token" }, 401);
  }
};

// ==================== AUTH ROUTES ====================

// Register
app.post("/auth/register", async (c) => {
  const { username, email, password } = await c.req.json();

  if (!username || !email || !password) {
    return c.json({ error: "Username, email, and password are required" }, 400);
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await c.env.DB.prepare(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)"
    )
      .bind(username, email, hashedPassword)
      .run();

    return c.json(
      { message: "User created successfully", id: result.meta.last_row_id },
      201
    );
  } catch (error) {
    if (error.message.includes("UNIQUE constraint failed")) {
      return c.json({ error: "Username or email already exists" }, 409);
    }
    return c.json({ error: "Database error", details: error.message }, 500);
  }
});

// Login
app.post("/auth/login", async (c) => {
  const { email, password } = await c.req.json();

  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  try {
    const user = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?")
      .bind(email)
      .first();

    if (!user) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    const token = await sign(
      { id: user.id, username: user.username, email: user.email },
      getJwtSecret(c)
    );

    return c.json({
      message: "Login successful",
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (error) {
    return c.json({ error: "Database error", details: error.message }, 500);
  }
});

// Get current user
app.get("/auth/me", authMiddleware, async (c) => {
  const user = c.get("user");
  return c.json({ user });
});

// ==================== CATS ROUTES ====================

// Get all cats (paginated)
app.get("/cats", async (c) => {
  const page = parseInt(c.req.query("page")) || 1;
  const limit = parseInt(c.req.query("limit")) || 10;
  const offset = (page - 1) * limit;

  try {
    const cats = await c.env.DB.prepare("SELECT * FROM cats LIMIT ? OFFSET ?")
      .bind(limit, offset)
      .all();

    const countResult = await c.env.DB.prepare(
      "SELECT COUNT(*) as total FROM cats"
    ).first();

    return c.json({
      cats: cats.results,
      pagination: {
        page,
        limit,
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit),
      },
    });
  } catch (error) {
    return c.json({ error: "Database error", details: error.message }, 500);
  }
});

// Get cat by ID
app.get("/cats/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const cat = await c.env.DB.prepare("SELECT * FROM cats WHERE id = ?")
      .bind(id)
      .first();

    if (!cat) {
      return c.json({ error: "Cat not found" }, 404);
    }

    return c.json(cat);
  } catch (error) {
    return c.json({ error: "Database error", details: error.message }, 500);
  }
});

// Create cat (auth required)
app.post("/cats", authMiddleware, async (c) => {
  const { name, pfp } = await c.req.json();

  if (!name) {
    return c.json({ error: "Name is required" }, 400);
  }

  try {
    const result = await c.env.DB.prepare(
      "INSERT INTO cats (name, pfp) VALUES (?, ?)"
    )
      .bind(name, pfp || null)
      .run();

    return c.json(
      { message: "Cat created successfully", id: result.meta.last_row_id },
      201
    );
  } catch (error) {
    return c.json({ error: "Database error", details: error.message }, 500);
  }
});

// Update cat (auth required)
app.put("/cats/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const updates = await c.req.json();

  if (Object.keys(updates).length === 0) {
    return c.json({ error: "No fields provided for update" }, 400);
  }

  const fields = [];
  const values = [];
  for (const key of ["name", "pfp"]) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  }

  if (fields.length === 0) {
    return c.json({ error: "No valid fields provided for update" }, 400);
  }

  values.push(id);

  try {
    const result = await c.env.DB.prepare(
      `UPDATE cats SET ${fields.join(", ")} WHERE id = ?`
    )
      .bind(...values)
      .run();

    if (result.meta.changes === 0) {
      return c.json({ error: "Cat not found" }, 404);
    }

    return c.json({ message: "Cat updated successfully" });
  } catch (error) {
    return c.json({ error: "Database error", details: error.message }, 500);
  }
});

// Delete cat (auth required)
app.delete("/cats/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");

  try {
    const result = await c.env.DB.prepare("DELETE FROM cats WHERE id = ?")
      .bind(id)
      .run();

    if (result.meta.changes === 0) {
      return c.json({ error: "Cat not found" }, 404);
    }

    return c.json({ message: "Cat deleted successfully" });
  } catch (error) {
    return c.json({ error: "Database error", details: error.message }, 500);
  }
});

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;
