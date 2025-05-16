import { FileMigrationProvider, Migrator, type Kysely } from "kysely"
import type { DB } from "./db"
import { promises as fs } from 'fs'
import * as path from 'path'
import { _dirname } from "../utils/dirname"
export const migrate = async (tenantDb: Kysely<DB>) => {
	const migrator = new Migrator({
		db: tenantDb, provider: new FileMigrationProvider({
			fs,
			path,
			migrationFolder: path.resolve(_dirname, './db/migrations'),

		})
	})

	const { error, results } = await migrator.migrateToLatest()
	results?.forEach((it) => {
		if (it.status === 'Success') {
			console.log(`migration "${it.migrationName}" was executed successfully`)
		} else if (it.status === 'Error') {
			console.error(`failed to execute migration "${it.migrationName}"`)
		}
	})

	if (error) {
		console.error('failed to migrate')
		console.error(error)
		process.exit(1)
	}

}