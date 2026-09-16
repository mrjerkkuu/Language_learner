import 'dotenv/config'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../generated/prisma/client.ts'

// Prisma 7's client generator is adapter-only — schema.prisma's datasource
// block has no `url = env("DATABASE_URL")` line (only prisma7.config.ts, read
// by the CLI, has that), so the runtime client needs an explicit driver
// adapter rather than a `datasourceUrl` shorthand.
const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL })
export const prisma = new PrismaClient({ adapter })
