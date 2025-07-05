import multer from 'multer';

const storage = multer.memoryStorage(); // store in RAM for fast upload to Cloudinary
const fileUpload = multer({ storage });

export default fileUpload;

export const fileUploadSingleMiddleware = fileUpload.single('file');
