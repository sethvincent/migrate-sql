export async function migrate ({ db }) {
  await db`
    CREATE TABLE IF NOT EXISTS wild (
      id SERIAL PRIMARY KEY,
      name TEXT,
      created_at TIMESTAMP DEFAULT current_timestamp
    )
  `
}

export async function rollback ({ db }) {
  await db`
    DROP TABLE IF EXISTS wild;
  `
}
