import { Pool } from "pg"
import { coreDb, pool } from "../config/db"
import { Kysely, PostgresDialect } from "kysely"
import type { DB } from "./db"
import { customAlphabet } from "nanoid"

export const getTenantDb = async (tenantId: string) => {
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

export const generateTenantDb = (tenantId: string) => {
	const dbName = `tenant-${tenantId}`
	const dbUser = `user-tenant-${tenantId}`
	const dbPassword = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 16)()

	return {
		connectionString: `postgres://${dbUser}:${dbPassword}@localhost:5432/${dbName}`,
		dbName,
		dbUser,
		dbPassword
	}
}
export const createTenantDb = async (tenantId: string) => {
	const { dbName, dbPassword, dbUser } = generateTenantDb(tenantId)
	//create the database per tenant
	await pool.query(`CREATE USER "${dbUser}" WITH PASSWORD '${dbPassword}'`)
	await pool.query(`CREATE DATABASE "${dbName}" OWNER "${dbUser}"`)
	await pool.query(`GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO "${dbUser}"`)
}