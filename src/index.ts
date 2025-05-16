import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import env from './config/env'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { coreDb, pool } from './config/db'
import { customAlphabet } from 'nanoid'
import { promises as fs } from 'fs'
import * as path from 'path'
import { Pool } from 'pg'
import { FileMigrationProvider, Kysely, Migrator, PostgresDialect } from 'kysely'
import type { DB } from './db/db'
import { createId } from '@paralleldrive/cuid2'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const _dirname = typeof __dirname !== 'undefined'
	? __dirname
	: dirname(fileURLToPath(import.meta.url))
const app = new Hono()

app.get('/', (c) => {
	return c.text('Hello Hono!')
})
const registerSchema = z.object({
	name: z.string(),
})
app.post('/register', zValidator('json', registerSchema), async (c) => {
	const body = c.req.valid('json')

	const data = await coreDb.insertInto('tenant').values({
		id: createId(),
		name: body.name,
	})
		.returningAll()
		.executeTakeFirstOrThrow()


	return c.json({ data })
})

const getTenantDb = async (tenantId: string) => {
	const { connection_string: connectionString } = await coreDb.selectFrom('tenant')
		.select('connection_string')
		.where('tenant.id', '=', tenantId)
		.executeTakeFirstOrThrow()
	if (!connectionString) {
		throw new Error('Tenant not found')
	}
	const tenantPool = new Pool({
		connectionString,
	})

	const tenantDialect = new PostgresDialect({
		pool: tenantPool
	})
	const tenantDb = new Kysely<DB>({
		dialect: tenantDialect,
	})

	return tenantDb
}

const migrate = async (tenantDb: Kysely<DB>) => {
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
app.post('/onboarding', async (c) => {
	const tenantId = c.req.header('X-Tenant-Id')
	if (!tenantId) {
		return c.json({ error: 'Missing tenant id' }, 400)
	}

	const dbName = `tenant-${tenantId}`
	const dbUser = `user-tenant-${tenantId}`
	const dbPassword = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 16)()

	const connectionString = `postgres://${dbUser}:${dbPassword}@localhost:5432/${dbName}`
	const res = await coreDb.transaction().execute(async (tx) => {

		const res = await tx.updateTable('tenant')
			.set({
				connection_string: connectionString,
			})
			.where('id', '=', tenantId)
			.returningAll()
			.executeTakeFirstOrThrow()

		return res
	})
	try {

		//create the database per tenant
		await pool.query(`CREATE USER "${dbUser}" WITH PASSWORD '${dbPassword}'`)
		await pool.query(`CREATE DATABASE "${dbName}" OWNER "${dbUser}"`)
		await pool.query(`GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO "${dbUser}"`)

		const tenantDb = await getTenantDb(tenantId)

		//migrate the db
		await migrate(tenantDb)

		//insert current tenant
		await tenantDb.insertInto('tenant')
			.values(res)
			.returningAll()
			.executeTakeFirstOrThrow()

		return c.json({ data: res })

	} catch (error) {

		console.error(error)
		return c.json({ error: 'Internal server error' }, 500)
	}
})

const employeeSchema = z.object({
	name: z.string(),
})
app.post('/employee', zValidator('json', employeeSchema), async (c) => {
	const tenantId = c.req.header('X-Tenant-Id')
	if (!tenantId) {
		return c.json({ error: 'Missing tenant id' }, 400)
	}

	const body = c.req.valid('json')

	const tenantDb = await getTenantDb(tenantId)
	const data = await tenantDb.insertInto('employee').values({
		id: createId(),
		name: body.name,
		tenant_id: tenantId
	})
		.returningAll()
		.executeTakeFirstOrThrow()
	return c.json({ data })
})

serve({
	fetch: app.fetch,
	port: env.PORT
}, (info) => {
	console.log(`Server is running on http://localhost:${info.port}`)
})
