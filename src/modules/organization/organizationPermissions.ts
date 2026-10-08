import { OrganizationRole, MembershipModerationStatus } from '@prisma/client';

export type OrganizationPermission =
  | 'viewOrganization'
  | 'viewMembers'
  | 'joinOrganization'
  | 'leaveOrganization'
  | 'inviteMembers'
  | 'addMembers'
  | 'approveJoinRequests'
  | 'rejectJoinRequests'
  | 'manageMembers'
  | 'changeMemberRoles'
  | 'removeMembers'
  | 'moderateMembers'
  | 'manageCases'
  | 'createCases'
  | 'contribute'
  | 'manageMedia'
  | 'manageFiles'
  | 'manageSettings';

export interface MembershipContext {
  role: OrganizationRole | null;
  moderationStatus?: MembershipModerationStatus | null;
  isOwner?: boolean;
}

export const getOrganizationPermissions = (
  membership?: MembershipContext | null,
  isPublicOrg: boolean = true
): Record<OrganizationPermission, boolean> => {
  const role = membership?.role;
  const modStatus = membership?.moderationStatus || 'ACTIVE';
  const isBanned = modStatus === 'BANNED';
  const isRestricted = modStatus === 'RESTRICTED' || modStatus === 'SUSPENDED';

  if (!role || isBanned) {
    return {
      viewOrganization: isPublicOrg && !isBanned,
      viewMembers: isPublicOrg && !isBanned,
      joinOrganization: !role && !isBanned,
      leaveOrganization: false,
      inviteMembers: false,
      addMembers: false,
      approveJoinRequests: false,
      rejectJoinRequests: false,
      manageMembers: false,
      changeMemberRoles: false,
      removeMembers: false,
      moderateMembers: false,
      manageCases: false,
      createCases: false,
      contribute: false,
      manageMedia: false,
      manageFiles: false,
      manageSettings: false,
    };
  }

  const canContribute = !isRestricted;

  switch (role) {
    case OrganizationRole.OWNER:
      return {
        viewOrganization: true,
        viewMembers: true,
        joinOrganization: false,
        leaveOrganization: true,
        inviteMembers: true,
        addMembers: true,
        approveJoinRequests: true,
        rejectJoinRequests: true,
        manageMembers: true,
        changeMemberRoles: true,
        removeMembers: true,
        moderateMembers: true,
        manageCases: true,
        createCases: true,
        contribute: true,
        manageMedia: true,
        manageFiles: true,
        manageSettings: true,
      };

    case OrganizationRole.ADMIN:
      return {
        viewOrganization: true,
        viewMembers: true,
        joinOrganization: false,
        leaveOrganization: true,
        inviteMembers: true,
        addMembers: true,
        approveJoinRequests: true,
        rejectJoinRequests: true,
        manageMembers: true,
        changeMemberRoles: true, // only for member <-> moderator
        removeMembers: true, // only for non-owner
        moderateMembers: true,
        manageCases: true,
        createCases: canContribute,
        contribute: canContribute,
        manageMedia: true,
        manageFiles: true,
        manageSettings: false,
      };

    case OrganizationRole.MODERATOR:
      return {
        viewOrganization: true,
        viewMembers: true,
        joinOrganization: false,
        leaveOrganization: true,
        inviteMembers: true,
        addMembers: false,
        approveJoinRequests: true,
        rejectJoinRequests: true,
        manageMembers: false,
        changeMemberRoles: false,
        removeMembers: false,
        moderateMembers: true,
        manageCases: false,
        createCases: canContribute,
        contribute: canContribute,
        manageMedia: false,
        manageFiles: false,
        manageSettings: false,
      };

    case OrganizationRole.REPRESENTATIVE:
    case OrganizationRole.MEMBER:
    default:
      return {
        viewOrganization: true,
        viewMembers: true,
        joinOrganization: false,
        leaveOrganization: true,
        inviteMembers: false,
        addMembers: false,
        approveJoinRequests: false,
        rejectJoinRequests: false,
        manageMembers: false,
        changeMemberRoles: false,
        removeMembers: false,
        moderateMembers: false,
        manageCases: false,
        createCases: canContribute,
        contribute: canContribute,
        manageMedia: false,
        manageFiles: false,
        manageSettings: false,
      };
  }
};

export const canManageTargetMember = (
  actorRole: OrganizationRole,
  targetRole: OrganizationRole
): boolean => {
  if (actorRole === OrganizationRole.OWNER) {
    return true; // Owner can manage anyone
  }
  if (actorRole === OrganizationRole.ADMIN) {
    // Admin can manage MODERATOR, REPRESENTATIVE, MEMBER, but NOT OWNER
    return targetRole !== OrganizationRole.OWNER && targetRole !== OrganizationRole.ADMIN;
  }
  return false;
};

export const canAssignRole = (
  actorRole: OrganizationRole,
  targetNewRole: OrganizationRole
): boolean => {
  if (actorRole === OrganizationRole.OWNER) {
    return true; // Owner can assign ADMIN, MODERATOR, REPRESENTATIVE, MEMBER
  }
  if (actorRole === OrganizationRole.ADMIN) {
    // Admin can assign MODERATOR, REPRESENTATIVE, MEMBER, but NOT OWNER or ADMIN
    return targetNewRole !== OrganizationRole.OWNER && targetNewRole !== OrganizationRole.ADMIN;
  }
  return false;
};
