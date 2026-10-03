"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const db = new client_1.PrismaClient();
async function main() {
    const media = await db.media.findFirst({
        where: { url: { contains: 'drishtivongi-bucket' } },
        orderBy: { createdAt: 'desc' }
    });
    console.log(media);
}
main();
