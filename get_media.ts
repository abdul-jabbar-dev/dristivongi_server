import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const media = await db.media.findFirst({
    where: { url: { contains: 'drishtivongi-bucket' } },
    orderBy: { createdAt: 'desc' }
  });
  console.log(media);
}
main();
