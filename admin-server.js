import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import fsSync from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- PERSISTENT STORAGE SETUP ---
const DATA_DIR = fsSync.existsSync('/data') ? '/data' : path.join(__dirname, 'public');

if (DATA_DIR === '/data') {
    const targetDataPath = path.join('/data', 'data.json');
    if (!fsSync.existsSync(targetDataPath)) {
        console.log('Initializing /data bucket with default data.json...');
        try {
            fsSync.copyFileSync(path.join(__dirname, 'public', 'data.json'), targetDataPath);
        } catch(e) {
            console.error('Failed to copy initial data.json:', e);
        }
    }
}

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Bind to 0.0.0.0 to allow Hugging Face proxy routing
const ALLOWED_ADMIN_EMAIL = 'krishu8986@gmail.com'; // CRITICAL SECURITY: Hardcoded admin email.

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disabled just for local admin UI ease of use
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allows fetching images/pdfs from Vercel
    xFrameOptions: false // Allow embedding inside Hugging Face Spaces iframe
}));
app.use(cors({
    origin: '*', // Allow Vercel frontend to fetch API and data
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session Setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-super-secret-key-1234',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Since we run on localhost without HTTPS
        httpOnly: true, // Prevents XSS from reading the cookie
        sameSite: 'strict', // Prevents CSRF attacks
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport Google OAuth Configuration
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'dummy',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy',
    callbackURL: `http://${HOST}:${PORT}/auth/google/callback`
  },
  function(accessToken, refreshToken, profile, cb) {
      // CRITICAL SECURITY: Check if the logged in email matches the hardcoded admin email
      const email = profile.emails && profile.emails[0] && profile.emails[0].value;
      if (email === ALLOWED_ADMIN_EMAIL) {
          return cb(null, profile);
      } else {
          return cb(new Error("Unauthorized Email Address"), false);
      }
  }
));

passport.serializeUser((user, cb) => cb(null, user));
passport.deserializeUser((obj, cb) => cb(null, obj));

// Authentication Middleware
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ error: 'Unauthorized. Please login.' });
};

// --- ROUTES ---

// Serve the Admin UI and Public assets
app.use('/', express.static(path.join(__dirname, 'admin-ui')));

// If using persistent storage, serve the dynamic files from the bucket FIRST so they override defaults
if (DATA_DIR === '/data') {
    app.use('/devices.json', (req, res) => res.status(403).send('Forbidden')); // Prevent leaking trusted device IDs
    app.use(express.static('/data'));
}
app.use(express.static(path.join(__dirname, 'public'))); // Serve default vault files, images, and data.json

// Auth Routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

const devicesFilePath = path.join(DATA_DIR, 'devices.json');

async function getRegisteredDevices() {
    try {
        const data = await fs.readFile(devicesFilePath, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function saveRegisteredDevices(devices) {
    await fs.writeFile(devicesFilePath, JSON.stringify(devices, null, 2));
}

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login-failed.html' }),
  async function(req, res) {
      const deviceId = req.cookies.device_id;
      let registeredDevices = await getRegisteredDevices();
      
      // If device is already registered, allow login
      if (deviceId && registeredDevices.includes(deviceId)) {
          return res.redirect('/dashboard.html');
      }
      
      // If device is not registered, check limit
      if (registeredDevices.length < 2) {
          const newDeviceId = crypto.randomUUID();
          registeredDevices.push(newDeviceId);
          await saveRegisteredDevices(registeredDevices);
          res.cookie('device_id', newDeviceId, { maxAge: 10 * 365 * 24 * 60 * 60 * 1000, httpOnly: true }); // 10 years
          return res.redirect('/dashboard.html');
      }
      
      // Device limit reached
      req.logout((err) => {
          res.status(403).send(`
            <div style="font-family: sans-serif; text-align: center; margin-top: 100px;">
                <h1 style="color: red;">🔒 Device Limit Reached</h1>
                <p>You can only access the Admin Panel from your 2 primary devices (e.g. Phone and Laptop).</p>
                <p>This unauthorized device has been blocked.</p>
            </div>
          `);
      });
  }
);

app.get('/auth/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/');
    });
});

