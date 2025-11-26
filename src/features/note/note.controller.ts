import { BadRequest } from '@/core/error';
import requestHelper from '@/core/request/request.helper';
import { SuccessResponse } from '@/core/success';
import db from '@/libs/drizzleClient.lib';
import { notesTable } from '@/models';
import { getUserIdFromRequest } from '@/utils/auth/authHelpers.utils';
import { and, eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import { IUpdateNoteBody } from './note.type';

class NoteController {
    public async getNoteForTopic(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        const topicId = requestHelper.getIdParam(req, 'topicId');
        const [result] = await db
            .select()
            .from(notesTable)
            .where(and(eq(notesTable.userId, userId), eq(notesTable.topicId, topicId)));

        SuccessResponse.ok(res, result ?? null);
    }

    public async updateNote(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        const topicId = requestHelper.getIdParam(req, 'topicId');

        const { content } = req.body as IUpdateNoteBody;
        if (content === null || content === undefined) {
            throw new BadRequest('Content is required');
        }

        const [result] = await db
            .insert(notesTable)
            .values({ userId, topicId, content })
            .onConflictDoUpdate({ target: [notesTable.userId, notesTable.topicId], set: { content } })
            .returning();

        SuccessResponse.ok(res, result);
    }
}

export default new NoteController();
