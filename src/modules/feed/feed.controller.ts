import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { feedService } from './feed.service';
import { catchAsync } from '../../utils/catchAsync';

export const getPersonalizedFeed = catchAsync(async (req: Request, res: Response) => {
  const result = await feedService.getPersonalizedFeed({
    userId: req.user?.id,
    cursor: req.query.cursor as string,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    sort: req.query.sort as string,
    tag: req.query.tag as string,
    author: req.query.author as string,
    debug: req.query.debug === 'true',
  });

  res.status(httpStatus.OK).json({
    success: true,
    data: result.items,
    nextCursor: result.nextCursor,
    hasMore: result.hasMore,
    meta: result.meta,
  });
});

export const toggleFollowCase = catchAsync(async (req: Request, res: Response) => {
  const caseId = req.params.caseId || req.body.caseId;
  const result = await feedService.toggleFollowCase(req.user!.id, caseId);
  res.status(httpStatus.OK).json({ success: true, data: result });
});

export const toggleSaveCase = catchAsync(async (req: Request, res: Response) => {
  const caseId = req.params.caseId || req.body.caseId;
  const result = await feedService.toggleSaveCase(req.user!.id, caseId);
  res.status(httpStatus.OK).json({ success: true, data: result });
});

export const hideCase = catchAsync(async (req: Request, res: Response) => {
  const caseId = req.params.caseId || req.body.caseId;
  const result = await feedService.hideCase(req.user!.id, caseId);
  res.status(httpStatus.OK).json({ success: true, message: result.message });
});

export const markNotInterested = catchAsync(async (req: Request, res: Response) => {
  const caseId = req.params.caseId || req.body.caseId;
  const result = await feedService.markNotInterested(req.user!.id, caseId);
  res.status(httpStatus.OK).json({ success: true, message: result.message });
});

export const muteOrganization = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.params.organizationId || req.body.organizationId;
  const result = await feedService.muteOrganization(req.user!.id, organizationId);
  res.status(httpStatus.OK).json({ success: true, message: result.message });
});

export const toggleFollowOrganization = catchAsync(async (req: Request, res: Response) => {
  const organizationId = req.params.organizationId || req.body.organizationId;
  const result = await feedService.toggleFollowOrganization(req.user!.id, organizationId);
  res.status(httpStatus.OK).json({ success: true, data: result });
});

export const getSavedCases = catchAsync(async (req: Request, res: Response) => {
  const result = await feedService.getSavedCases(req.user!.id, {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  });
  res.status(httpStatus.OK).json({
    success: true,
    data: result.items,
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
    hasMore: result.hasMore,
  });
});
