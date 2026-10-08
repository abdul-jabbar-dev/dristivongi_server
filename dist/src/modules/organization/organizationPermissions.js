"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canAssignRole = exports.canManageTargetMember = exports.getOrganizationPermissions = void 0;
const client_1 = require("@prisma/client");
const getOrganizationPermissions = (membership, isPublicOrg = true) => {
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
        case client_1.OrganizationRole.OWNER:
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
        case client_1.OrganizationRole.ADMIN:
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
        case client_1.OrganizationRole.MODERATOR:
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
        case client_1.OrganizationRole.REPRESENTATIVE:
        case client_1.OrganizationRole.MEMBER:
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
exports.getOrganizationPermissions = getOrganizationPermissions;
const canManageTargetMember = (actorRole, targetRole) => {
    if (actorRole === client_1.OrganizationRole.OWNER) {
        return true; // Owner can manage anyone
    }
    if (actorRole === client_1.OrganizationRole.ADMIN) {
        // Admin can manage MODERATOR, REPRESENTATIVE, MEMBER, but NOT OWNER
        return targetRole !== client_1.OrganizationRole.OWNER && targetRole !== client_1.OrganizationRole.ADMIN;
    }
    return false;
};
exports.canManageTargetMember = canManageTargetMember;
const canAssignRole = (actorRole, targetNewRole) => {
    if (actorRole === client_1.OrganizationRole.OWNER) {
        return true; // Owner can assign ADMIN, MODERATOR, REPRESENTATIVE, MEMBER
    }
    if (actorRole === client_1.OrganizationRole.ADMIN) {
        // Admin can assign MODERATOR, REPRESENTATIVE, MEMBER, but NOT OWNER or ADMIN
        return targetNewRole !== client_1.OrganizationRole.OWNER && targetNewRole !== client_1.OrganizationRole.ADMIN;
    }
    return false;
};
exports.canAssignRole = canAssignRole;
