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

// note: you can get imagePublicId by using extractPublicId function in cloudinary-build-url library
export const updateImage = async (
    imagePublicId: string,
    fileBuffer: Buffer
): Promise<UploadApiResponse | undefined> => {
    const uploadResult = await new Promise<UploadApiResponse | undefined>(resolve => {
        cloudinary.uploader
            .upload_stream({ folder: 'dozu', public_id: imagePublicId, overwrite: true }, (error, uploadResult) => {
                return resolve(uploadResult);
            })
            .end(fileBuffer);
    });

    return uploadResult;
};

// note: you can get imagePublicId by using extractPublicId function in cloudinary-build-url library
export const deleteImage = async (
    imagePublicId: string
) => {
    const deleteResult = await new Promise(resolve => {
        cloudinary.uploader.destroy(imagePublicId, {}, (error, destroyResult) => {
            return resolve(destroyResult);
        })
    })

    return deleteResult;
}

export default cloudinary;
