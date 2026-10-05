import multer from 'multer';
import multerS3 from 'multer-s3';
import { s3Client } from './s3';
import path from 'path';
import { Request } from 'express';
import ENV from '../../config';
import os from 'os';
import fs from 'fs';

const bucketName = ENV.SUPABASE_S3_BUCKET_NAME || 'drishtivongi-bucket';

// Set up S3 storage using multer-s3
const s3Storage = multerS3({
  s3: s3Client,
  bucket: bucketName,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  key: function (req: Request, file, cb) {
    // Dynamically organize files by module/folder and date
    // Extract base path (e.g. "cases", "users") from route
    const routePrefix = req.baseUrl ? req.baseUrl.split('/').pop() || 'uploads' : 'uploads';
    const fieldName = file.fieldname || 'media';
    const dateStr = new Date().toISOString().split('T')[0]; // e.g. 2026-09-27
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    
    // Construct dynamic path: folder (e.g. cases) / fieldName / date / unique_filename.ext
    const fullPath = `${routePrefix}/${fieldName}/${dateStr}/${uniqueSuffix}${ext}`;
    
    cb(null, fullPath);
  }
});


// Fallback to local disk storage if S3 credentials are not set
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(os.tmpdir(), 'civiclens_uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const storage = ENV.SUPABASE_S3_ACCESS_KEY_ID ? s3Storage : diskStorage;

const SUPPORTED_IMAGE_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // If the file is an image, ensure it's a supported format
  if (file.mimetype.startsWith('image/')) {
    if (SUPPORTED_IMAGE_FORMATS.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported image format. Received: ${file.mimetype}`));
    }
  } else {
    // Accept other file types (videos, documents)
    cb(null, true);
  }
};

// Configure Multer with appropriate storage, size limits, and basic file filtering
export const upload = multer({ 
  storage: storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit to 10MB per file to optimize performance
  }
});
