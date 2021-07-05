import postgres from 'postgres'

export class PostgresqlMigrator {
  constructor (config = {}) {
    this.connection = config.connection
  }

  connect (options = {}) {
    options.idle_timeout = 2
    options.onnotice = (error) => {
      console.log(error.message)
    }

    this.db = postgres(this.connection, options)
    return this.db
  }

  async createMigrationsTable () {
    try {
      await this.db`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT,
        created_at TIMESTAMP DEFAULT current_timestamp
      );
    `
    } catch (error) {
      // console.log('exists?', error.message)
    }
  }

  async getLatestMigration () {
    return this.db`
      SELECT name
      FROM migrations
      ORDER BY id DESC
      LIMIT 1
    `
  }

  async getPreviousMigrations () {
    return this.db`
      SELECT name
      FROM migrations
      ORDER BY id DESC
    `
  }

  async getMigrationCount () {
    return this.db`
      SELECT COUNT(*)
      FROM migrations
    `
  }

  async migrate (options = {}) {
    const { migrations } = options

    for (const migration of migrations) {
      const migrator = await import(migration.filepath)

      try {
        await migrator.migrate({ db: this.db })
      } catch (error) {
        if (error.severity === 'NOTICE') {
          console.log(error.message)
        } else {
          throw error
        }
      }

      await this.db`
        INSERT INTO migrations ${this.db(migration, 'name')};
      `
    }
  }

  async rollback (options = {}) {
    const { migrations } = options

    for (const migration of migrations) {
      const migrator = await import(migration.filepath)

      try {
        await migrator.rollback({ db: this.db })
      } catch (e) {
        console.error('error rolling back migrations:', e)
      }

      await this.db`
        DELETE FROM migrations
        WHERE name = ${migration.name};
      `
    }
  }

  close () {
    this.db.end({ timeout: null })
  }
}
