import { Request, Response } from 'express';
import { generativeService } from '@/services/generative/v3/generative.service';
import { SuccessResponse } from '@/core/success';
import { BadRequest } from '@/core/error';
import { GenerateContentRequestInterface, JobStatusResponseInterface } from '@/dtos/generate';
import { isEmpty, lowercase } from '@/utils/common';
import logger from '@/utils/logger';

class GenerateController {
    constructor() { }

    public async generateContent(req: Request, res: Response) {
        const { content, type, inputSetId, method } = req.body as GenerateContentRequestInterface;

        if (!content) {
            throw new BadRequest('Content is required');
        }

        if (isEmpty(type)) {
            throw new BadRequest('Type is required');
        }

        const jobInfo = await generativeService.registerGenerateContentByLLM({ content, type, inputSetId, method });

        SuccessResponse.accepted(
            res,
            {
                ...jobInfo,
                sse: {
                    event: jobInfo.status,
                },
            },
            'Content generation in progress'
        );
    }

    public async streamGenerateContent(req: Request, res: Response) {

        const { content, type, inputSetId, method } = req.body as GenerateContentRequestInterface;

        if (!content) {
            throw new BadRequest('Content is required');
        }

        if (isEmpty(type)) {
            throw new BadRequest('Type is required');
        }


        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        });

        res.write(`data: ${JSON.stringify({ status: 'connected' })}\n\n`);


        await generativeService.streamGenerateContent({ content, type, inputSetId, method }, res)

        res.on('close', () => {
            logger.info(`Client disconnected`);
        });
    }


    public async getGenerateContentStatus(req: Request, res: Response<JobStatusResponseInterface>) {
        const { jobId, type } = req.body;

        if (!jobId) {
            throw new BadRequest('Job ID is required ');
        }

        const result = await generativeService.getJobStatus(jobId, type);

        SuccessResponse.ok(res, result);
    }


}

export const generateController = new GenerateController();
