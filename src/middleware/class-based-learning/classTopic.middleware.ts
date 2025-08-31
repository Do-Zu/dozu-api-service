import { Forbidden } from '@/core/error';
import requestHelper from '@/core/request/request.helper';
import { NextFunction, Request, Response } from 'express';

class ClassTopicMiddleware {
    public verifyTopicBelongsToClass = async (req: Request, res: Response, next: NextFunction) => {
        const classId = requestHelper.getIdParam(req, 'classId');
        const topic = requestHelper.getResource(req, 'topic');
        if (topic && topic.classId === classId) {
            requestHelper.setResource(req, 'topic', topic);
            next();
        } else {
            throw new Forbidden('Topic does not belong to the provided Class');
        }
    };
}

export default new ClassTopicMiddleware();
