
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const _dirname = typeof __dirname !== 'undefined'
	? __dirname
	: dirname(fileURLToPath(import.meta.url))