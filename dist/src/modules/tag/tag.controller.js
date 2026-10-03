"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagController = void 0;
const response_1 = __importDefault(require("../../../sheare/response"));
const GlobalError_1 = __importDefault(require("../../../error/GlobalError"));
const tag_service_1 = require("./tag.service");
const searchTags = async (req, res) => {
    try {
        const query = req.query.q || "";
        const result = await tag_service_1.tagService.searchTags(query);
        response_1.default.send(res, result, "Tags fetched successfully", 200);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error);
    }
};
const getTagDetails = async (req, res) => {
    try {
        const { name } = req.params;
        const result = await tag_service_1.tagService.getTagDetails(name.toLowerCase());
        response_1.default.send(res, result, "Tag details fetched successfully", 200);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error);
    }
};
exports.tagController = {
    searchTags,
    getTagDetails,
};
