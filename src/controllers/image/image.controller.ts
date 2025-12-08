import { Request, Response } from 'express';
import { uploadImage as uploadImageToCloudinary } from '@/libs/cloudinary.lib';
import { SuccessResponse } from '@/core/success';

class ImageController {
    public async uploadImage(req: Request, res: Response) {
        const imageFile = req.file;

        let imageUrl: string | null = null;
        if (imageFile) {
            const imageObject = await uploadImageToCloudinary(imageFile.buffer);
            if (!imageObject) {
                throw new Error('Cannot upload image');
            }
            imageUrl = imageObject.secure_url;
        }

        if (!imageUrl) {
            throw new Error('Cannot upload image');
        }

        SuccessResponse.ok(res, { imageUrl });
    }
}

export default new ImageController();
