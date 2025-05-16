import 'dotenv/config'
import { z } from "zod";

const EnvSchema = z.object({
	NODE_ENV: z.enum(["development", "production"]),
	DATABASE_URL: z.string(),
	PORT: z.coerce.number()
})

const { data: env, error } = EnvSchema.safeParse(process.env)

export type Env = z.infer<typeof EnvSchema>;
if (error || !env) {
	console.error('❌ Invalid env:');
	console.error(JSON.stringify(error.flatten().fieldErrors, null, 2));
	process.exit(1);
}
export default env!