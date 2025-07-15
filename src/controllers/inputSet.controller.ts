import { BadRequest } from '@/core/error';
import { getDocumentService } from '@/services/inputSet/inputSet.service';
import { Response, Request } from 'express';

export const getInputSetDocumentController = async (req: Request, res: Response) => {
    const topicId = parseInt(req.params.topicId);
    if (!topicId) {
        throw new BadRequest('topicId is required');
    }

    const inputSetDocumentData = await getDocumentService(topicId);
    if (!inputSetDocumentData) {
        throw new Error('Error: Document does not exist');
    }
    switch (inputSetDocumentData.contentType) {
        case "application/pdf":
            res.set('Content-Type', 'application/pdf');
            res.sendFile(inputSetDocumentData.pdfPath);
            break;
        default:
            throw new Error('Error: file not compatible');
    }

    // SuccessResponse.ok(res, returnData);
};
