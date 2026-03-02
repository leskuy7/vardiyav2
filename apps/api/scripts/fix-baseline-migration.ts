/**
 * One-time fix: after baseline, run the 3rd migration SQL.
 * Run from apps/api with: DATABASE_URL=your_railway_url npm run fix:baseline
 */
import { execSync } from 'child_process';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const MIGRATION_NAME = '20260301190000_multi_tenant_admin_flow';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('ERROR: Set DATABASE_URL (e.g. from Railway Postgres Variables).');
    process.exit(1);
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  try {
    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM "_prisma_migrations" WHERE migration_name = $1`,
      MIGRATION_NAME
    );
    console.log('Deleted rows:', result);
  } finally {
    await prisma.$disconnect();
  }

  const apiRoot = path.resolve(__dirname, '..');
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: dbUrl },
  });
  console.log('Done. Redeploy API or refresh.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
