const provider = process.env.DATABASE_PROVIDER ?? 'postgresql'
const clientPaths = {
  postgresql: '../generated/prisma-postgresql/index.js',
  mysql: '../generated/prisma-mysql/index.js',
  sqlite: '../generated/prisma-sqlite/index.js',
}
const clientPath = clientPaths[provider]
if (!clientPath) {
  console.error(`Unsupported DATABASE_PROVIDER: ${provider}`)
  process.exit(1)
}
const { PrismaClient } = await import(clientPath)

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase()
if (!email) {
  console.error('Set BOOTSTRAP_ADMIN_EMAIL to the exact existing account email. No changes were made.')
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required. No changes were made.')
  process.exit(1)
}

function createAdapter() {
  const connectionString = process.env.DATABASE_URL
  if (provider === 'sqlite') {
    if (!connectionString.startsWith('file:')) {
      throw new Error('DATABASE_URL must use file: when DATABASE_PROVIDER=sqlite.')
    }
    return new PrismaBetterSqlite3({ url: connectionString })
  }
  if (provider === 'mysql') {
    const url = new URL(connectionString)
    if (url.protocol !== 'mysql:' && url.protocol !== 'mariadb:') {
      throw new Error('DATABASE_URL must use mysql:// or mariadb:// when DATABASE_PROVIDER=mysql.')
    }
    const database = decodeURIComponent(url.pathname.slice(1))
    if (!database) throw new Error('DATABASE_URL must include a database name.')
    return new PrismaMariaDb({
      host: url.hostname,
      port: url.port ? Number(url.port) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database,
      connectionLimit: 2,
    })
  }
  if (!connectionString.startsWith('postgresql://') && !connectionString.startsWith('postgres://')) {
    throw new Error('DATABASE_URL must use postgresql:// or postgres:// when DATABASE_PROVIDER=postgresql.')
  }
  return new PrismaPg({ connectionString })
}

let prisma
try {
  prisma = new PrismaClient({ adapter: createAdapter() })
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Unable to configure the database adapter.')
  process.exit(1)
}

try {
  const target = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, role: true, status: true } })
  if (!target) {
    console.error('No account exists for that email. Sign in once with the configured OAuth provider, then run this script again.')
    process.exitCode = 1
  } else if (target.status !== 'ACTIVE') {
    console.error('The account is not ACTIVE. Reactivate it through a controlled database operation before bootstrapping.')
    process.exitCode = 1
  } else if (target.role === 'ADMIN') {
    console.log('The selected account is already an administrator. No changes were made.')
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: target.id }, data: { role: 'ADMIN' } })
      await tx.auditLog.create({ data: {
        actorId: target.id,
        action: 'INITIAL_ADMIN_BOOTSTRAPPED',
        targetType: 'User',
        targetId: target.id,
        details: { email: target.email, method: 'operator-run-script' },
      } })
    })
    console.log('Initial administrator granted and audit log recorded. Remove BOOTSTRAP_ADMIN_EMAIL from the environment now.')
  }
} finally {
  await prisma.$disconnect()
}
