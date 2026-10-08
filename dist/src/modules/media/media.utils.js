"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeDeleteMedia = exports.deleteMulterFiles = exports.deleteFileFromStorage = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_1 = require("../../lib/s3");
const config_1 = __importDefault(require("../../../config"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const deleteFileFromStorage = async (fileUrl) => {
    if (!fileUrl)
        return;
    try {
        if (fileUrl.startsWith('/uploads/')) {
            // Local file fallback
            const filename = fileUrl.split('/').pop();
            if (filename) {
                const filepath = path_1.default.join(os_1.default.tmpdir(), 'civiclens_uploads', filename);
                if (fs_1.default.existsSync(filepath)) {
                    fs_1.default.unlinkSync(filepath);
                    console.log(`[Media] Deleted local file: ${filepath}`);
                }
            }
        }
        else if (fileUrl.includes('supabase.co')) {
            // Supabase S3
            const bucketName = config_1.default.SUPABASE_S3_BUCKET_NAME || 'drishtivongi-bucket';
            let key = '';
            if (fileUrl.includes('/object/public/')) {
                const parts = fileUrl.split(`/object/public/${bucketName}/`);
                if (parts.length > 1) {
                    key = parts[1];
                }
            }
            else if (fileUrl.includes(bucketName)) {
                const parts = fileUrl.split(`/${bucketName}/`);
                if (parts.length > 1) {
                    key = parts[1];
                }
            }
            if (key) {
                const command = new client_s3_1.DeleteObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                });
                await s3_1.s3Client.send(command);
                console.log(`[Media] Deleted S3 file: ${key}`);
            }
        }
    }
    catch (err) {
        console.error(`[Media] Failed to delete file ${fileUrl}:`, err);
    }
};
exports.deleteFileFromStorage = deleteFileFromStorage;
const deleteMulterFiles = async (files) => {
    try {
        let fileArray = [];
        if (Array.isArray(files)) {
            fileArray = files;
        }
        else if (typeof files === 'object' && files !== null) {
            Object.values(files).forEach((val) => {
                if (Array.isArray(val))
                    fileArray.push(...val);
            });
        }
        for (const file of fileArray) {
            let loc = file.location || (file.filename ? `/uploads/${file.filename}` : undefined);
            if (loc && loc.includes('.storage.supabase.co')) {
                loc = loc.replace('.storage.supabase.co/', '.supabase.co/storage/v1/object/public/');
            }
            if (loc) {
                await (0, exports.deleteFileFromStorage)(loc);
            }
        }
    }
    catch (e) {
        console.error("[Media] Failed to delete multer files:", e);
    }
};
exports.deleteMulterFiles = deleteMulterFiles;
const safeDeleteMedia = async (mediaId, db) => {
    // Check if the media is referenced by anything else
    const media = await db.media.findUnique({
        where: { id: mediaId },
        include: {
            _count: {
                select: {
                    caseMedias: true,
                    claimMedias: true,
                    evidenceMedias: true,
                    opinionMedias: true
                }
            }
        }
    });
    if (!media)
        return;
    const totalReferences = media._count.caseMedias +
        media._count.claimMedias +
        media._count.evidenceMedias +
        media._count.opinionMedias;
    // If there are NO other references (or just 1 which is the one currently being deleted/was just deleted),
    // wait, if we call this AFTER removing the reference, totalReferences should be 0.
    if (totalReferences <= 0) {
        // Delete from storage
        await (0, exports.deleteFileFromStorage)(media.url);
        // Delete from DB
        await db.media.delete({ where: { id: mediaId } });
    }
};
exports.safeDeleteMedia = safeDeleteMedia;
