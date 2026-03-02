import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://postgres:vICTOEzuuXuVtZrGJYSJUlIqnpgXhrxA@switchback.proxy.rlwy.net:41959/railway"
        }
    }
});

async function main() {
    console.log("Connecting and deleting migration record...");
    const res = await prisma.$executeRawUnsafe(`DELETE FROM "_prisma_migrations" WHERE migration_name = '20260301190000_multi_tenant_admin_flow';`);
    console.log("Deleted records count:", res);
}

main()
    .then(() => {
        console.log("Done");
        process.exit(0);
    })
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
