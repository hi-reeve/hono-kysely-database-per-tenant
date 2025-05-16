import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import env from './config/env'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { coreDb } from './config/db'
import { createId } from '@paralleldrive/cuid2'
import { _dirname } from './utils/dirname'
import { createTenantDb, generateTenantDb, getTenantDb } from './db/utils'
import { migrate } from './db/migrator'
import { tenantMiddleware } from './middleware/tenant'
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

app.post('/onboarding', async (c) => {
	const tenantId = c.req.header('X-Tenant-Id')
	if (!tenantId) {
		return c.json({ error: 'Missing tenant id' }, 400)
	}

	//get the connection string
	const { connectionString } = generateTenantDb(tenantId)

	//updating the tenant db for connection string
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

		//creating the database
		await createTenantDb(tenantId)

		//get the db instance
		const tenantDb = await getTenantDb(tenantId)

		//migrate the db
		await migrate(tenantDb)

		//insert current tenant to newly generated tenant db instance
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

app.post('/employee', tenantMiddleware, zValidator('json', employeeSchema), async (c) => {
	const { db, id } = c.get('tenant')

	const body = c.req.valid('json')


	const data = await db.insertInto('employee').values({
		id: createId(),
		name: body.name,
		tenant_id: id
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
