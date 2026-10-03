"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parseFormDataJson = (req, res, next) => {
    if (req.body && req.body.data) {
        try {
            req.body = JSON.parse(req.body.data);
        }
        catch (error) {
            return res.status(400).json({ success: false, message: "Invalid JSON in form data 'data' field" });
        }
    }
    next();
};
exports.default = parseFormDataJson;
