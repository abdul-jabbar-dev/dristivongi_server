import { db } from './src/lib/prisma';
async function main() {
  const users = await db.user.findMany();
  console.log("Users:", users.length);
  const cases = await db.case.findMany();
  console.log("Cases:", cases.length);
}
main().catch(console.error).finally(() => db.$disconnect());
