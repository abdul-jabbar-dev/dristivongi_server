"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuggestions = exports.globalSearch = void 0;
const search_service_1 = require("./search.service");
const globalSearch = async (req, res) => {
    try {
        const q = req.query.q || '';
        const scope = req.query.scope || 'all';
        const limit = parseInt(req.query.limit) || 20;
        const page = parseInt(req.query.page) || 1;
        const location = req.query.location;
        const category = req.query.category;
        const status = req.query.status;
        const organizationId = req.query.organizationId;
        const organizationType = req.query.organizationType;
        const evidenceType = req.query.evidenceType;
        const sourceType = req.query.sourceType;
        const dateFrom = req.query.dateFrom;
        const dateTo = req.query.dateTo;
        const sortBy = req.query.sortBy;
        if (q.length > 200) {
            return res.status(400).json({
                status: false,
                message: 'Search query is too long. Maximum allowed length is 200 characters.',
            });
        }
        const currentUserId = req.user?.id;
        const params = {
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
        const result = await search_service_1.searchService.globalSearch(params, currentUserId);
        return res.status(200).json({
            status: true,
            message: 'Search results retrieved successfully',
            data: result,
        });
    }
    catch (error) {
        console.error('Error in globalSearch controller:', error);
        return res.status(500).json({
            status: false,
            message: error.message || 'An error occurred while executing search',
        });
    }
};
exports.globalSearch = globalSearch;
const getSuggestions = async (req, res) => {
    try {
        const q = req.query.q || '';
        const limit = parseInt(req.query.limit) || 8;
        const currentUserId = req.user?.id;
        if (q.length > 100) {
            return res.status(400).json({
                status: false,
                message: 'Suggestion query is too long',
            });
        }
        const result = await search_service_1.searchService.getSuggestions(q, currentUserId, limit);
        return res.status(200).json({
            status: true,
            message: 'Suggestions retrieved successfully',
            data: result,
        });
    }
    catch (error) {
        console.error('Error in getSuggestions controller:', error);
        return res.status(500).json({
            status: false,
            message: error.message || 'An error occurred while fetching suggestions',
        });
    }
};
exports.getSuggestions = getSuggestions;
const searchController = {
    globalSearch: exports.globalSearch,
    getSuggestions: exports.getSuggestions,
};
exports.default = searchController;
