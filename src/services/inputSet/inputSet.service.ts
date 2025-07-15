import { getInputSetByTopicId } from '@/repositories/inputSet.repo';
import path from 'path';

export const getDocumentService = async (topicId: number) => {
    const inputSet = await getInputSetByTopicId(topicId);
    switch (inputSet.contentType) {
        case 'application/pdf': {
            // Ensure inputSet.metadata is a string
            const pdfPath = path.join(process.cwd(), inputSet.metadata as string);
            return { contentType: 'application/pdf', pdfPath: pdfPath };
            // implement other types later - DuyND
        }
    }
    // return inputSet;
};
