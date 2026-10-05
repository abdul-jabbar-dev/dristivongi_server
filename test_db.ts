import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const userProfile = await prisma.userProfile.findFirst();
    console.log("UserProfile:", userProfile);
}
main().finally(() => prisma.$disconnect());
