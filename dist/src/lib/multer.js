"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const multer_s3_1 = __importDefault(require("multer-s3"));
const s3_1 = require("./s3");
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("../../config"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const bucketName = config_1.default.SUPABASE_S3_BUCKET_NAME || 'drishtivongi-bucket';
// Set up S3 storage using multer-s3
const s3Storage = (0, multer_s3_1.default)({
    s3: s3_1.s3Client,
    bucket: bucketName,
    contentType: multer_s3_1.default.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
        // Dynamically organize files by module/folder and date
        // Extract base path (e.g. "cases", "users") from route
        const routePrefix = req.baseUrl ? req.baseUrl.split('/').pop() || 'uploads' : 'uploads';
        const fieldName = file.fieldname || 'media';
        const dateStr = new Date().toISOString().split('T')[0]; // e.g. 2026-09-27
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        // Construct dynamic path: folder (e.g. cases) / fieldName / date / unique_filename.ext
        const fullPath = `${routePrefix}/${fieldName}/${dateStr}/${uniqueSuffix}${ext}`;
        cb(null, fullPath);
    }
});
// Fallback to local disk storage if S3 credentials are not set
const diskStorage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        const dir = path_1.default.join(os_1.default.tmpdir(), 'civiclens_uploads');
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const storage = config_1.default.SUPABASE_S3_ACCESS_KEY_ID ? s3Storage : diskStorage;
// Configure Multer with appropriate storage, size limits, and basic file filtering
exports.upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // Limit to 10MB per file to optimize performance
    }
});