app.get('/api/me', isAuthenticated, (req, res) => {
    res.json({ email: req.user.emails[0].value, name: req.user.displayName });
});

// CMS API Routes
const dataFilePath = path.join(DATA_DIR, 'data.json');

app.get('/api/data', isAuthenticated, async (req, res) => {
    try {
        const data = await fs.readFile(dataFilePath, 'utf-8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: 'Failed to read data file' });
    }
});

app.post('/api/data', isAuthenticated, async (req, res) => {
    try {
        // Basic schema validation could go here
        const newData = req.body;
        
        if (!newData || !newData.projects) {
            return res.status(400).json({ error: 'Invalid data format' });
        }

        await fs.writeFile(dataFilePath, JSON.stringify(newData, null, 2), 'utf-8');
        res.json({ success: true, message: 'Portfolio updated successfully!' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save data file' });
    }
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }); // 15MB limit

app.post('/api/upload', isAuthenticated, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const data = await fs.readFile(dataFilePath, 'utf-8');
        const db = JSON.parse(data);
        const viewPin = db.vault?.view_pin || '1234';

        // 1. Derive key exactly as the frontend does (PBKDF2, 100k iterations, SHA-256)
        const salt = crypto.randomBytes(16);
        const key = crypto.pbkdf2Sync(viewPin, salt, 100000, 32, 'sha256');

        // 2. Encrypt using AES-256-GCM
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        
        let encrypted = cipher.update(req.file.buffer);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        const authTag = cipher.getAuthTag();

        // 3. Construct Final Format: [Salt (16)] + [IV (12)] + [Auth Tag (16)] + [Ciphertext]
        const finalBuffer = Buffer.concat([salt, iv, authTag, encrypted]);

        // 4. Save to vault
        const isImage = req.file.mimetype.includes('image');
        const ext = isImage ? '.png.enc' : '.pdf.enc';
        const fileId = req.body.fileId || `file_${Date.now()}`;
        const fileName = `${fileId}${ext}`;
        const vaultDir = path.join(DATA_DIR, 'vault');
        
        // Ensure vault directory exists
        try { await fs.mkdir(vaultDir, { recursive: true }); } catch (e) {}
        
        const filePath = path.join(vaultDir, fileName);
        await fs.writeFile(filePath, finalBuffer);
        
        res.json({ 
            success: true, 
            url: `/vault/${fileName}`, 
            size: (req.file.size / 1024).toFixed(0) + ' KB',
            type: isImage ? 'png' : 'pdf'
        });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: 'Failed to encrypt and save file' });
    }
});

app.post('/api/upload-public', isAuthenticated, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const isImage = req.file.mimetype.includes('image');
        const ext = isImage ? (req.file.mimetype.includes('jpeg') ? '.jpg' : '.png') : '.pdf';
        const fileId = req.body.fileId || `public_${Date.now()}`;
        const fileName = `${fileId}${ext}`;
        const publicDir = DATA_DIR;
        
        const filePath = path.join(publicDir, fileName);
        await fs.writeFile(filePath, req.file.buffer);
        
        res.json({ 
            success: true, 
            url: `/${fileName}`
        });
    } catch (error) {
        console.error("Public upload error:", error);
        res.status(500).json({ error: 'Failed to save public file' });
    }
});

// Start Server
app.listen(PORT, HOST, () => {
    console.log(`\n=========================================`);
    console.log(`🛡️ SECURE ADMIN PANEL SERVER RUNNING 🛡️`);
    console.log(`=========================================`);
    console.log(`URL: http://${HOST}:${PORT}`);
    console.log(`Allowed Admin: ${ALLOWED_ADMIN_EMAIL}`);
    console.log(`Listening strictly on localhost (${HOST}) to prevent network intrusion.`);
    if (!process.env.GOOGLE_CLIENT_ID) {
        console.warn(`\n⚠️ WARNING: GOOGLE_CLIENT_ID not found in .env`);
        console.warn(`OAuth will fail until you provide valid Google Cloud credentials.`);
    }
    console.log(`=========================================\n`);
});
