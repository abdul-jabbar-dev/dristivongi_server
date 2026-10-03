"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const ENV = {
    PORT: process.env.PORT || 5000,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    SALT: process.env.SALT || 15,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_ACCESS_TOKEN_EXPIRES_IN: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN,
    JWT_REFRESH_TOKEN_EXPIRES_IN: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN,
    env: process.env.NODE_ENV || 'development',
    SUPABASE_S3_ENDPOINT: process.env.SUPABASE_S3_ENDPOINT,
    SUPABASE_S3_REGION: process.env.SUPABASE_S3_REGION || 'ap-south-1',
    SUPABASE_S3_ACCESS_KEY_ID: process.env.SUPABASE_S3_ACCESS_KEY_ID,
    SUPABASE_S3_SECRET_ACCESS_KEY: process.env.SUPABASE_S3_SECRET_ACCESS_KEY,
    SUPABASE_S3_BUCKET_NAME: process.env.SUPABASE_S3_BUCKET_NAME || 'drishtivongi-bucket',
};
exports.default = ENV;
