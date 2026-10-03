import { S3Client } from '@aws-sdk/client-s3';
import ENV from '../../config';

// Supabase S3 credentials
let endpoint = ENV.SUPABASE_S3_ENDPOINT;

if (!endpoint) {
  console.warn("⚠️ WARNING: Missing SUPABASE_S3_ENDPOINT in environment variables. S3 uploads will fail until this is set in .env!");
  endpoint = 'https://dummy.supabase.co/storage/v1/s3'; // fallback so the server doesn't crash on boot
}

export const s3Client = new S3Client({
  forcePathStyle: true,
  region: ENV.SUPABASE_S3_REGION,
  endpoint,
  credentials: {
    accessKeyId: ENV.SUPABASE_S3_ACCESS_KEY_ID || '',
    secretAccessKey: ENV.SUPABASE_S3_SECRET_ACCESS_KEY || '',
  },
});


