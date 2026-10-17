import { execFileSync } from 'node:child_process'

// Generate all provider-specific clients into the same deployable image.
// Keep PostgreSQL last so @prisma/client remains the type-checking/default client.
for (const provider of ['sqlite', 'mysql', 'postgresql']) {
  console.log(`Generating Prisma Client for ${provider}...`)
  execFileSync('npx', ['prisma', 'generate'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_PROVIDER: provider },
  })
}
