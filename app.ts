import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import os from 'os';

import { upload } from './lib/multer'; 
import apiRoutes from './router';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Simple Cookie Parser Middleware (Since cookie-parser package is missing)
app.use((req, res, next) => {
    req.cookies = {};
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const parts = cookie.split('=');
            req.cookies[parts.shift()!.trim()] = decodeURI(parts.join('='));
        });
    }
    next();
});

// Serve local fallback uploads
app.use(
  '/tmp/civiclens_uploads', 
  express.static(path.join(os.tmpdir(), 'civiclens_uploads'))
);


// Basic Route
app.get('/', (req, res) => {
    res.json({
        brand: "দৃষ্টিভঙ্গি",
        english: "Drishtivongi",
        slug: "drishtivongi",
        message: "Welcome to Drishtivongi API"
    });
});

app.use('/api/v1', apiRoutes)

// Example file upload route
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ message: 'File uploaded successfully', file: req.file });
});

export default app
