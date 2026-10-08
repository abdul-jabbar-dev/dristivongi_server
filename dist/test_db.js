"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const userProfile = await prisma.userProfile.findFirst();
    console.log("UserProfile:", userProfile);
}
main().finally(() => prisma.$disconnect());
