import * as path from 'path'
import * as fs from 'fs/promises'
import * as desm from 'desm'

export class MigrateSql {
  constructor (config = {}) {
    const {
      configFilepath,
      databaseType,
      databaseDriver,
      templateFilepath,
      migrationsDirectory
    } = config

    this.configFilepath = configFilepath
    this.templateFilepath = templateFilepath
    this.migrationsDirectory = migrationsDirectory
    this.migrator = databaseDriver
    this.databaseType = databaseType
  }

  connect () {
    this.db = this.migrator.connect()
  }

  async create (options = {}) {
    const { name } = options

    const createMigrationsDirectory = !(await exists(this.migrationsDirectory))
    if (createMigrationsDirectory) {
      await fs.mkdir(this.migrationsDirectory, { recursive: true })
    }

    const defaultTemplateFilepath = desm.join(import.meta.url, 'lib', `template-${this.databaseType}.js`)
    const templateFilepath = this.templateFilepath || defaultTemplateFilepath
    const template = (await fs.readFile(templateFilepath, 'utf-8')).replace(/<name>/g, name)

    const existingMigrations = await fs.readdir(this.migrationsDirectory)
    let count = existingMigrations.length

    for (const migration of existingMigrations) {
      if (migration.includes(name)) {
        throw new Error(`migration name "${name}" already used in ${migration}`)
      }
    }

    const index = `${++count}`.padStart(4, '0')
    const migrationFilepath = path.join(this.migrationsDirectory, `${index}-${name}.js`)
    await fs.writeFile(migrationFilepath, template)
  }

  async migrate () {
    await this.migrator.createMigrationsTable()

    const migrationFilenames = await fs.readdir(this.migrationsDirectory)

    const nextMigrations = migrationFilenames.map((m) => {
      const parsedPath = path.parse(m)
      const [index] = parsedPath.name.split('-')
      const filepath = path.join(this.migrationsDirectory, m)

      return {
        name: parsedPath.name,
        index: +index,
        filepath
      }
    }).sort((a, b) => {
      return a.index - b.index
    })

    const previousMigrations = await this.migrator.getPreviousMigrations()
    const migrations = filterNextMigrations(nextMigrations, previousMigrations)

    await this.migrator.migrate({
      migrations
    })
  }

  async rollback (options = {}) {
    const { all } = options

    let migrationNames
    if (all) {
      migrationNames = await this.migrator.getPreviousMigrations()
    } else {
      migrationNames = await this.migrator.getLatestMigration()
    }

    const migrations = migrationNames.map((migration) => {
      return {
        name: migration.name,
        filepath: path.join(this.migrationsDirectory, `${migration.name}.js`)
      }
    })

    await this.migrator.rollback({
      migrations
    })
  }

  async close () {
    await this.migrator.close()
  }
}

async function exists (path) {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

function filterNextMigrations (nextMigrations, previousMigrations) {
  const previous = new Set(previousMigrations.map((m) => m.name))
  const next = new Set(nextMigrations.filter((migration) => {
    return !previous.has(migration.name)
  }))
  return [...next]
}
