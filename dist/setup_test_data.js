"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const prisma_1 = require("./lib/prisma");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
async function main() {
    let user = await prisma_1.db.user.findFirst();
    if (!user) {
        user = await prisma_1.db.user.create({
            data: {
                email: 'testuser_' + Date.now() + '@example.com',
                fullName: 'Test User Full',
            }
        });
    }
    let testCase = await prisma_1.db.case.findFirst({ where: { authorId: user.id } });
    if (!testCase) {
        testCase = await prisma_1.db.case.create({
            data: {
                title: 'Test Case',
                location: 'Dhaka',
                authorId: user.id,
                caseStatus: 'ACTIVE',
            }
        });
    }
    let claim = await prisma_1.db.claim.findFirst({ where: { caseId: testCase.id } });
    if (!claim) {
        claim = await prisma_1.db.claim.create({
            data: {
                title: 'Test Claim',
                claimStatus: 'SHOW',
                claimType: 'BASIC',
                caseId: testCase.id,
                createdBy: user.id
            }
        });
    }
    const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, name: user.fullName, type: 'access' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log(JSON.stringify({
        token,
        caseId: testCase.id,
        claimId: claim.id
    }));
}
main().catch(console.error).finally(() => prisma_1.db.$disconnect());
