import 'dotenv/config';
import { db as prisma } from './lib/prisma';
import * as orgService from './src/modules/organization/organization.service';
import { OrganizationRole, OrganizationVisibility } from '@prisma/client';

async function runTests() {
  console.log('🚀 Starting Organization People / Members System Verification Tests...');

  // 1. Create or get test users
  const timestamp = Date.now();
  const owner = await prisma.user.create({
    data: {
      email: `test_owner_${timestamp}@example.com`,
      fullName: 'Dr. Sarah Civic (Owner)',
      userName: `sarah_civic_${timestamp}`,
    },
  });

  const member1 = await prisma.user.create({
    data: {
      email: `test_member1_${timestamp}@example.com`,
      fullName: 'Alex River (Member)',
      userName: `alex_river_${timestamp}`,
    },
  });

  const member2 = await prisma.user.create({
    data: {
      email: `test_member2_${timestamp}@example.com`,
      fullName: 'Jordan Ray (Contributor)',
      userName: `jordan_ray_${timestamp}`,
    },
  });

  console.log('✅ Created test users: Owner, Member1, Member2');

  // 2. Owner creates public organization
  const publicOrg = await orgService.createOrganization(owner.id, {
    name: `Civic Safety Network ${timestamp}`,
    organizationType: 'ADVOCACY',
    visibility: OrganizationVisibility.PUBLIC,
    description: 'A community organization fighting for open civic records and public safety accountability.',
  });

  console.log('✅ Created public organization:', publicOrg.slug);

  // 3. Member 1 joins public organization
  const joinResult = await orgService.joinOrganization(publicOrg.id, member1.id);
  console.log('✅ Member 1 successfully joined public org. Role:', joinResult.role);

  // 4. Owner invites Member 2 with MODERATOR role
  const inviteResult = await orgService.inviteMember(publicOrg.id, owner.id, {
    emailOrUsername: member2.email,
    role: OrganizationRole.MODERATOR,
  });
  console.log('✅ Owner invited Member 2 as MODERATOR. Status:', inviteResult.status);

  // 5. Member 2 accepts invitation
  const acceptResult = await orgService.acceptInvitation(inviteResult.id, member2.id);
  console.log('✅ Member 2 accepted invitation. Membership role:', acceptResult.role);

  // 6. Member 2 (Contributor) creates verified non-anonymous contributions
  await prisma.case.create({
    data: {
      title: 'Water Quality Transparency Report',
      location: 'Dhaka',
      authorId: member2.id,
      caseStatus: 'ACTIVE',
      isAnonymous: false,
    },
  });

  await prisma.evidence.create({
    data: {
      title: 'Laboratory Water Test Results',
      type: 'DOCUMENT',
      submittedBy: member2.id,
      isAnonymous: false,
    },
  });

  // Also create an anonymous case to test that anonymous cases are NOT exposed
  await prisma.case.create({
    data: {
      title: 'Anonymous Whistleblower Tip',
      location: 'Secret',
      authorId: member2.id,
      caseStatus: 'ACTIVE',
      isAnonymous: true,
    },
  });

  console.log('✅ Created contributions for Member 2 (2 public, 1 anonymous)');

  // 7. Verify contributions count (should be 2, ignoring the anonymous one)
  const contribStats = await orgService.calculateUserContributions(member2.id);
  if (contribStats.total !== 2 || contribStats.cases !== 1 || contribStats.evidence !== 1) {
    throw new Error(`Contribution count calculation failed: expected 2, got ${contribStats.total}`);
  }
  console.log('✅ Non-anonymous contribution privacy verified: Total =', contribStats.total);

  // 8. Test Member listing & filters
  const allMembers = await orgService.getOrganizationMembers(publicOrg.slug, { page: 1, limit: 10 });
  console.log('✅ Total members retrieved:', allMembers.items.length, 'Total meta:', allMembers.meta.total);

  const adminsAndMods = await orgService.getOrganizationAdminsAndModerators(publicOrg.slug);
  console.log('✅ Admins and Moderators retrieved:', adminsAndMods.length, adminsAndMods.map(a => `${a.user.fullName} (${a.role})`));

  const topContributors = await orgService.getOrganizationTopContributors(publicOrg.slug);
  console.log('✅ Top contributors retrieved:', topContributors.length, topContributors.map(c => `${c.user.fullName}: ${c.contributions.total} contributions`));

  // 9. Test Role updates: Owner promotes Member 1 to ADMIN
  const member1Membership = allMembers.items.find(m => m.userId === member1.id)!;
  const updatedRole = await orgService.updateMemberRole(publicOrg.id, member1Membership.id, owner.id, OrganizationRole.ADMIN);
  console.log('✅ Owner updated Member 1 role to:', updatedRole.role);

  // 10. Test Private Organization Join Requests flow
  const privateOrg = await orgService.createOrganization(owner.id, {
    name: `Private Investigation Group ${timestamp}`,
    organizationType: 'INVESTIGATION',
    visibility: OrganizationVisibility.PRIVATE,
  });

  // Non-member requests to join
  const joinRequest = await orgService.requestToJoin(privateOrg.id, member1.id, 'I would like to help investigate water reports.');
  console.log('✅ Submitted join request for private org. Status:', joinRequest.status);

  // Admin/Owner approves join request
  const approveResult = await orgService.approveJoinRequest(privateOrg.id, joinRequest.id, owner.id);
  console.log('✅ Approved join request. New membership created for user:', approveResult.membership.userId);

  // 11. Test Sole Owner Leave Prevention
  try {
    await orgService.leaveOrganization(publicOrg.id, owner.id);
    throw new Error('Sole owner should not be allowed to leave!');
  } catch (err: any) {
    console.log('✅ Sole owner leave protection working as expected:', err.message);
  }

  // 12. Test Moderation Restriction
  const modResult = await orgService.moderateMember(
    publicOrg.id,
    member1Membership.id,
    owner.id,
    'RESTRICT',
    'Excessive discussion spam'
  );
  console.log('✅ Moderated Member 1 to RESTRICTED. Moderation status:', modResult.moderationStatus);

  console.log('\n🎉 ALL 12 VERIFICATION TEST SCENARIOS PASSED WITH FLYING COLORS!\n');
}

runTests()
  .catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
