import { Pool } from 'pg'
import { Kysely, PostgresDialect } from 'kysely'
import type { DB } from '../db/db'
export const dialect = new PostgresDialect({
	pool: new Pool({ connectionString: process.env.DATABASE_URL })
})


export const db = new Kysely<DB>({
	dialect,
})

