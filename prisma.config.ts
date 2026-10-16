import { defineConfig } from 'prisma/config'

const provider = process.env.DATABASE_PROVIDER === 'mysql' ? 'mysql' : 'postgresql'

export default defineConfig({
  schema: provider === 'mysql' ? 'prisma/schema.mysql.prisma' : 'prisma/schema.prisma',
  migrations: { path: provider === 'mysql' ? 'prisma/migrations-mysql' : 'prisma/migrations' },
  datasource: {
    url: process.env.DATABASE_URL ?? (provider === 'mysql'
      ? 'mysql://ci:ci@localhost:3306/pixcape'
      : 'postgresql://ci:ci@localhost:5432/pixcape?schema=public'),
  },
})
