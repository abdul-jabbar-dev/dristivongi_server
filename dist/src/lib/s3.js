"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3Client = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const config_1 = __importDefault(require("../../config"));
// Supabase S3 credentials
let endpoint = config_1.default.SUPABASE_S3_ENDPOINT;
if (!endpoint) {
    console.warn("⚠️ WARNING: Missing SUPABASE_S3_ENDPOINT in environment variables. S3 uploads will fail until this is set in .env!");
    endpoint = 'https://dummy.supabase.co/storage/v1/s3'; // fallback so the server doesn't crash on boot
}
exports.s3Client = new client_s3_1.S3Client({
    forcePathStyle: true,
    region: config_1.default.SUPABASE_S3_REGION,
    endpoint,
    credentials: {
        accessKeyId: config_1.default.SUPABASE_S3_ACCESS_KEY_ID || '',
        secretAccessKey: config_1.default.SUPABASE_S3_SECRET_ACCESS_KEY || '',
    },
});
