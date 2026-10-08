"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSavedCases = exports.toggleFollowOrganization = exports.muteOrganization = exports.markNotInterested = exports.hideCase = exports.toggleSaveCase = exports.toggleFollowCase = exports.getPersonalizedFeed = void 0;
const http_status_1 = __importDefault(require("http-status"));
const feed_service_1 = require("./feed.service");
const catchAsync_1 = require("../../utils/catchAsync");
exports.getPersonalizedFeed = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await feed_service_1.feedService.getPersonalizedFeed({
        userId: req.user?.id,
        cursor: req.query.cursor,
        page: req.query.page ? parseInt(req.query.page, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
        sort: req.query.sort,
        tag: req.query.tag,
        author: req.query.author,
        debug: req.query.debug === 'true',
    });
    res.status(http_status_1.default.OK).json({
        success: true,
        data: result.items,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
        meta: result.meta,
    });
});
exports.toggleFollowCase = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const caseId = req.params.caseId || req.body.caseId;
    const result = await feed_service_1.feedService.toggleFollowCase(req.user.id, caseId);
    res.status(http_status_1.default.OK).json({ success: true, data: result });
});
exports.toggleSaveCase = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const caseId = req.params.caseId || req.body.caseId;
    const result = await feed_service_1.feedService.toggleSaveCase(req.user.id, caseId);
    res.status(http_status_1.default.OK).json({ success: true, data: result });
});
exports.hideCase = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const caseId = req.params.caseId || req.body.caseId;
    const result = await feed_service_1.feedService.hideCase(req.user.id, caseId);
    res.status(http_status_1.default.OK).json({ success: true, message: result.message });
});
exports.markNotInterested = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const caseId = req.params.caseId || req.body.caseId;
    const result = await feed_service_1.feedService.markNotInterested(req.user.id, caseId);
    res.status(http_status_1.default.OK).json({ success: true, message: result.message });
});
exports.muteOrganization = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const organizationId = req.params.organizationId || req.body.organizationId;
    const result = await feed_service_1.feedService.muteOrganization(req.user.id, organizationId);
    res.status(http_status_1.default.OK).json({ success: true, message: result.message });
});
exports.toggleFollowOrganization = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const organizationId = req.params.organizationId || req.body.organizationId;
    const result = await feed_service_1.feedService.toggleFollowOrganization(req.user.id, organizationId);
    res.status(http_status_1.default.OK).json({ success: true, data: result });
});
exports.getSavedCases = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await feed_service_1.feedService.getSavedCases(req.user.id, {
        page: req.query.page ? parseInt(req.query.page, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
    });
    res.status(http_status_1.default.OK).json({
        success: true,
        data: result.items,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
    });
});
