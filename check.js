const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  const sources = await db.source.findMany({ orderBy: { createdAt: 'desc' }, take: 2 });
  console.log(JSON.stringify(sources, null, 2));
}
main();
