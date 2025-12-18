-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Cats table
CREATE TABLE IF NOT EXISTS cats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  pfp TEXT DEFAULT 'https://cataas.com/cat',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Sample cats data
INSERT INTO cats (name, pfp) VALUES
  ('Luna', 'https://cataas.com/cat/says/luna'),
  ('Milo', 'https://cataas.com/cat/says/milo'),
  ('Oliver', 'https://cataas.com/cat/says/oliver'),
  ('Leo', 'https://cataas.com/cat/says/leo'),
  ('Bella', 'https://cataas.com/cat/says/bella'),
  ('Charlie', 'https://cataas.com/cat/says/charlie'),
  ('Willow', 'https://cataas.com/cat/says/willow'),
  ('Lucy', 'https://cataas.com/cat/says/lucy'),
  ('Simba', 'https://cataas.com/cat/says/simba'),
  ('Max', 'https://cataas.com/cat/says/max');
