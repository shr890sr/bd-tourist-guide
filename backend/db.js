const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function createDatabase(file = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'tourist.sqlite')) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const database = new DatabaseSync(file);
  database.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  migrate(database);
  return database;
}

function migrate(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY, full_name TEXT NOT NULL, email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      password_hash TEXT NOT NULL, phone TEXT, role TEXT NOT NULL DEFAULT 'tourist' CHECK(role IN ('tourist','guide','admin')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')), token_version INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS destinations (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT NOT NULL, location TEXT NOT NULL,
      image_url TEXT, category TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS guides (
      id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      location TEXT NOT NULL, languages TEXT NOT NULL DEFAULT '[]', introduction TEXT NOT NULL,
      guide_type TEXT NOT NULL DEFAULT 'volunteer' CHECK(guide_type IN ('volunteer','paid','both')),
      availability TEXT NOT NULL DEFAULT '[]', approval_status TEXT NOT NULL DEFAULT 'pending' CHECK(approval_status IN ('pending','approved','rejected')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY, tourist_id INTEGER NOT NULL REFERENCES users(id), guide_id INTEGER NOT NULL REFERENCES guides(id),
      destination_id INTEGER NOT NULL REFERENCES destinations(id), travel_date TEXT NOT NULL, request_details TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','cancelled','completed')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), guide_id INTEGER REFERENCES guides(id),
      destination_id INTEGER REFERENCES destinations(id), rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK((guide_id IS NOT NULL) <> (destination_id IS NOT NULL)),
      UNIQUE(user_id, guide_id), UNIQUE(user_id, destination_id)
    );
    CREATE TABLE IF NOT EXISTS volunteer_applications (
      id INTEGER PRIMARY KEY, applicant_id INTEGER NOT NULL UNIQUE REFERENCES users(id), introduction TEXT NOT NULL,
      location TEXT NOT NULL, languages TEXT NOT NULL DEFAULT '[]', experience TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      admin_decision TEXT, submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_destinations_location ON destinations(location);
    CREATE INDEX IF NOT EXISTS idx_destinations_category ON destinations(category);
    CREATE INDEX IF NOT EXISTS idx_guides_status_location ON guides(approval_status, location);
    CREATE INDEX IF NOT EXISTS idx_bookings_tourist ON bookings(tourist_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bookings_guide_date ON bookings(guide_id, travel_date, status);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_one_accepted_per_guide_date ON bookings(guide_id, travel_date) WHERE status='accepted';
    CREATE INDEX IF NOT EXISTS idx_reviews_guide ON reviews(guide_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_destination ON reviews(destination_id);
    INSERT OR IGNORE INTO schema_migrations(version) VALUES (1);
  `);
  if (database.prepare('SELECT 1 FROM schema_migrations WHERE version=2').get()) return;
  const seed = database.prepare('INSERT OR IGNORE INTO destinations(name,description,location,image_url,category) VALUES(?,?,?,?,?)');
  const existingFrontendDestinations = [
    ["Cox's Bazar",'Walk the sweeping shoreline and watch the Bay of Bengal change color at sunset.','Chattogram Division','https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=80','Coast'],
    ['Sundarbans',"Explore the world's largest mangrove forest, shaped by winding rivers and tides.",'Khulna Division','https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=80','Nature'],
    ['Sylhet','Take in rolling tea estates, forest trails and the quiet beauty of the northeast.','Sylhet Division','https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=900&q=80','Nature'],
    ['Sajek Valley','Wake above the clouds in the hills, surrounded by mountain views and green valleys.','Rangamati District','https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80','Mountains'],
    ['Bandarban','Discover forested hills, winding trails and sweeping views across the Chittagong Hill Tracts.','Bandarban','https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=900&q=80','Mountains'],
    ["Saint Martin's Island",'Slow down on Bangladesh\'s coral island, where clear water meets a gentle pace.','Chattogram Division','https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=900&q=80','Island']
  ];
  database.exec('BEGIN IMMEDIATE');
  try {
    existingFrontendDestinations.forEach(row => seed.run(...row));
    database.prepare('INSERT OR IGNORE INTO schema_migrations(version) VALUES (2)').run();
    database.exec('COMMIT');
  } catch (error) { database.exec('ROLLBACK'); throw error; }
}

module.exports = { createDatabase, migrate };
