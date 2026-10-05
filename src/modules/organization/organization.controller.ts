import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import * as organizationService from './organization.service';
import { catchAsync } from '../../utils/catchAsync';
import { toPublicOrganizationDTO, toOwnerOrganizationDTO } from './organization.dto';
import { OrganizationStatus, OrganizationVisibility } from '@prisma/client';
import GlobalError from '../../../error/GlobalError';

export const createOrganization = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const org = await organizationService.createOrganization(userId, req.body);
  res.status(httpStatus.CREATED).json({ success: true, data: toOwnerOrganizationDTO(org) });
});

export const getPublicOrganizations = catchAsync(async (req: Request, res: Response) => {
  const orgs = await organizationService.getPublicOrganizations(req.query);
  res.status(httpStatus.OK).json({ success: true, data: orgs.map(toPublicOrganizationDTO) });
});

export const getOrganizationBySlug = catchAsync(async (req: Request, res: Response) => {
  const org = await organizationService.getOrganizationBySlug(req.params.slug);
  
  // Strict privacy rule
  if (org.status !== OrganizationStatus.ACTIVE || org.visibility !== OrganizationVisibility.PUBLIC) {
    return GlobalError(res, null, 'Organization not found', 404);
  }

  res.status(httpStatus.OK).json({ success: true, data: toPublicOrganizationDTO(org) });
});

export const getOrganizationById = catchAsync(async (req: Request, res: Response) => {
  const org = await organizationService.getOrganizationById(req.params.id, req.user!.id);
  
  res.status(httpStatus.OK).json({ success: true, data: toOwnerOrganizationDTO(org) });
});

export const getMyOrganizations = catchAsync(async (req: Request, res: Response) => {
  const memberships = await organizationService.getUserOrganizations(req.user!.id);
  res.status(httpStatus.OK).json({ success: true, data: memberships });
});
