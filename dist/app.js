"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const multer_1 = require("./lib/multer");
const router_1 = __importDefault(require("./router"));
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Simple Cookie Parser Middleware (Since cookie-parser package is missing)
app.use((req, res, next) => {
    req.cookies = {};
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const parts = cookie.split('=');
            req.cookies[parts.shift().trim()] = decodeURI(parts.join('='));
        });
    }
    next();
});
// Serve local fallback uploads
app.use('/tmp/civiclens_uploads', express_1.default.static(path_1.default.join(os_1.default.tmpdir(), 'civiclens_uploads')));
// Basic Route
app.get('/', (req, res) => {
    res.json({
        brand: "দৃষ্টিভঙ্গি",
        english: "Drishtivongi",
        slug: "drishtivongi",
        message: "Welcome to Drishtivongi API"
    });
});
app.use('/api/v1', router_1.default);
// Example file upload route
app.post('/upload', multer_1.upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ message: 'File uploaded successfully', file: req.file });
});
exports.default = app;
