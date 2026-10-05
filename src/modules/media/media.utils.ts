import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../../lib/s3';
import ENV from '../../../config';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const deleteFileFromStorage = async (fileUrl: string) => {
    if (!fileUrl) return;

    try {
        if (fileUrl.startsWith('/uploads/')) {
            // Local file fallback
            const filename = fileUrl.split('/').pop();
            if (filename) {
                const filepath = path.join(os.tmpdir(), 'civiclens_uploads', filename);
                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath);
                    console.log(`[Media] Deleted local file: ${filepath}`);
                }
            }
        } else if (fileUrl.includes('supabase.co')) {
            // Supabase S3
            const bucketName = ENV.SUPABASE_S3_BUCKET_NAME || 'drishtivongi-bucket';
            let key = '';
            
            if (fileUrl.includes('/object/public/')) {
                const parts = fileUrl.split(`/object/public/${bucketName}/`);
                if (parts.length > 1) {
                    key = parts[1];
                }
            } else if (fileUrl.includes(bucketName)) {
                 const parts = fileUrl.split(`/${bucketName}/`);
                 if (parts.length > 1) {
                     key = parts[1];
                 }
            }
            
            if (key) {
                const command = new DeleteObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                });
                await s3Client.send(command);
                console.log(`[Media] Deleted S3 file: ${key}`);
            }
        }
    } catch (err) {
        console.error(`[Media] Failed to delete file ${fileUrl}:`, err);
    }
};

export const deleteMulterFiles = async (files: any[] | { [fieldname: string]: any[] }) => {
    try {
        let fileArray: any[] = [];
        if (Array.isArray(files)) {
            fileArray = files;
        } else if (typeof files === 'object' && files !== null) {
            Object.values(files).forEach((val) => {
                if (Array.isArray(val)) fileArray.push(...val);
            });
        }

        for (const file of fileArray) {
            let loc = file.location || (file.filename ? `/uploads/${file.filename}` : undefined);
            if (loc && loc.includes('.storage.supabase.co')) {
                loc = loc.replace('.storage.supabase.co/', '.supabase.co/storage/v1/object/public/');
            }
            if (loc) {
                await deleteFileFromStorage(loc);
            }
        }
    } catch (e) {
        console.error("[Media] Failed to delete multer files:", e);
    }
};

export const safeDeleteMedia = async (mediaId: string, db: any) => {
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

    if (!media) return;

    const totalReferences = 
        media._count.caseMedias + 
        media._count.claimMedias + 
        media._count.evidenceMedias + 
        media._count.opinionMedias;

    // If there are NO other references (or just 1 which is the one currently being deleted/was just deleted),
    // wait, if we call this AFTER removing the reference, totalReferences should be 0.
    if (totalReferences <= 0) {
        // Delete from storage
        await deleteFileFromStorage(media.url);
        // Delete from DB
        await db.media.delete({ where: { id: mediaId } });
    }
};
