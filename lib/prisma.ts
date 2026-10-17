import 'server-only'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'

const provider = process.env.DATABASE_PROVIDER ?? 'postgresql'
const connectionString = process.env.DATABASE_URL ?? (provider === 'mysql' ? 'mysql://ci:ci@localhost:3306/pixcape' : provider === 'sqlite' ? 'file:./prisma/pixcape.db' : 'postgresql://ci:ci@localhost:5432/pixcape?schema=public')
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient() {
  if (provider === 'sqlite') {
    if (!connectionString.startsWith('file:')) throw new Error('DATABASE_URL must use file: when DATABASE_PROVIDER=sqlite.')
    return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: connectionString }) })
  }
  if (provider === 'mysql') {
    const url = new URL(connectionString)
    if (url.protocol !== 'mysql:' && url.protocol !== 'mariadb:') throw new Error('DATABASE_URL must use mysql:// or mariadb:// when DATABASE_PROVIDER=mysql.')
    const database = decodeURIComponent(url.pathname.slice(1))
    if (!database) throw new Error('DATABASE_URL must include a database name.')
    const adapter = new PrismaMariaDb({ host: url.hostname, port: url.port ? Number(url.port) : 3306, user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database, connectionLimit: 5 })
    return new PrismaClient({ adapter })
  }
  if (provider !== 'postgresql') throw new Error(`Unsupported DATABASE_PROVIDER: ${provider}`)
  if (!connectionString.startsWith('postgresql://') && !connectionString.startsWith('postgres://')) throw new Error('DATABASE_URL must use postgresql:// or postgres:// when DATABASE_PROVIDER=postgresql.')
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
