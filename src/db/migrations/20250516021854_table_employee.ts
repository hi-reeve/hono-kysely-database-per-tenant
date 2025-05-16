import { createId } from '@paralleldrive/cuid2'
import type { Kysely } from 'kysely'

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
	await db.schema.createTable('employee')
		.addColumn('id', 'varchar', (col) => col.primaryKey().defaultTo(createId()))
		.addColumn('name', 'varchar', (col) => col.notNull())
		.addColumn('tenant_id', 'varchar', (col) => col.references('tenant.id').onDelete('cascade').notNull())
		.execute()
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('employee').execute()
}
