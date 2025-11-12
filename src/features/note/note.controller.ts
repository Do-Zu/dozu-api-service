import { BadRequest, NotFoundError } from '@/core/error';
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
            .insert(notesTable)
            .values({ userId, topicId })
            .onConflictDoNothing({ target: [notesTable.userId, notesTable.topicId] })
            .returning();

        if (!result) {
            const [existing] = await db
                .select()
                .from(notesTable)
                .where(and(eq(notesTable.userId, userId), eq(notesTable.topicId, topicId)));

            if (!existing) {
                throw new NotFoundError('Note not found');
            }
            SuccessResponse.ok(res, existing);
        }

        SuccessResponse.ok(res, result);
    }

    public async updateNoteById(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        const noteId = requestHelper.getIdParam(req, 'noteId');
        const { content } = req.body as IUpdateNoteBody;
        if (content === null || content === undefined) {
            throw new BadRequest('Content is required');
        }

        const [result] = await db
            .update(notesTable)
            .set({ content })
            .where(and(eq(notesTable.userId, userId), eq(notesTable.noteId, noteId)))
            .returning();

        if (!result) {
            throw new NotFoundError('Note not found');
        }

        SuccessResponse.ok(res, result);
    }
}

export default new NoteController();
