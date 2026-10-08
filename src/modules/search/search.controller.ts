import { Request, Response } from 'express';
import { searchService } from './search.service';
import { SearchFilterParams } from './search.types';

export const globalSearch = async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const scope = (req.query.scope as any) || 'all';
    const limit = parseInt(req.query.limit as string) || 20;
    const page = parseInt(req.query.page as string) || 1;
    const location = req.query.location as string;
    const category = req.query.category as string;
    const status = req.query.status as string;
    const organizationId = req.query.organizationId as string;
    const organizationType = req.query.organizationType as string;
    const evidenceType = req.query.evidenceType as string;
    const sourceType = req.query.sourceType as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const sortBy = req.query.sortBy as any;

    if (q.length > 200) {
      return res.status(400).json({
        status: false,
        message: 'Search query is too long. Maximum allowed length is 200 characters.',
      });
    }

    const currentUserId = req.user?.id;

    const params: SearchFilterParams = {
      q,
      scope,
      limit,
      page,
      location,
      category,
      status,
      organizationId,
      organizationType,
      evidenceType,
      sourceType,
      dateFrom,
      dateTo,
      sortBy,
    };

    const result = await searchService.globalSearch(params, currentUserId);

    return res.status(200).json({
      status: true,
      message: 'Search results retrieved successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error in globalSearch controller:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'An error occurred while executing search',
    });
  }
};

export const getSuggestions = async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const limit = parseInt(req.query.limit as string) || 8;
    const currentUserId = req.user?.id;

    if (q.length > 100) {
      return res.status(400).json({
        status: false,
        message: 'Suggestion query is too long',
      });
    }

    const result = await searchService.getSuggestions(q, currentUserId, limit);

    return res.status(200).json({
      status: true,
      message: 'Suggestions retrieved successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error in getSuggestions controller:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'An error occurred while fetching suggestions',
    });
  }
};

const searchController = {
  globalSearch,
  getSuggestions,
};

export default searchController;
