import { BadRequest, DatabaseError } from '@/core/error';
import { getUserIdFromRequest, isTeacher } from '@/utils/auth/authHelpers.utils';
import logger from '@/utils/logger';
import { Request, Response } from 'express';
import db from '@/libs/drizzleClient.lib';
import { eq } from 'drizzle-orm';
import { IClass, IJoinClassPayload } from '@/types/class-based-learning/class.type';
import { SuccessResponse } from '@/core/success';
import { classEnrollmentsTable, classesTable, IClassInserted } from '@/models';
import classService from '@/services/class-based-learning/class.service';

class ClassController {
    public async handleGetAllClasses(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        let classes: IClass[];
        const teacher = await isTeacher(req);
        try {
            if (teacher) {
                classes = await db
                    .select({
                        classId: classesTable.classId,
                        name: classesTable.name,
                        description: classesTable.description,
                        invitationCode: classesTable.invitationCode,
                        createdAt: classesTable.createdAt,
                    })
                    .from(classesTable)
                    .where(eq(classesTable.teacherId, userId));
            } else {
                classes = await db
                    .select({
                        classId: classesTable.classId,
                        name: classesTable.name,
                        description: classesTable.description,
                        invitationCode: classesTable.invitationCode,
                        createdAt: classesTable.createdAt,
                        enrolledAt: classEnrollmentsTable.enrolledAt
                    })
                    .from(classEnrollmentsTable)
                    .innerJoin(classesTable, eq(classesTable.classId, classEnrollmentsTable.classId))
                    .where(eq(classEnrollmentsTable.studentId, userId));
            }
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }
        SuccessResponse.ok(res, classes);
    }

    public async handleCreateClass(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        const { name, description } = req.body as { name: string; description: string };
        const valueInserted: IClassInserted = {
            teacherId: userId,
            name,
            description,
            invitationCode: classService.generateInvitationCode(),
        };
        let data;
        try {
            [data] = await db.insert(classesTable).values(valueInserted).returning({
                classId: classesTable.classId,
                name: classesTable.name,
                description: classesTable.description,
                invitationCode: classesTable.invitationCode,
                createdAt: classesTable.createdAt,
            });
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }
        SuccessResponse.created(res, data);
    }

    public async handleUpdateClass(req: Request, res: Response) {
        let { classId } = req.params as { classId: string | number };
        classId = parseInt(classId as string);
        if (isNaN(classId)) {
            throw new BadRequest('Invalid param, cannot update class');
        }

        const { name, description } = req.body as { name: string; description: string };
        const valueUpdated = { name, description };

        let data;
        try {
            [data] = await db
                .update(classesTable)
                .set(valueUpdated)
                .where(eq(classesTable.classId, classId))
                .returning({
                    classId: classesTable.classId,
                    name: classesTable.name,
                    description: classesTable.description,
                });
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.ok(res, data);
    }

    public async handleJoinClass(req: Request, res: Response) {
        const userId = getUserIdFromRequest(req);
        let { invitationCode } = req.body as { invitationCode: string };

        let classId: number | null = null;
        try {
            const result = await db
                .select({
                    classId: classesTable.classId,
                })
                .from(classesTable)
                .where(eq(classesTable.invitationCode, invitationCode));
            classId = result.length > 0 ? result[0].classId : null;
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        if (!classId) {
            throw new BadRequest('ClassId is not valid');
        }

        const valueInserted: IJoinClassPayload = {
            classId,
            studentId: userId,
        };

        let data;
        try {
            const [enrollment] = await db.insert(classEnrollmentsTable).values(valueInserted).returning({
                classEnrollmentId: classEnrollmentsTable.classEnrollmentId,
                classId: classEnrollmentsTable.classId,
                enrolledAt: classEnrollmentsTable.enrolledAt,
            });
            const [myClass] = await db
                .select({
                    classId: classesTable.classId,
                    name: classesTable.name,
                    description: classesTable.description,
                    invitationCode: classesTable.invitationCode,
                    createdAt: classesTable.createdAt,
                })
                .from(classesTable)
                .where(eq(classesTable.classId, enrollment.classId));
            data = { ...myClass, classEnrollmentId: enrollment.classEnrollmentId, enrolledAt: enrollment.enrolledAt };
        } catch (err) {
            logger.error(err);
            throw new DatabaseError('Something went wrong');
        }

        SuccessResponse.created(res, data);
    }
}

export default new ClassController();
