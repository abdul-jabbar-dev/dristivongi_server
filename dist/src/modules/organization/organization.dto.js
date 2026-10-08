"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toAdminOrganizationDTO = exports.toOwnerOrganizationDTO = exports.toMemberOrganizationDTO = exports.toPublicOrganizationDTO = void 0;
const toPublicOrganizationDTO = (org) => {
    return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        organizationType: org.organizationType,
        visibility: org.visibility,
        verificationStatus: org.verificationStatus,
        logoUrl: org.logoUrl,
        coverUrl: org.coverUrl,
        website: org.website,
        location: org.address,
    };
};
exports.toPublicOrganizationDTO = toPublicOrganizationDTO;
const toMemberOrganizationDTO = (org) => {
    return {
        ...(0, exports.toPublicOrganizationDTO)(org),
        email: org.email,
        phone: org.phone,
        address: org.address,
        createdAt: org.createdAt,
        // Add additional member-safe data here (members list if fetched)
    };
};
exports.toMemberOrganizationDTO = toMemberOrganizationDTO;
const toOwnerOrganizationDTO = (org) => {
    return {
        ...(0, exports.toMemberOrganizationDTO)(org),
        rejectionReason: org.rejectionReason,
        suspensionReason: org.suspensionReason,
        // Add additional owner-safe data here
    };
};
exports.toOwnerOrganizationDTO = toOwnerOrganizationDTO;
const toAdminOrganizationDTO = (org) => {
    return {
        ...org,
    };
};
exports.toAdminOrganizationDTO = toAdminOrganizationDTO;
