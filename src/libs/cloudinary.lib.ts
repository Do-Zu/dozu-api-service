import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export const uploadImage = async (fileBuffer: Buffer): Promise<UploadApiResponse | undefined> => {
    const uploadResult = await new Promise<UploadApiResponse | undefined>(resolve => {
        cloudinary.uploader
            .upload_stream({ folder: 'dozu' }, (error, uploadResult) => {
                return resolve(uploadResult);
            })
            .end(fileBuffer);
    });

    return uploadResult;
};

export default cloudinary;
