import { Request, Response } from 'express';
import { BadRequest } from '@/core/error';
import { SuccessResponse } from '@/core/success';
import requestHelper from '@/core/request/request.helper';

import { getClassworkInClassService } from '@/services/class-based-learning/classwork.service';

export const getClassworkInClassController = async (req: Request, res: Response) => {


    const classId = requestHelper.getIdParam(req, 'classId');

    if (!classId) {
        throw new BadRequest('Missing class id');
    }

    //fetch all types of class work
    const data = await getClassworkInClassService({ classId });
    if (data.success) {
        const returnData = {
            ...data,
        };
        SuccessResponse.ok(res, returnData);
    } else {
        throw new BadRequest('Invalid request');
    }
}
