"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const optionalAuth_1 = __importDefault(require("../../middlewares/optionalAuth"));
const search_controller_1 = __importDefault(require("./search.controller"));
const searchRoute = (0, express_1.Router)();
// Global unified search endpoint
searchRoute.get('/', optionalAuth_1.default, search_controller_1.default.globalSearch);
// Fast autocomplete suggestions endpoint
searchRoute.get('/suggestions', optionalAuth_1.default, search_controller_1.default.getSuggestions);
exports.default = searchRoute;
