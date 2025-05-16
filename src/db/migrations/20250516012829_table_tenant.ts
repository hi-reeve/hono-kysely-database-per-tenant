import { createId } from '@paralleldrive/cuid2'
import { sql, type Kysely } from 'kysely'

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
	await db.schema.createTable('tenant')
		.addColumn('id', 'varchar', (col) => col.primaryKey().defaultTo(createId()))
		.addColumn('name', 'varchar', (col) => col.notNull())
		.addColumn('has_instance', 'boolean', (col) => col.defaultTo(false))
		.addColumn('connection_string', 'varchar')
		.addColumn('created_at', 'timestamp', (col) =>
			col.defaultTo(sql`now()`).notNull(),
		)
		.execute()
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('tenant').execute()
}
