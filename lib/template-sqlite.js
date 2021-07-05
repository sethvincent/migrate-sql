export function migrate ({ db }) {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS <name> (
      id INTEGER PRIMARY KEY,
      name TEXT,
      created_at TIMESTAMP DEFAULT current_timestamp
    )
  `).run()
}

export function rollback ({ db }) {
  db.prepare(`
    DROP TABLE IF EXISTS <name>
  `).run()
}
