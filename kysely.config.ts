import { defineConfig, getKnexTimestampPrefix } from "kysely-ctl";
import { dialect } from "./src/config/db";

export default defineConfig({
	dialect,
	migrations: {
		getMigrationPrefix: getKnexTimestampPrefix,
		migrationFolder: './src/db/migrations'
	},
	seeds: {
		getSeedPrefix: getKnexTimestampPrefix,
		seedFolder: './src/db/seeder'
	}
});