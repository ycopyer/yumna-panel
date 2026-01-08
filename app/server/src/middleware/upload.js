const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const userId = req.headers['x-user-id'] || 'unknown';
        cb(null, `avatar-${userId}-${Date.now()}${ext}`);
    }
});

// Use memory storage for avatars so we can process them with Sharp before saving
const uploadAvatar = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB is more than enough for avatars
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPG, PNG, WEBP and GIF are allowed.'));
        }
    }
});

const uploadMulti = multer({ storage: multer.memoryStorage() });

module.exports = {
    uploadAvatar,
    uploadMulti
};
