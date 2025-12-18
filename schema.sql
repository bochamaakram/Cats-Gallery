create database test;
use test;
#drop database test;
CREATE TABLE cats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    tag VARCHAR(50) NOT NULL,
    pfp VARCHAR(255) DEFAULT 'https://cataas.com/cat',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO cats (name, tag, pfp)
VALUES
    ('Luna', 'Cute', 'https://cataas.com/cat/says/a'),
    ('Milo', 'Orange', 'https://cataas.com/cat/says/b'),
    ('Oliver', 'Tabby', 'https://cataas.com/cat/says/c'),
    ('Leo', 'Playful', 'https://cataas.com/cat/says/d'),
    ('Loki', 'Mischievous', 'https://cataas.com/cat/says/e'),
    ('Bella', 'Princess', 'https://cataas.com/cat/says/f'),
    ('Charlie', 'Friendly', 'https://cataas.com/cat/says/g'),
    ('Willow', 'Sleepy', 'https://cataas.com/cat/says/h'),
    ('Lucy', 'Cuddly', 'https://cataas.com/cat/says/i'),
    ('Simba', 'Leader', 'https://cataas.com/cat/says/j'),
    ('Max', 'Hunter', 'https://cataas.com/cat/says/k'),
    ('Cleo', 'Elegant', 'https://cataas.com/cat/says/l'),
    ('Oreo', 'Black & White', 'https://cataas.com/cat/says/m'),
    ('Shadow', 'Ninja', 'https://cataas.com/cat/says/n'),
    ('Kitty', 'Baby', 'https://cataas.com/cat/says/o'),
    ('Pepper', 'Fast', 'https://cataas.com/cat/says/p');
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    password VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
