const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const fs = require('fs').promises;

class StorageService {
    constructor() {
        // Initialize S3 client
        this.s3 = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION
        });

        this.bucketName = process.env.S3_BUCKET_NAME;
        
        // Set up local storage as fallback
        this.uploadsDir = path.join(__dirname, '../uploads');
        this.ensureUploadsDirectory();
    }

    async ensureUploadsDirectory() {
        try {
            await fs.access(this.uploadsDir);
        } catch {
            await fs.mkdir(this.uploadsDir, { recursive: true });
            await fs.mkdir(path.join(this.uploadsDir, 'designs'), { recursive: true });
            await fs.mkdir(path.join(this.uploadsDir, 'logos'), { recursive: true });
            await fs.mkdir(path.join(this.uploadsDir, 'projects'), { recursive: true });
            await fs.mkdir(path.join(this.uploadsDir, 'profile'), { recursive: true });
        }
    }

    // S3 Storage Configuration
    getS3Storage() {
        return multerS3({
            s3: this.s3,
            bucket: this.bucketName,
            metadata: (req, file, cb) => {
                cb(null, { fieldName: file.fieldname });
            },
            key: (req, file, cb) => {
                const filename = `${Date.now()}-${file.originalname}`;
                const folder = this.getFileFolder(file.mimetype);
                cb(null, `${folder}/${filename}`);
            }
        });
    }

    // Local Storage Configuration (fallback)
    getLocalStorage() {
        return multer.diskStorage({
            destination: (req, file, cb) => {
                const folder = this.getFileFolder(file.mimetype);
                const uploadPath = path.join(this.uploadsDir, folder);
                
                fs.mkdir(uploadPath, { recursive: true })
                    .then(() => cb(null, uploadPath))
                    .catch(err => cb(err, uploadPath));
            },
            filename: (req, file, cb) => {
                const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
                cb(null, uniqueName);
            }
        });
    }

    getFileFolder(mimetype) {
        if (mimetype.startsWith('image/')) {
            if (mimetype.includes('svg') || file.originalname.includes('logo')) {
                return 'logos';
            }
            return 'designs';
        }
        
        if (mimetype.includes('pdf') || mimetype.includes('document')) {
            return 'projects';
        }
        
        if (mimetype.includes('video')) {
            return 'videos';
        }
        
        return 'others';
    }

    // Upload middleware
    getUploadMiddleware(fieldName, maxCount = 1) {
        const storage = process.env.USE_S3 === 'true' 
            ? this.getS3Storage() 
            : this.getLocalStorage();

        const fileFilter = (req, file, cb) => {
            const allowedTypes = /jpeg|jpg|png|gif|svg|pdf|doc|docx|mp4|mov|avi/;
            const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
            const mimetype = allowedTypes.test(file.mimetype);

            if (extname && mimetype) {
                return cb(null, true);
            }
            cb(new Error('Error: File type not supported!'));
        };

        const upload = multer({
            storage,
            fileFilter,
            limits: {
                fileSize: 50 * 1024 * 1024 // 50MB limit
            }
        });

        if (maxCount > 1) {
            return upload.array(fieldName, maxCount);
        }
        return upload.single(fieldName);
    }

    // Upload file
    async uploadFile(fileBuffer, fileName, folder = 'uploads') {
        try {
            if (process.env.USE_S3 === 'true') {
                const params = {
                    Bucket: this.bucketName,
                    Key: `${folder}/${fileName}`,
                    Body: fileBuffer,
                    ContentType: this.getContentType(fileName),
                    ACL: 'public-read'
                };

                const result = await this.s3.upload(params).promise();
                return {
                    url: result.Location,
                    key: result.Key,
                    bucket: result.Bucket
                };
            } else {
                // Local storage
                const uploadPath = path.join(this.uploadsDir, folder, fileName);
                await fs.writeFile(uploadPath, fileBuffer);
                
                return {
                    url: `/uploads/${folder}/${fileName}`,
                    path: uploadPath
                };
            }
        } catch (error) {
            console.error('File upload failed:', error);
            throw error;
        }
    }

    // Delete file
    async deleteFile(fileUrl) {
        try {
            if (process.env.USE_S3 === 'true' && fileUrl.includes('amazonaws.com')) {
                const key = fileUrl.split('.com/')[1];
                await this.s3.deleteObject({
                    Bucket: this.bucketName,
                    Key: key
                }).promise();
            } else if (fileUrl.startsWith('/uploads/')) {
                const filePath = path.join(__dirname, '..', fileUrl);
                await fs.unlink(filePath);
            }
        } catch (error) {
            console.error('File deletion failed:', error);
            throw error;
        }
    }

    // Get file URL
    getFileUrl(fileKey) {
        if (process.env.USE_S3 === 'true') {
            return `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
        }
        return `/uploads/${fileKey}`;
    }

    // Generate signed URL for private files
    async getSignedUrl(fileKey, expiresIn = 3600) {
        if (process.env.USE_S3 !== 'true') {
            throw new Error('Signed URLs only available with S3 storage');
        }

        const params = {
            Bucket: this.bucketName,
            Key: fileKey,
            Expires: expiresIn
        };

        return this.s3.getSignedUrl('getObject', params);
    }

    // List files in a folder
    async listFiles(prefix = '', maxKeys = 100) {
        if (process.env.USE_S3 === 'true') {
            const params = {
                Bucket: this.bucketName,
                Prefix: prefix,
                MaxKeys: maxKeys
            };

            const data = await this.s3.listObjectsV2(params).promise();
            return data.Contents.map(item => ({
                key: item.Key,
                size: item.Size,
                lastModified: item.LastModified,
                url: this.getFileUrl(item.Key)
            }));
        } else {
            const dirPath = path.join(this.uploadsDir, prefix);
            const files = await fs.readdir(dirPath);
            
            const fileDetails = await Promise.all(
                files.map(async (file) => {
                    const filePath = path.join(dirPath, file);
                    const stats = await fs.stat(filePath);
                    
                    return {
                        key: path.join(prefix, file),
                        size: stats.size,
                        lastModified: stats.mtime,
                        url: `/uploads/${prefix}/${file}`
                    };
                })
            );
            
            return fileDetails;
        }
    }

    getContentType(fileName) {
        const ext = path.extname(fileName).toLowerCase();
        const contentTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.mp4': 'video/mp4',
            '.mov': 'video/quicktime',
            '.avi': 'video/x-msvideo'
        };
        
        return contentTypes[ext] || 'application/octet-stream';
    }
}

module.exports = new StorageService();
