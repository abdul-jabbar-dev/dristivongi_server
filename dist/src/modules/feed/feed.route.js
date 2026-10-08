"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const feedController = __importStar(require("./feed.controller"));
const optionalAuth_1 = __importDefault(require("../../middlewares/optionalAuth"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const router = (0, express_1.Router)();
// Personalized Case Feed (Works with or without authentication, personalized when authenticated)
router.get('/', optionalAuth_1.default, feedController.getPersonalizedFeed);
// Interaction & Negative Feedback routes
router.get('/saved', auth_1.default, feedController.getSavedCases);
router.post('/cases/:caseId/follow', auth_1.default, feedController.toggleFollowCase);
router.post('/cases/:caseId/save', auth_1.default, feedController.toggleSaveCase);
router.post('/cases/:caseId/hide', auth_1.default, feedController.hideCase);
router.post('/cases/:caseId/not-interested', auth_1.default, feedController.markNotInterested);
router.post('/organizations/:organizationId/follow', auth_1.default, feedController.toggleFollowOrganization);
router.post('/organizations/:organizationId/mute', auth_1.default, feedController.muteOrganization);
exports.default = router;
