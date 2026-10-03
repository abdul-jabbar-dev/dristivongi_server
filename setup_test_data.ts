import 'dotenv/config';
import { db } from './lib/prisma';
import jwt from 'jsonwebtoken';

async function main() {
  let user = await db.user.findFirst();
  if (!user) {
    user = await db.user.create({
      data: {
        email: 'testuser_' + Date.now() + '@example.com',
        name: 'Test User',
        fullName: 'Test User Full',
        provider: 'CREDENTIALS'
      }
    });
  }

  let testCase = await db.case.findFirst({ where: { authorId: user.id }});
  if (!testCase) {
    testCase = await db.case.create({
      data: {
        title: 'Test Case',
        location: 'Dhaka',
        authorId: user.id
      }
    });
  }

  let claim = await db.claim.findFirst({ where: { caseId: testCase.id }});
  if (!claim) {
    claim = await db.claim.create({
      data: {
        title: 'Test Claim',
        claimStatus: 'SHOW',
        claimType: 'BASIC',
        caseId: testCase.id,
        createdBy: user.id
      }
    });
  }

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, type: 'access' }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  console.log(JSON.stringify({
    token,
    caseId: testCase.id,
    claimId: claim.id
  }));
}

main().catch(console.error).finally(() => db.$disconnect());
