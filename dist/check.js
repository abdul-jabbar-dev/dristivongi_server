"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const db = new client_1.PrismaClient();
async function main() {
    const sources = await db.source.findMany({ orderBy: { createdAt: 'desc' }, take: 2 });
    console.log(JSON.stringify(sources, null, 2));
}
main();
