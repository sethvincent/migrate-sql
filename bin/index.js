#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'

import mri from 'mri'
import dedent from 'dedent'

import { MigrateSql } from '../index.js'
import { SqliteMigrator } from '../sqlite.js'
import { PostgresqlMigrator } from '../postgresql.js'

const flags = mri(process.argv.slice(2), {
  alias: {
    help: 'h',
    databaseType: ['d', 'databaseType'],
    migrations: ['m', 'migrationsDirectory'],
    all: 'a',
    config: 'c',
    name: 'n',
    template: ['t', 'templateFilepath'],
    filepath: 'f',
    connection: 'C'
  },
  default: {
    all: false,
    config: 'migrate-sql.config.js'
  }
})

const cmd = flags._.shift()

if (!cmd || cmd === 'help' || flags.help) {
  const message = dedent`
    migrate-sql

    COMMANDS
    create            create a new migration
    migrate           run migrations
    rollback          rollback latest migration or all migrations
    help              this message

    OPTIONS
    --config,-c       relative path to config filepath. default: migrate-sql.config.js
    --type,-t         type of database. options: sqlite, postgresql
    --migrations,-m   relative path to migrations directory. default: migrations

    EXAMPLES
    Create a new migration file:
    migrate-sql create --name post

    Run migrations:
    migrate-sql migrate

    Rollback latest migration:
    migrate-sql rollback

    Rollback all migrations:
    migrate-sql rollback --all
  `

  console.log(message)
}

const configFilepath = path.join(process.cwd(), flags.config)

async function main () {
  let config
  try {
    const configModule = await import(configFilepath)
    config = configModule.default
  } catch (error) {
    if (!error.message.includes('Cannot find module')) {
      throw error
    }

    config = {}
  }

  config = Object.assign({}, config, flags)

  if (!config.migrations) {
    config.migrations = path.join(process.cwd(), 'migrations')
  }

  let databaseDriver
  if (config.database === 'sqlite') {
    databaseDriver = new SqliteMigrator({
      filepath: config.filepath
    })
  } else if (config.database === 'postgresql') {
    databaseDriver = new PostgresqlMigrator({
      connection: config.connection
    })
  } else {
    throw new Error(`database type "${config.database}" not supported. available options: sqlite, postgresql`)
  }

  const migrator = new MigrateSql({
    databaseType: config.databaseType,
    databaseDriver,
    migrationsDirectory: path.join(process.cwd(), config.migrationsDirectory),
    templateFilepath: config.templateFilepath
  })

  migrator.connect()

  if (cmd === 'init') {
    if (!flags.databaseType) {
      throw new Error('--type flag required. options: sqlite, postgresql')
    }

    const initConfig = {
      databaseType: flags.databaseType,
      migrationsDirectory: flags.migrationsDirectory || 'migrations'
    }

    if (flags.databaseType === 'sqlite') {
      initConfig.filepath = flags.filepath || 'data.db'
    } else if (flags.databaseType === 'postgresql') {
      if (!flags.connection) {
        throw new Error('--connection flag required. pass a postgresql:// connection string')
      }

      initConfig.connection = flags.connection
    }

    await fs.mkdir(config.migrationsDirectory)
    await fs.writeFile(process.cwd(), JSON.stringify(initConfig, null, 2))
    process.exit()
  }

  if (cmd === 'create') {
    if (!flags.name) {
      console.error('--name flag is required')
      process.exit(1)
    }

    await migrator.create({ name: flags.name })
    process.exit()
  }

  if (cmd === 'migrate') {
    await migrator.migrate()
    process.exit()
  }

  if (cmd === 'rollback') {
    await migrator.rollback({ all: flags.all })
    process.exit()
  }

  migrator.close()
}

main()
