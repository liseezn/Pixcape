import { defineConfig } from 'prisma/config'

const provider = process.env.DATABASE_PROVIDER ?? 'postgresql'
const supported = ['postgresql', 'mysql', 'sqlite']
if (!supported.includes(provider)) throw new Error(`Unsupported DATABASE_PROVIDER: ${provider}`)
const schema = provider === 'mysql' ? 'prisma/schema.mysql.prisma' : provider === 'sqlite' ? 'prisma/schema.sqlite.prisma' : 'prisma/schema.prisma'
const migrations = provider === 'mysql' ? 'prisma/migrations-mysql' : provider === 'sqlite' ? 'prisma/migrations-sqlite' : 'prisma/migrations'
const fallbackUrl = provider === 'mysql' ? 'mysql://ci:ci@localhost:3306/pixcape' : provider === 'sqlite' ? 'file:./prisma/pixcape.db' : 'postgresql://ci:ci@localhost:5432/pixcape?schema=public'

export default defineConfig({ schema, migrations: { path: migrations }, datasource: { url: process.env.DATABASE_URL ?? fallbackUrl } })
