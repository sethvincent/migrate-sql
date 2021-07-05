# migrate-sql

> Create migrations for postgresql via [postgres](https://github.com/porsager/postgres) or sqlite3 via [better-sqlite3](https://github.com/JoshuaWise/better-sqlite3).

## Install

This is a command-line tool and node.js library. Install with npm:

```
npm i -D migrate-sql
```

## Usage

### Basic usage can include:

Creating the migrations directory and config file:

```shell
migrate-sql init
```

Creating new migrations:

```shell
migrate-sql create --name tableName
```

The `name` passed to the create command will be used as the table name in the migration file, but this can be changed in the migration file.

Running migrations:

```shell
migrate-sql migrate
```

Rolling back migrations one at a time:

```shell
migrate-sql rollback
```

Rolling back all migrations:

```shell
migrate-sql rollback --all
```

### Help
Show the help text with `migrate-sql help`:

```
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
```

## License
[ISC](LICENSE.md)
