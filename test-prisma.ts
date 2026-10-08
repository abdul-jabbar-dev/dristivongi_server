import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  try {
    const res = await db.case.findFirst({
      include: { evidence: { include: { evidence: { include: { medias: true } } } }, sources: { include: { source: true } } }
    });
    console.log("SUCCESS", !!res);
  } catch(e) {
    console.error("ERROR:", e);
  } finally {
    await db.$disconnect();
  }
}
main();
