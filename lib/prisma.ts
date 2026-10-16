import 'server-only'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'

const provider = process.env.DATABASE_PROVIDER === 'mysql' ? 'mysql' : 'postgresql'
const connectionString = process.env.DATABASE_URL ?? (provider === 'mysql'
  ? 'mysql://ci:ci@localhost:3306/pixcape'
  : 'postgresql://ci:ci@localhost:5432/pixcape?schema=public')
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient() {
  if (provider === 'mysql') {
    const url = new URL(connectionString)
    if (url.protocol !== 'mysql:' && url.protocol !== 'mariadb:') {
      throw new Error('DATABASE_URL must use mysql:// or mariadb:// when DATABASE_PROVIDER=mysql.')
    }
    const database = decodeURIComponent(url.pathname.replace(/^\\//, ''))
    if (!database) throw new Error('DATABASE_URL must include a database name.')
    const adapter = new PrismaMariaDb({
      host: url.hostname,
      port: url.port ? Number(url.port) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database,
      connectionLimit: 5,
    })
    return new PrismaClient({ adapter })
  }

  if (!connectionString.startsWith('postgresql://') && !connectionString.startsWith('postgres://')) {
    throw new Error('DATABASE_URL must use postgresql:// or postgres:// when DATABASE_PROVIDER=postgresql.')
  }
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
