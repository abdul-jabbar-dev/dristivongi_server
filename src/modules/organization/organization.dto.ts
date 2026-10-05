import { Organization } from '@prisma/client';

export type PublicOrganizationDTO = Pick<Organization, 
  | 'id'
  | 'name'
  | 'slug'
  | 'description'
  | 'organizationType'
  | 'visibility'
  | 'verificationStatus'
  | 'logoUrl'
  | 'coverUrl'
  | 'website'
> & {
  location: string | null; // Assuming location might map to address, we can omit email/phone unless verified
};

export const toPublicOrganizationDTO = (org: Organization): PublicOrganizationDTO => {
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

export const toMemberOrganizationDTO = (org: Organization) => {
  return {
    ...toPublicOrganizationDTO(org),
    email: org.email,
    phone: org.phone,
    address: org.address,
    createdAt: org.createdAt,
    // Add additional member-safe data here (members list if fetched)
  };
};

export const toOwnerOrganizationDTO = (org: Organization) => {
  return {
    ...toMemberOrganizationDTO(org),
    rejectionReason: org.rejectionReason,
    suspensionReason: org.suspensionReason,
    // Add additional owner-safe data here
  };
};

export const toAdminOrganizationDTO = (org: Organization) => {
  return {
    ...org,
  };
};
