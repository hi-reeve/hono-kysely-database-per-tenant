import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import env from './config/env'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from './config/db'

const app = new Hono()

app.get('/', (c) => {
	return c.text('Hello Hono!')
})
const registerSchema = z.object({
	name: z.string(),
})
app.post('/register', zValidator('json', registerSchema), async (c) => {
	const body = c.req.valid('json')

	const data = await db.insertInto('tenant').values({
		name: body.name,
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
