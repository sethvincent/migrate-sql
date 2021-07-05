import sqlite from 'better-sqlite3'

export class SqliteMigrator {
  constructor (config = {}) {
    this.filepath = config.filepath
  }

  connect (options = {}) {
    this.db = sqlite(this.filepath, options)
    return this.db
  }

  createMigrationsTable () {
    try {
      this.db.prepare(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        name TEXT,
        created_at TIMESTAMP DEFAULT current_timestamp
      );
    `).run()
    } catch (error) {
      console.log('exists?', error.message)
    }
  }

  getLatestMigration () {
    return this.db.prepare(`
      SELECT name
      FROM migrations
      ORDER BY id DESC
      LIMIT 1
    `).all()
  }

  getPreviousMigrations () {
    return this.db.prepare(`
      SELECT name
      FROM migrations
      ORDER BY id DESC
    `).all()
  }

  getMigrationCount () {
    return this.db.prepare(`
      SELECT COUNT(*)
      FROM migrations
    `).run()
  }

  async migrate (options = {}) {
    const { migrations } = options

    for (const migration of migrations) {
      const migrator = await import(migration.filepath)

      try {
        await migrator.migrate({ db: this.db })
      } catch (e) {
        console.error(e)
      }

      this.db.prepare(`
        INSERT INTO migrations (
          name
        )
        VALUES (
          ?
        )
      `).run(migration.name)
    }
  }

  async rollback (options = {}) {
    const { migrations } = options

    for (const migration of migrations) {
      const migrator = await import(migration.filepath)

      try {
        await migrator.rollback({ db: this.db })
      } catch (e) {
        console.error(e)
      }

      this.db.prepare(`
        DELETE FROM migrations
        WHERE name = ?
      `).run(migration.name)
    }
  }

  close () {
    this.db.close()
  }
}
