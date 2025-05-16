import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { Kysely } from "kysely";
import type { DB } from "../db/db";
import { getTenantDb } from "../db/utils";

export const tenantMiddleware = createMiddleware<{
	Variables: {
		tenant: {
			id: string,
			db: Kysely<DB>
		}
	}
}>(async (c, next) => {
	const tenantId = c.req.header('X-Tenant-Id')
	if (!tenantId) {
		throw new HTTPException(400, { message: 'Missing tenant id' })
	}
	const tenantDb = await getTenantDb(tenantId)
	c.set('tenant', {
		db: tenantDb,
		id: tenantId
	})


	await next()

})