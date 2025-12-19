-- Adoptions table (user-cat relationship)
CREATE TABLE IF NOT EXISTS adoptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  cat_id INTEGER NOT NULL,
  adopted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (cat_id) REFERENCES cats(id) ON DELETE CASCADE,
  UNIQUE(user_id, cat_id)
);
