const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
// Ensure .env is loaded from the correct absolute path (Server Root)
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const rateLimit = require('express-rate-limit');
const { firewallCheck } = require('./middleware/firewall');
const { responseMonitor } = require('./middleware/responseMonitor');
const { advancedFirewallCheck } = require('./middleware/advancedFirewall');

const app = express();


// Rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50, // Increased for smoother testing
    message: { error: 'Too many login attempts, please try again after 15 minutes.' }
});

app.use(morgan('dev'));
app.use(cors({
    origin: true, // Allow all origins in production for stability, or use process.env.CORS_ORIGIN
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-session-id']
}));

// Security headers
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    frameguard: { action: "sameorigin" },
    hsts: true,
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// Body Parsers (Must be BEFORE firewallCheck to use req.body)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Installation Route (Exempt from ALL database-dependent middlewares)
app.use('/api/install', require('./routes/install'));

// 1. Initial Access Security: Block .env & System Files
app.use((req, res, next) => {
    const sensitiveFiles = [/\.env/i, /\.git/i, /\.htaccess/i, /web\.config/i];
    if (sensitiveFiles.some(pattern => pattern.test(req.path))) {
        return res.status(403).json({ error: 'Forbidden: Access to system files is restricted.' });
    }
    next();
});

// 2. Global Firewall Check (Blocks IPs and Users)
app.use(firewallCheck);

// 3. Advanced Firewall (Whitelist, Geo-blocking, Rate Limiting)
app.use(advancedFirewallCheck);

// 4. Response Code Monitor (Auto-block suspicious IPs)
app.use(responseMonitor);

// Rate limiting
app.use('/api/', generalLimiter);
app.use('/api/login', authLimiter);
app.use('/api/captcha', authLimiter);
app.use('/api/verify-2fa', authLimiter);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount all routers at /api since they now contain the full relative paths
app.use('/api', require('./routes/auth/auth'));
app.use('/api', require('./routes/auth/users'));
app.use('/api', require('./routes/auth/profile'));
app.use('/api', require('./routes/files/explorer'));
app.use('/api', require('./routes/fileOps/index')); // Points to fileOps/index.js
app.use('/api', require('./routes/sharing/shareMgmt'));
app.use('/api', require('./routes/sharing/sharePublic'));
app.use('/api', require('./routes/system/settings'));
app.use('/api', require('./routes/system/analytics'));
app.use('/api', require('./routes/files/favorites'));
app.use('/api', require('./routes/files/trash'));
app.use('/api', require('./routes/files/search'));
app.use('/api', require('./routes/files/archive'));
app.use('/api', require('./routes/security/firewall'));
app.use('/api', require('./routes/security/compliance'));
app.use('/api', require('./routes/security/advancedFirewall'));
app.use('/api', require('./routes/system/utility'));
app.use('/api', require('./routes/hosting')); // Points to index.js
app.use('/api', require('./routes/system/notifications'));
app.use('/api', require('./routes/system/services'));

// Serve Frontend in Production
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// Catch-all route for SPA (React Router)
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/uploads/')) {
        res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
            if (err) {
                // If index.html doesn't exist, just send a 404 or a basic response
                res.status(404).send('Frontend build not found. Please run "npm run build" in the client directory.');
            }
        });
    } else {
        // If it IS an API request but no route matched above
        res.status(404).json({ error: 'API Endpoint Not Found' });
    }
});

module.exports = app;
