"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const db = new client_1.PrismaClient();
async function run() {
    const profiles = await db.userProfile.findMany();
    for (const p of profiles) {
        let changed = false;
        let up = {};
        if (p.profilePicture && p.profilePicture.includes('.storage.supabase.co')) {
            up.profilePicture = p.profilePicture.replace('.storage.supabase.co/', '.supabase.co/storage/v1/object/public/');
            changed = true;
        }
        if (p.coverPicture && p.coverPicture.includes('.storage.supabase.co')) {
            up.coverPicture = p.coverPicture.replace('.storage.supabase.co/', '.supabase.co/storage/v1/object/public/');
            changed = true;
        }
        if (changed) {
            await db.userProfile.update({ where: { id: p.id }, data: up });
            console.log('Fixed profile for userId:', p.userId);
        }
    }
}
run().then(() => process.exit(0)).catch(e => console.error(e));
