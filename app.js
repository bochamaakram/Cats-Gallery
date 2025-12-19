import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";

const app = new Hono();

// CORS middleware - allow credentials for cookies
app.use(
  "/*",
  cors({
    origin: (origin) => origin || "*",
    credentials: true,
  })
);

// Session configuration
const SESSION_COOKIE_NAME = "session_id";
const SESSION_DURATION_DAYS = 7;

// Simple password hashing using Web Crypto API (Workers-compatible)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password, hash) {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Generate random session ID
function generateSessionId() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Create session in database
async function createSession(db, userId) {
  const sessionId = generateSessionId();
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  await db
    .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(sessionId, userId, expiresAt)
    .run();

  return { sessionId, expiresAt };
}

// Get session from database
async function getSession(db, sessionId) {
  if (!sessionId) return null;

  const session = await db
    .prepare(
      "SELECT sessions.*, users.id as uid, users.username, users.email FROM sessions JOIN users ON sessions.user_id = users.id WHERE sessions.id = ? AND sessions.expires_at > datetime('now')"
    )
    .bind(sessionId)
    .first();

  return session;
}

// Delete session
async function deleteSession(db, sessionId) {
  if (!sessionId) return;
  await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
}

// Auth middleware - uses cookies instead of JWT
const authMiddleware = async (c, next) => {
  const sessionId = getCookie(c, SESSION_COOKIE_NAME);

  if (!sessionId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const session = await getSession(c.env.DB, sessionId);

  if (!session) {
    deleteCookie(c, SESSION_COOKIE_NAME);
    return c.json({ error: "Session expired" }, 401);
  }

  c.set("user", {
    id: session.uid,
    username: session.username,
    email: session.email,
  });
  await next();
};

// ==================== AUTH ROUTES ====================

// Register
app.post("/auth/register", async (c) => {
  try {
    const body = await c.req.json();
    const { username, email, password } = body;

    if (!username || !email || !password) {
      return c.json(
        { error: "Username, email, and password are required" },
        400
      );
    }

    const hashedPassword = await hashPassword(password);
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
    if (error.message && error.message.includes("UNIQUE")) {
      return c.json({ error: "Username or email already exists" }, 409);
    }
    return c.json({ error: "Server error", details: error.message }, 500);
  }
});

// Login
app.post("/auth/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const user = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?")
      .bind(email)
      .first();

    if (!user) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    // Create session and set cookie
    const { sessionId, expiresAt } = await createSession(c.env.DB, user.id);

    setCookie(c, SESSION_COOKIE_NAME, sessionId, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      expires: new Date(expiresAt),
    });

    return c.json({
      message: "Login successful",
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (error) {
    return c.json({ error: "Server error", details: error.message }, 500);
  }
});

// Logout
app.post("/auth/logout", async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE_NAME);

  if (sessionId) {
    await deleteSession(c.env.DB, sessionId);
  }

  deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });

  return c.json({ message: "Logged out successfully" });
});

// Get current user
app.get("/auth/me", authMiddleware, async (c) => {
  const user = c.get("user");
  return c.json({ user });
});

// ==================== CATS ROUTES ====================

// Get all cats (paginated)
app.get("/cats", async (c) => {
  try {
    const page = parseInt(c.req.query("page")) || 1;
    const limit = parseInt(c.req.query("limit")) || 10;
    const offset = (page - 1) * limit;

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
    return c.json({ error: "Server error", details: error.message }, 500);
  }
});

// Get cat by ID
app.get("/cats/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const cat = await c.env.DB.prepare("SELECT * FROM cats WHERE id = ?")
      .bind(id)
      .first();

    if (!cat) {
      return c.json({ error: "Cat not found" }, 404);
    }

    return c.json(cat);
  } catch (error) {
    return c.json({ error: "Server error", details: error.message }, 500);
  }
});

// Create cat (auth required)
app.post("/cats", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { name, pfp } = body;

    if (!name) {
      return c.json({ error: "Name is required" }, 400);
    }

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
    return c.json({ error: "Server error", details: error.message }, 500);
  }
});

// Update cat (auth required)
app.put("/cats/:id", authMiddleware, async (c) => {
  try {
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
    return c.json({ error: "Server error", details: error.message }, 500);
  }
});

// Delete cat (auth required)
app.delete("/cats/:id", authMiddleware, async (c) => {
  try {
    const id = c.req.param("id");
    const result = await c.env.DB.prepare("DELETE FROM cats WHERE id = ?")
      .bind(id)
      .run();

    if (result.meta.changes === 0) {
      return c.json({ error: "Cat not found" }, 404);
    }

    return c.json({ message: "Cat deleted successfully" });
  } catch (error) {
    return c.json({ error: "Server error", details: error.message }, 500);
  }
});

// ==================== ADOPTIONS ROUTES ====================

// Get user's adopted cats
app.get("/adoptions", authMiddleware, async (c) => {
  try {
    const user = c.get("user");

    const adoptions = await c.env.DB.prepare(
      `
      SELECT cats.*, adoptions.adopted_at 
      FROM adoptions 
      JOIN cats ON adoptions.cat_id = cats.id 
      WHERE adoptions.user_id = ?
      ORDER BY adoptions.adopted_at DESC
    `
    )
      .bind(user.id)
      .all();

    return c.json({ adoptions: adoptions.results });
  } catch (error) {
    return c.json({ error: "Server error", details: error.message }, 500);
  }
});

// Adopt a cat
app.post("/adoptions", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    const { cat_id } = body;

    if (!cat_id) {
      return c.json({ error: "cat_id is required" }, 400);
    }

    // Check if cat exists
    const cat = await c.env.DB.prepare("SELECT * FROM cats WHERE id = ?")
      .bind(cat_id)
      .first();

    if (!cat) {
      return c.json({ error: "Cat not found" }, 404);
    }

    // Check if already adopted by this user
    const existing = await c.env.DB.prepare(
      "SELECT * FROM adoptions WHERE user_id = ? AND cat_id = ?"
    )
      .bind(user.id, cat_id)
      .first();

    if (existing) {
      return c.json({ error: "You have already adopted this cat" }, 409);
    }

    const result = await c.env.DB.prepare(
      "INSERT INTO adoptions (user_id, cat_id) VALUES (?, ?)"
    )
      .bind(user.id, cat_id)
      .run();

    return c.json(
      {
        message: "Cat adopted successfully!",
        id: result.meta.last_row_id,
        cat,
      },
      201
    );
  } catch (error) {
    return c.json({ error: "Server error", details: error.message }, 500);
  }
});

// Remove adoption
app.delete("/adoptions/:catId", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    const catId = c.req.param("catId");

    const result = await c.env.DB.prepare(
      "DELETE FROM adoptions WHERE user_id = ? AND cat_id = ?"
    )
      .bind(user.id, catId)
      .run();

    if (result.meta.changes === 0) {
      return c.json({ error: "Adoption not found" }, 404);
    }

    return c.json({ message: "Adoption removed successfully" });
  } catch (error) {
    return c.json({ error: "Server error", details: error.message }, 500);
  }
});

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve static files - redirect root to index.html
app.get("/", (c) => c.redirect("/index.html"));

export default app;
