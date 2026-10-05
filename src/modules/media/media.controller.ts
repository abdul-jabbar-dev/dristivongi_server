import { Request, Response } from 'express';
import { db } from '../../../lib/prisma';
import GlobalError from '../../../error/GlobalError';
import Res from '../../../sheare/response';
import httpStatus from 'http-status';
import fetch from 'node-fetch';
import { s3Client } from '../../lib/s3';
import ENV from '../../../config';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { pipeline } from 'stream/promises';

const bucketName = ENV.SUPABASE_S3_BUCKET_NAME || 'drishtivongi-bucket';

const isUrlSafe = (url: string) => {
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) return false;
        
        const hostname = parsed.hostname.toLowerCase();
        
        // Basic SSRF protection (don't fetch from internal/private IPs)
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return false;
        if (hostname.match(/^10\./) || hostname.match(/^192\.168\./) || hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) return false;
        if (hostname.match(/^169\.254\./)) return false; // Cloud metadata
        
        return true;
    } catch (e) {
        return false;
    }
};

const importUrl = async (req: Request, res: Response) => {
    const { url } = req.body;
    
    if (!url) {
        GlobalError(res, "URL is required", "URL is required", httpStatus.BAD_REQUEST);
        return;
    }
    
    if (!isUrlSafe(url)) {
        GlobalError(res, "Invalid or unsafe URL", "Invalid or unsafe URL", httpStatus.FORBIDDEN);
        return;
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, 10000);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'DrishtivongiBot/1.0',
            },
            signal: controller.signal as any
        });
        clearTimeout(timeout);
        
        if (!response.ok) {
            GlobalError(res, `Failed to fetch external media: ${response.statusText}`, `Failed to fetch external media: ${response.statusText}`, httpStatus.BAD_REQUEST);
            return;
        }
        
        const contentLength = response.headers.get('content-length');
        const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
        
        if (contentLength && parseInt(contentLength) > MAX_SIZE) {
            GlobalError(res, "ভিডিওটি ৫০ MB-এর বেশি হওয়ায় যোগ করা যায়নি।", "ভিডিওটি ৫০ MB-এর বেশি হওয়ায় যোগ করা যায়নি।", httpStatus.REQUEST_ENTITY_TOO_LARGE);
            return;
        }
        
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        
        // Only allow basic media types
        if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
            GlobalError(res, "Unsupported media format", "Unsupported media format", httpStatus.UNSUPPORTED_MEDIA_TYPE);
            return;
        }

        const buffer = await response.buffer();
        
        if (buffer.length > MAX_SIZE) {
            GlobalError(res, "ভিডিওটি ৫০ MB-এর বেশি হওয়ায় যোগ করা যায়নি।", "ভিডিওটি ৫০ MB-এর বেশি হওয়ায় যোগ করা যায়নি।", httpStatus.REQUEST_ENTITY_TOO_LARGE);
            return;
        }
        
        let finalUrl = '';
        
        const dateStr = new Date().toISOString().split('T')[0];
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        // Extract extension from content-type or URL
        const ext = contentType.split('/')[1]?.split(';')[0] ? `.${contentType.split('/')[1]?.split(';')[0]}` : path.extname(new URL(url).pathname) || '.bin';
        
        if (ENV.SUPABASE_S3_ACCESS_KEY_ID) {
            const key = `imports/${dateStr}/${uniqueSuffix}${ext}`;
            
            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: buffer,
                ContentType: contentType,
            });
            
            await s3Client.send(command);
            
            // Construct the public URL (this logic depends on your S3 endpoint setup)
            // Using typical Supabase S3 URL format
            const endpoint = ENV.SUPABASE_S3_ENDPOINT || 'https://dummy.supabase.co/storage/v1/s3';
            finalUrl = `${endpoint}/${bucketName}/${key}`;
        } else {
            // Local disk fallback
            const dir = path.join(os.tmpdir(), 'civiclens_uploads');
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const filename = `${uniqueSuffix}${ext}`;
            const filepath = path.join(dir, filename);
            fs.writeFileSync(filepath, buffer);
            
            finalUrl = `/uploads/${filename}`; // Adjust based on how local static files are served
        }
        
        try {
            const media = await db.media.create({
                data: {
                    url: finalUrl,
                    type: contentType
                }
            });

            Res.send(res, media, "Media imported successfully", httpStatus.OK);
        } catch (dbError) {
            // DB creation failed, delete the newly uploaded file
            const { deleteFileFromStorage } = await import('./media.utils');
            await deleteFileFromStorage(finalUrl);
            throw dbError; // let the outer catch handle it
        }
        
    } catch (error: any) {
        GlobalError(res, error, `Media import failed: ${error.message}`, httpStatus.INTERNAL_SERVER_ERROR);
    }
};

const mediaController = {
    importUrl
};

export default mediaController;
