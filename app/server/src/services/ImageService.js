const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

class ImageService {
    static async processImage(filePath, operations) {
        try {
            if (!fs.existsSync(filePath)) throw new Error('File not found');

            let image = sharp(filePath);
            const metadata = await image.metadata();

            for (const op of operations) {
                switch (op.type) {
                    case 'resize':
                        image = image.resize(op.width, op.height, { fit: op.fit || 'cover' });
                        break;
                    case 'crop':
                        image = image.extract({
                            left: op.left,
                            top: op.top,
                            width: op.width,
                            height: op.height
                        });
                        break;
                    case 'rotate':
                        image = image.rotate(op.angle || 90);
                        break;
                    case 'flip':
                        image = image.flip();
                        break;
                    case 'flop':
                        image = image.flop();
                        break;
                    case 'grayscale':
                        image = image.grayscale();
                        break;
                    case 'blur':
                        image = image.blur(op.sigma || 5);
                        break;
                }
            }

            // Always output to a temporary path first
            const ext = path.extname(filePath);
            const tempPath = filePath + `.tmp${Date.now()}${ext}`;

            await image.toFile(tempPath);

            // Replace original if requested or return as buffer
            return tempPath;

        } catch (err) {
            console.error('[ImageService] Processing failed:', err.message);
            throw err;
        }
    }

    static async getInfo(filePath) {
        try {
            const metadata = await sharp(filePath).metadata();
            return {
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
                size: metadata.size,
                hasAlpha: metadata.hasAlpha
            };
        } catch (err) {
            throw err;
        }
    }
}

module.exports = ImageService;
