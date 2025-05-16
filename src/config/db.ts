import { Pool } from 'pg'
import { Kysely, PostgresDialect } from 'kysely'
import type { DB } from '../db/db'

export const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const dialect = new PostgresDialect({
	pool
})


export const coreDb = new Kysely<DB>({
	dialect,
})

