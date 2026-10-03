"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("./src/lib/prisma");
async function main() {
    const users = await prisma_1.db.user.findMany();
    console.log("Users:", users.length);
    const cases = await prisma_1.db.case.findMany();
    console.log("Cases:", cases.length);
}
main().catch(console.error).finally(() => prisma_1.db.$disconnect());
