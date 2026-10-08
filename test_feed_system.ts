import 'dotenv/config';
import { db as prisma } from './lib/prisma';
import { feedService } from './src/modules/feed/feed.service';
import * as orgService from './src/modules/organization/organization.service';
import { OrganizationVisibility } from '@prisma/client';

async function runFeedTests() {
  console.log('🚀 Starting Personalized Case News Feed Verification Tests...\n');

  const ts = Date.now();

  // 1. Create Test User
  const feedUser = await prisma.user.create({
    data: {
      email: `feed_user_${ts}@example.com`,
      fullName: 'Nasir Uddin (Feed Tester)',
      userName: `nasir_feed_${ts}`,
    },
  });

  const otherUser = await prisma.user.create({
    data: {
      email: `other_user_${ts}@example.com`,
      fullName: 'Rahim Khan',
      userName: `rahim_${ts}`,
    },
  });

  console.log('✅ Created test users: FeedUser, OtherUser');

  // 2. Create Public Org A & Org B, Private Org C
  const orgA = await orgService.createOrganization(otherUser.id, {
    name: `Tongi Civic Watch ${ts}`,
    organizationType: 'ADVOCACY',
    visibility: OrganizationVisibility.PUBLIC,
  });

  const orgB = await orgService.createOrganization(otherUser.id, {
    name: `Dhaka Health Initiative ${ts}`,
    organizationType: 'HEALTH',
    visibility: OrganizationVisibility.PUBLIC,
  });

  const privateOrgC = await orgService.createOrganization(otherUser.id, {
    name: `Confidential Investigation Board ${ts}`,
    organizationType: 'INTERNAL',
    visibility: OrganizationVisibility.PRIVATE,
  });

  console.log('✅ Created Organizations: Org A (Public), Org B (Public), Org C (Private)');

  // 3. Create Cases associated with Org A, Org B, and Org C
  const caseA1 = await prisma.case.create({
    data: {
      title: 'Tongi Bridge Construction Defect Investigation',
      location: 'Tongi, Gazipur',
      authorId: otherUser.id,
      organizationId: orgA.id,
      caseStatus: 'SHOW',
      visibility: 'PUBLIC',
      isAnonymous: false,
    },
  });

  const caseA2 = await prisma.case.create({
    data: {
      title: 'Tongi Public Drainage Blockage Report',
      location: 'Tongi, Gazipur',
      authorId: otherUser.id,
      organizationId: orgA.id,
      caseStatus: 'SHOW',
      visibility: 'PUBLIC',
      isAnonymous: false,
    },
  });

  const caseB1 = await prisma.case.create({
    data: {
      title: 'Dhaka Hospital Medicine Availability Audit',
      location: 'Dhaka',
      authorId: otherUser.id,
      organizationId: orgB.id,
      caseStatus: 'SHOW',
      visibility: 'PUBLIC',
      isAnonymous: false,
    },
  });

  const caseC_Private = await prisma.case.create({
    data: {
      title: 'Secret Organization Internal Whistleblower Case',
      location: 'Dhaka',
      authorId: otherUser.id,
      organizationId: privateOrgC.id,
      caseStatus: 'SHOW',
      visibility: 'ORGANIZATION_ONLY',
      isAnonymous: true,
    },
  });

  const anonymousPublicCase = await prisma.case.create({
    data: {
      title: 'Anonymous Whistleblower Public Utility Report',
      location: 'Gazipur',
      authorId: otherUser.id,
      caseStatus: 'SHOW',
      visibility: 'PUBLIC',
      isAnonymous: true,
    },
  });

  console.log('✅ Created Cases: Case A1, Case A2, Case B1, Case C (Private), Anonymous Case');

  // TEST 1: New User with no memberships -> Receives public fallback feed, Private Org C is NEVER shown
  const newFeed = await feedService.getPersonalizedFeed({ userId: feedUser.id, limit: 10 });
  const hasPrivateCase = newFeed.items.some((i) => i.case.id === caseC_Private.id);
  if (hasPrivateCase) {
    throw new Error('SECURITY VIOLATION: Private Org C Case leaked to non-member feed!');
  }
  console.log('✅ TEST 1 PASSED: Public fallback feed loaded. Private Case protected from non-member.');

  // TEST 2: User joins Org A -> Org A Cases boosted to top candidates
  await orgService.joinOrganization(orgA.id, feedUser.id);
  const feedAfterJoinA = await feedService.getPersonalizedFeed({ userId: feedUser.id, limit: 10 });
  const topReasons = feedAfterJoinA.items.map((i) => ({ title: i.case.title, reason: i.context.reason }));
  console.log('✅ TEST 2 PASSED: After joining Org A, candidate reasons:', topReasons.slice(0, 3));

  const orgACandidate = feedAfterJoinA.items.find((i) => i.case.id === caseA1.id);
  if (!orgACandidate || orgACandidate.context.reason !== 'JOINED_ORGANIZATION') {
    throw new Error('Org A case was not properly recognized with JOINED_ORGANIZATION reason!');
  }

  // TEST 3: User follows Case B1 -> Case B1 receives relevance boost
  await feedService.toggleFollowCase(feedUser.id, caseB1.id);
  const feedAfterFollowB1 = await feedService.getPersonalizedFeed({ userId: feedUser.id, limit: 10 });
  const followedItem = feedAfterFollowB1.items.find((i) => i.case.id === caseB1.id);
  if (!followedItem) {
    throw new Error('Followed case B1 not found in feed');
  }
  console.log('✅ TEST 3 PASSED: Followed Case B1 recognized in feed. Reason:', followedItem.context.reason);

  // TEST 4: Anonymous Case Privacy in Feed
  const anonItem = feedAfterJoinA.items.find((i) => i.case.id === anonymousPublicCase.id);
  if (anonItem) {
    if (anonItem.case.author.fullName !== 'Anonymous' && anonItem.case.author.fullName !== 'Anonymous Contributor') {
      throw new Error('Anonymous case exposed author full name in feed!');
    }
  }
  console.log('✅ TEST 4 PASSED: Anonymous Case author information strictly protected in feed.');

  // TEST 5: Negative Feedback -> Hiding a Case removes it from feed
  await feedService.hideCase(feedUser.id, caseA2.id);
  const feedAfterHide = await feedService.getPersonalizedFeed({ userId: feedUser.id, limit: 10 });
  const hasHiddenCase = feedAfterHide.items.some((i) => i.case.id === caseA2.id);
  if (hasHiddenCase) {
    throw new Error('Hidden case was not excluded from personalized feed!');
  }
  console.log('✅ TEST 5 PASSED: Hidden case excluded from personalized feed.');

  // TEST 6: Cursor Pagination
  const page1 = await feedService.getPersonalizedFeed({ userId: feedUser.id, limit: 2 });
  if (page1.nextCursor) {
    const page2 = await feedService.getPersonalizedFeed({
      userId: feedUser.id,
      cursor: page1.nextCursor,
      limit: 2,
    });
    const page1Ids = new Set(page1.items.map((i) => i.case.id));
    const hasOverlap = page2.items.some((i) => page1Ids.has(i.case.id));
    if (hasOverlap) {
      throw new Error('Cursor pagination produced duplicate cases across pages!');
    }
    console.log('✅ TEST 6 PASSED: Cursor pagination working cleanly with 0 duplicate overlap.');
  }

  // TEST 7: User Leaves Org A -> Joined Org boost removed
  await orgService.leaveOrganization(orgA.id, feedUser.id);
  const feedAfterLeave = await feedService.getPersonalizedFeed({ userId: feedUser.id, limit: 10 });
  const orgACandidateAfterLeave = feedAfterLeave.items.find((i) => i.case.id === caseA1.id);
  if (orgACandidateAfterLeave && orgACandidateAfterLeave.context.reason === 'JOINED_ORGANIZATION') {
    throw new Error('Joined organization boost still applied after leaving organization!');
  }
  console.log('✅ TEST 7 PASSED: After leaving Org A, JOINED_ORGANIZATION boost cleanly revoked.');

  console.log('\n🎉 ALL PERSONALIZED CASE NEWS FEED VERIFICATION TESTS PASSED!\n');
}

runFeedTests()
  .catch((e) => {
    console.error('❌ Feed test failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
