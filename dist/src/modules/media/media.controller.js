"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../../../lib/prisma");
const GlobalError_1 = __importDefault(require("../../../error/GlobalError"));
const response_1 = __importDefault(require("../../../sheare/response"));
const http_status_1 = __importDefault(require("http-status"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const s3_1 = require("../../../lib/s3");
const config_1 = __importDefault(require("../../../config"));
const client_s3_1 = require("@aws-sdk/client-s3");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const bucketName = config_1.default.SUPABASE_S3_BUCKET_NAME || 'drishtivongi-bucket';
const isUrlSafe = (url) => {
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol))
            return false;
        const hostname = parsed.hostname.toLowerCase();
        // Basic SSRF protection (don't fetch from internal/private IPs)
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1')
            return false;
        if (hostname.match(/^10\./) || hostname.match(/^192\.168\./) || hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./))
            return false;
        if (hostname.match(/^169\.254\./))
            return false; // Cloud metadata
        return true;
    }
    catch (e) {
        return false;
    }
};
const importUrl = async (req, res) => {
    const { url } = req.body;
    if (!url) {
        (0, GlobalError_1.default)(res, "URL is required", "URL is required", http_status_1.default.BAD_REQUEST);
        return;
    }
    if (!isUrlSafe(url)) {
        (0, GlobalError_1.default)(res, "Invalid or unsafe URL", "Invalid or unsafe URL", http_status_1.default.FORBIDDEN);
        return;
    }
    try {
        const response = await (0, node_fetch_1.default)(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'DrishtivongiBot/1.0',
            },
            timeout: 10000 // 10 seconds timeout
        });
        if (!response.ok) {
            (0, GlobalError_1.default)(res, `Failed to fetch external media: ${response.statusText}`, `Failed to fetch external media: ${response.statusText}`, http_status_1.default.BAD_REQUEST);
            return;
        }
        const contentLength = response.headers.get('content-length');
        const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
        if (contentLength && parseInt(contentLength) > MAX_SIZE) {
            (0, GlobalError_1.default)(res, "ভিডিওটি ৫০ MB-এর বেশি হওয়ায় যোগ করা যায়নি।", "ভিডিওটি ৫০ MB-এর বেশি হওয়ায় যোগ করা যায়নি।", http_status_1.default.PAYLOAD_TOO_LARGE);
            return;
        }
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        // Only allow basic media types
        if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
            (0, GlobalError_1.default)(res, "Unsupported media format", "Unsupported media format", http_status_1.default.UNSUPPORTED_MEDIA_TYPE);
            return;
        }
        const buffer = await response.buffer();
        if (buffer.length > MAX_SIZE) {
            (0, GlobalError_1.default)(res, "ভিডিওটি ৫০ MB-এর বেশি হওয়ায় যোগ করা যায়নি।", "ভিডিওটি ৫০ MB-এর বেশি হওয়ায় যোগ করা যায়নি।", http_status_1.default.PAYLOAD_TOO_LARGE);
            return;
        }
        let finalUrl = '';
        const dateStr = new Date().toISOString().split('T')[0];
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        // Extract extension from content-type or URL
        const ext = contentType.split('/')[1]?.split(';')[0] ? `.${contentType.split('/')[1]?.split(';')[0]}` : path_1.default.extname(new URL(url).pathname) || '.bin';
        if (config_1.default.SUPABASE_S3_ACCESS_KEY_ID) {
            const key = `imports/${dateStr}/${uniqueSuffix}${ext}`;
            const command = new client_s3_1.PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: buffer,
                ContentType: contentType,
            });
            await s3_1.s3Client.send(command);
            // Construct the public URL (this logic depends on your S3 endpoint setup)
            // Using typical Supabase S3 URL format
            const endpoint = config_1.default.SUPABASE_S3_ENDPOINT || 'https://dummy.supabase.co/storage/v1/s3';
            finalUrl = `${endpoint}/${bucketName}/${key}`;
        }
        else {
            // Local disk fallback
            const dir = path_1.default.join(os_1.default.tmpdir(), 'civiclens_uploads');
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
            const filename = `${uniqueSuffix}${ext}`;
            const filepath = path_1.default.join(dir, filename);
            fs_1.default.writeFileSync(filepath, buffer);
            finalUrl = `/uploads/${filename}`; // Adjust based on how local static files are served
        }
        const media = await prisma_1.db.media.create({
            data: {
                url: finalUrl,
                type: contentType
            }
        });
        response_1.default.send(res, media, "Media imported successfully", http_status_1.default.OK);
    }
    catch (error) {
        (0, GlobalError_1.default)(res, error, `Media import failed: ${error.message}`, http_status_1.default.INTERNAL_SERVER_ERROR);
    }
};
const mediaController = {
    importUrl
};
exports.default = mediaController;
