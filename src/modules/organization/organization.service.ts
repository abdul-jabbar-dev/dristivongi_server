import { db as prisma } from '../../../lib/prisma';
import slugify from 'slugify';
import { OrganizationStatus, OrganizationVisibility, OrganizationVerificationStatus, OrganizationRole } from '@prisma/client';

export const createOrganization = async (userId: string, data: any) => {
  const slug = slugify(data.name, { lower: true, strict: true }) + '-' + Math.random().toString(36).substring(2, 6);
  
  // Rule: Private orgs start PENDING and PENDING_VERIFICATION
  const status = data.visibility === OrganizationVisibility.PRIVATE 
    ? OrganizationStatus.PENDING 
    : OrganizationStatus.ACTIVE;

  const verificationStatus = data.visibility === OrganizationVisibility.PRIVATE
    ? OrganizationVerificationStatus.PENDING_VERIFICATION
    : OrganizationVerificationStatus.UNVERIFIED;

  const organization = await prisma.organization.create({
    data: {
      ...data,
      slug,
      status,
      verificationStatus,
      createdBy: userId,
      memberships: {
        create: {
          userId,
          role: OrganizationRole.OWNER,
        }
      }
    },
  });

  return organization;
};

export const getPublicOrganizations = async (query: any) => {
  // Only return ACTIVE + PUBLIC organizations
  const organizations = await prisma.organization.findMany({
    where: {
      status: OrganizationStatus.ACTIVE,
      visibility: OrganizationVisibility.PUBLIC,
    },
    include: {
      _count: {
        select: { memberships: true, officialResponses: true }
      }
    },
    orderBy: { createdAt: 'desc' },
  });

  return organizations;
};

export const getOrganizationBySlug = async (slug: string) => {
  const organization = await prisma.organization.findUnique({
    where: { slug },
  });

  if (!organization) {
    throw new Error('Organization not found');
  }

  return organization;
};

export const getOrganizationById = async (id: string, userId: string) => {
  const organization = await prisma.organization.findUnique({
    where: { id },
  });

  if (!organization) {
    throw new Error('Organization not found');
  }

  // Basic access check could go here, or controller
  return organization;
};

export const getUserOrganizations = async (userId: string) => {
  const memberships = await prisma.organizationMembership.findMany({
    where: { userId },
    include: {
      organization: true,
    },
  });

  return memberships;
};
