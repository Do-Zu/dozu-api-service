// src/features/class-quiz/repositories/classQuiz.shared.repo.ts
import db from '@/libs/drizzleClient.lib';
import {
    classQuizzesTable,
    classQuizDraftsTable,
    classQuizVersionsTable,
    classQuizAttemptsTable,
    classQuizAttemptAnswersTable,
    usersTable,
    classesTable,
} from '@/models';
import { and, eq, sql, desc } from 'drizzle-orm';
import { BadRequest, Forbidden, NotFoundError } from '@/core/error';

/** Helpers */
type DraftJson = {
    orderSeed?: string;
    items: Array<{ originQuestionId: number } | { adHoc: true; text: string; choices: string[]; correctIndex: number }>;
    meta?: Record<string, unknown>;
};
const now = () => new Date();

/** Parse snapshot JSON (stored as TEXT) safely */
function parseSnapshot(snapshotAny: unknown): DraftJson {
    const j = typeof snapshotAny === 'string' ? JSON.parse(snapshotAny) : snapshotAny;

    if (!j || typeof j !== 'object' || !Array.isArray((j as any).items)) {
        throw new BadRequest('Malformed questions_snapshot');
    }
    return j as DraftJson;
}

/** Create a lightweight seed if none is provided */
function makeSeed() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const classQuizSharedRepo = {
    /** ---------------- TEACHER-ish (also used by student validations) ---------------- */

    async createClassQuiz(
        classId: number,
        dto: {
            teacherId: number;
            topicId?: number | null;
            title: string;
            content?: string;
            startAt?: string | null;
            endAt?: string | null;
            durationSeconds?: number | null;
            maxAttempts?: number;
            shuffleQuestions?: boolean;
            shuffleChoices?: boolean;
            showScoreToStudent?: boolean;
            acceptingSubmissions?: boolean;
        }
    ) {
        // basic guards: class & teacher exist (optional, adjust to your policy)
        const cls = await db.query.classesTable.findFirst({
            columns: { classId: true },
            where: eq(classesTable.classId, classId),
        });
        if (!cls) throw new NotFoundError('Class not found');

        const teacher = await db.query.usersTable.findFirst({
            columns: { userId: true },
            where: eq(usersTable.userId, dto.teacherId),
        });
        if (!teacher) throw new NotFoundError('Teacher not found');

        const [row] = await db
            .insert(classQuizzesTable)
            .values({
                teacherId: dto.teacherId,
                classId,
                topicId: dto.topicId ?? null,
                title: dto.title,
                content: dto.content ?? '',
                startAt: dto.startAt ? new Date(dto.startAt) : null,
                endAt: dto.endAt ? new Date(dto.endAt) : null,
                durationSeconds: dto.durationSeconds ?? null,
                maxAttempts: dto.maxAttempts ?? 1,
                shuffleQuestions: dto.shuffleQuestions ?? true,
                shuffleChoices: dto.shuffleChoices ?? true,
                showScoreToStudent: dto.showScoreToStudent ?? true,
                acceptingSubmissions: dto.acceptingSubmissions ?? true,
                status: 'draft',
                createdAt: now(),
            })
            .returning({ classQuizId: classQuizzesTable.classQuizId, status: classQuizzesTable.status });

        return row;
    },

    async upsertDraft(classQuizId: number, dto: { teacherId: number; draftJson: DraftJson }) {
        // ensure quiz exists & is editable
        const quiz = await db.query.classQuizzesTable.findFirst({
            where: eq(classQuizzesTable.classQuizId, classQuizId),
            columns: {
                classQuizId: true,
                teacherId: true,
                status: true,
            },
        });
        if (!quiz) throw new NotFoundError('class_quiz not found');
        if (quiz.teacherId !== dto.teacherId) throw new Forbidden('Not quiz owner');
        if (!['draft', 'scheduled'].includes(quiz.status as string)) throw new BadRequest('Quiz is not editable');

        // upsert
        const existed = await db
            .select({ id: classQuizDraftsTable.classQuizId, version: classQuizDraftsTable.version })
            .from(classQuizDraftsTable)
            .where(eq(classQuizDraftsTable.classQuizId, classQuizId));

        if (existed.length) {
            const [r] = await db
                .update(classQuizDraftsTable)
                .set({
                    draftJson: dto.draftJson as DraftJson,
                    version: (existed[0].version ?? 1) + 1,
                    updatedAt: now(),
                })
                .where(eq(classQuizDraftsTable.classQuizId, classQuizId))
                .returning({
                    classQuizId: classQuizDraftsTable.classQuizId,
                    version: classQuizDraftsTable.version,
                    updatedAt: classQuizDraftsTable.updatedAt,
                });
            return r;
        } else {
            const [r] = await db
                .insert(classQuizDraftsTable)
                .values({
                    classQuizId,
                    teacherId: dto.teacherId,
                    draftJson: dto.draftJson as DraftJson,
                    version: 1,
                    updatedAt: now(),
                })
                .returning({
                    classQuizId: classQuizDraftsTable.classQuizId,
                    version: classQuizDraftsTable.version,
                    updatedAt: classQuizDraftsTable.updatedAt,
                });
            return r;
        }
    },

    async updateSettings(
        classQuizId: number,
        dto: Partial<{
            title: string;
            content: string;
            startAt: string | null;
            endAt: string | null;
            durationSeconds: number | null;
            maxAttempts: number;
            shuffleQuestions: boolean;
            shuffleChoices: boolean;
            showScoreToStudent: boolean;
            acceptingSubmissions: boolean;
            topicId: number | null;
        }>
    ) {
        const [r] = await db
            .update(classQuizzesTable)
            .set({
                title: dto.title ?? undefined,
                content: dto.content ?? undefined,
                startAt: dto.startAt === undefined ? undefined : dto.startAt ? new Date(dto.startAt) : null,
                endAt: dto.endAt === undefined ? undefined : dto.endAt ? new Date(dto.endAt) : null,
                durationSeconds: dto.durationSeconds === undefined ? undefined : dto.durationSeconds,
                maxAttempts: dto.maxAttempts ?? undefined,
                shuffleQuestions: dto.shuffleQuestions ?? undefined,
                shuffleChoices: dto.shuffleChoices ?? undefined,
                showScoreToStudent: dto.showScoreToStudent ?? undefined,
                acceptingSubmissions: dto.acceptingSubmissions ?? undefined,
                topicId: dto.topicId === undefined ? undefined : dto.topicId,
                updatedAt: now(),
            })
            .where(eq(classQuizzesTable.classQuizId, classQuizId))
            .returning({
                classQuizId: classQuizzesTable.classQuizId,
                title: classQuizzesTable.title,
                startAt: classQuizzesTable.startAt,
                endAt: classQuizzesTable.endAt,
                durationSeconds: classQuizzesTable.durationSeconds,
                shuffleChoices: classQuizzesTable.shuffleChoices,
                shuffleQuestions: classQuizzesTable.shuffleQuestions,
            });
        if (!r) throw new NotFoundError('class_quiz not found');
        return r;
    },

    async applySchedule(classQuizId: number, dto: { startAt: string; endAt: string }) {
        const start = new Date(dto.startAt);
        const end = new Date(dto.endAt);
        if (!(start < end)) throw new BadRequest('Invalid window');

        await db
            .update(classQuizzesTable)
            .set({ startAt: start, endAt: end, updatedAt: now() })
            .where(eq(classQuizzesTable.classQuizId, classQuizId));
    },

    async setStatus(classQuizId: number, status: 'draft' | 'scheduled' | 'published' | 'closed') {
        await db
            .update(classQuizzesTable)
            .set({ status, updatedAt: now() })
            .where(eq(classQuizzesTable.classQuizId, classQuizId));
    },

    async setAcceptingSubmissions(classQuizId: number, accepting: boolean) {
        const [r] = await db
            .update(classQuizzesTable)
            .set({ acceptingSubmissions: accepting, updatedAt: now() })
            .where(eq(classQuizzesTable.classQuizId, classQuizId))
            .returning({ acceptingSubmissions: classQuizzesTable.acceptingSubmissions });
        if (!r) throw new NotFoundError('class_quiz not found');
        return r;
    },

    async ensureDraft(classQuizId: number) {
        const d = await db
            .select({ id: classQuizDraftsTable.classQuizId })
            .from(classQuizDraftsTable)
            .where(eq(classQuizDraftsTable.classQuizId, classQuizId));
        if (!d.length) throw new BadRequest('No draft to publish');
    },

    async publish(classQuizId: number) {
        // Take quiz to check window & duration
        const quiz = await db.query.classQuizzesTable.findFirst({
            where: eq(classQuizzesTable.classQuizId, classQuizId),
            columns: {
                classQuizId: true,
                title: true,
                startAt: true,
                endAt: true,
                durationSeconds: true,
                status: true,
            },
        });

        if (!quiz) throw new NotFoundError('class_quiz not found');

        // (optional) không cho publish nếu không ở trạng thái draft/scheduled
        if (!['draft', 'scheduled'].includes(quiz.status as string)) {
            throw new BadRequest('Quiz is not in a publishable status');
        }

        const { startAt, endAt, durationSeconds } = quiz;

        if (!startAt || !endAt || !durationSeconds || durationSeconds <= 0) {
            throw new BadRequest('Missing schedule info: startAt, endAt or durationSeconds');
        }

        if (!(startAt < endAt)) {
            throw new BadRequest('Invalid time window: startAt must be before endAt');
        }

        const windowSeconds = (endAt.getTime() - startAt.getTime()) / 1000;
        if (durationSeconds > windowSeconds) {
            throw new BadRequest('Invalid duration: must be <= quiz time window');
        }

        // Read draft & validate questions like FE hasAllValidQuestions
        const draft = await db.query.classQuizDraftsTable.findFirst({
            where: eq(classQuizDraftsTable.classQuizId, classQuizId),
            columns: { draftJson: true },
        });
        if (!draft) throw new BadRequest('No draft to publish');

        const draftJson = draft.draftJson as DraftJson;
        if (!draftJson.items?.length) throw new BadRequest('Draft has no items');

        // Validate each item
        const allValid = draftJson.items.every(item => {
            // If it is adHoc then validate content
            if (
                typeof item === 'object' &&
                item !== null &&
                'text' in item &&
                'choices' in item &&
                'correctIndex' in item
            ) {
                const text = (item as any).text ?? '';
                const choices: string[] = (item as any).choices ?? [];
                const correctIndex: number = (item as any).correctIndex ?? -1;

                const textOK = text.trim().length > 0;

                const nonEmpty = choices.filter(c => (c ?? '').trim().length > 0);
                const enough = nonEmpty.length >= 2;
                const lower = nonEmpty.map(c => c.toLowerCase());
                const dup = new Set(lower).size !== lower.length;

                const ciOK =
                    correctIndex >= 0 &&
                    correctIndex < choices.length &&
                    (choices[correctIndex] ?? '').trim().length > 0;

                return textOK && enough && !dup && ciOK;
            }

            // If it is originQuestionId then temporarily give pass (assuming original question is valid)
            return true;
        });

        if (!allValid) {
            throw new BadRequest('Draft contains invalid questions');
        }

        const seed = draftJson.orderSeed || makeSeed();
        const snapshotObj: DraftJson = { ...draftJson, orderSeed: seed };

        const [ver] = await db
            .insert(classQuizVersionsTable)
            .values({
                classQuizId,
                questionsSnapshot: snapshotObj as any,
                choicesShuffleSeed: seed,
                createdAt: now(),
            })
            .returning({
                classQuizVersionId: classQuizVersionsTable.classQuizVersionId,
                choicesShuffleSeed: classQuizVersionsTable.choicesShuffleSeed,
            });

        await db
            .update(classQuizzesTable)
            .set({
                status: 'published',
                publishedAt: now(),
                updatedAt: now(),
                autoPublishError: null,
                autoPublishLastTriedAt: now(),
            })
            .where(eq(classQuizzesTable.classQuizId, classQuizId));

        await db.delete(classQuizDraftsTable).where(eq(classQuizDraftsTable.classQuizId, classQuizId));

        return {
            status: 'published' as const,
            classQuizVersionId: ver.classQuizVersionId,
            choicesShuffleSeed: ver.choicesShuffleSeed!,
            questionsCount: draftJson.items.length,
        };
    },

    async close(classQuizId: number) {
        await db
            .update(classQuizzesTable)
            .set({ status: 'closed', acceptingSubmissions: false, updatedAt: now() })
            .where(eq(classQuizzesTable.classQuizId, classQuizId));
        return { status: 'closed' as const, acceptingSubmissions: false };
    },

    async listClassQuizzes(classId: number, status?: 'draft' | 'scheduled' | 'published' | 'closed') {
        // basic list + attempts count
        // attempts count
        const rows = await db.execute(sql`
      SELECT cq.class_quiz_id AS "classQuizId",
             cq.title,
             cq.status,
             cq.start_at AS "startAt",
             cq.end_at   AS "endAt",
             cq.published_at AS "publishedAt",
             cq.accepting_submissions AS "acceptingSubmissions",
             cq.max_attempts AS "maxAttempts",
             cq.auto_publish_error AS "autoPublishError",
             cq.auto_publish_last_tried_at AS "autoPublishLastTriedAt",
             COUNT(a.attempt_id) FILTER (WHERE a.status = 'submitted') AS "submittedCount"
      FROM class_quizzes cq
      LEFT JOIN class_quiz_attempts a ON a.class_quiz_id = cq.class_quiz_id
      WHERE cq.class_id = ${classId}
      ${status ? sql`AND cq.status = ${status}` : sql``}
      GROUP BY cq.class_quiz_id
      ORDER BY cq.created_at DESC;
    `);

        return rows.rows;
    },

    /** ---------------- STUDENT ---------------- */

    async getPlayableMeta(userId: number, classQuizId: number) {
        // quiz status + window + rules
        const quiz = await db.query.classQuizzesTable.findFirst({
            where: eq(classQuizzesTable.classQuizId, classQuizId),
            columns: {
                classQuizId: true,
                status: true,
                acceptingSubmissions: true,
                startAt: true,
                endAt: true,
                durationSeconds: true,
                maxAttempts: true,
                shuffleChoices: true,
                shuffleQuestions: true,
            },
        });
        if (!quiz) throw new NotFoundError('class_quiz not found');
        if (quiz.status !== 'published') throw new Forbidden('Quiz not published');
        if (!quiz.acceptingSubmissions) throw new Forbidden('Quiz is paused');

        const nowD = now();
        if (quiz.startAt && nowD < quiz.startAt) throw new Forbidden('Quiz not started');
        if (quiz.endAt && nowD > quiz.endAt) throw new Forbidden('Quiz ended');

        // get latest version
        const ver = await db
            .select({
                id: classQuizVersionsTable.classQuizVersionId,
                snapshot: classQuizVersionsTable.questionsSnapshot,
                seed: classQuizVersionsTable.choicesShuffleSeed,
                createdAt: classQuizVersionsTable.createdAt,
            })
            .from(classQuizVersionsTable)
            .where(eq(classQuizVersionsTable.classQuizId, classQuizId))
            .orderBy(desc(classQuizVersionsTable.createdAt))
            .limit(1);

        if (!ver.length) throw new BadRequest('Quiz has no version');
        const version = ver[0];
        const snap = parseSnapshot(version.snapshot);

        // attempts remaining (submitted count)
        const submitted = await db
            .select({ c: sql<number>`COUNT(*)`.as('c') })
            .from(classQuizAttemptsTable)
            .where(
                and(
                    eq(classQuizAttemptsTable.classQuizId, classQuizId),
                    eq(classQuizAttemptsTable.userId, userId),
                    eq(classQuizAttemptsTable.status, 'submitted')
                )
            );

        const used = Number(submitted[0]?.c ?? 0);
        const remaining = (quiz.maxAttempts ?? 1) - used;

        if (remaining <= 0) throw new Forbidden('No attempts remaining');

        return {
            classQuizId,
            classQuizVersionId: version.id,
            questionsCount: snap.items.length,
            choicesShuffleSeed: version.seed,
            durationSeconds: quiz.durationSeconds,
            window: { startAt: quiz.startAt, endAt: quiz.endAt },
            rules: {
                maxAttempts: quiz.maxAttempts,
                shuffleChoices: quiz.shuffleChoices,
                shuffleQuestions: quiz.shuffleQuestions,
                acceptingSubmissions: quiz.acceptingSubmissions,
            },
            remainingAttempts: remaining,
        };
    },

    async startAttempt(userId: number, classQuizId: number) {
        // vẫn check playable/rules như cũ
        const meta = await classQuizSharedRepo.getPlayableMeta(userId, classQuizId);
        const nowD = now();

        // Tìm attempt đang mở (mới nhất)
        const open = await db
            .select({
                attemptId: classQuizAttemptsTable.attemptId,
                classQuizVersionId: classQuizAttemptsTable.classQuizVersionId,
                attemptEndAt: classQuizAttemptsTable.attemptEndAt,
                status: classQuizAttemptsTable.status,
            })
            .from(classQuizAttemptsTable)
            .where(
                and(
                    eq(classQuizAttemptsTable.classQuizId, classQuizId),
                    eq(classQuizAttemptsTable.userId, userId),
                    eq(classQuizAttemptsTable.status, 'in_progress')
                )
            )
            .orderBy(desc(classQuizAttemptsTable.attemptStartedAt))
            .limit(1);

        // Nếu có attempt đang mở
        if (open.length) {
            const a = open[0];

            // Nếu đã quá hạn -> tự finalize (tối giản: chấm điểm hiện có) rồi cho phép tạo attempt mới
            if (a.attemptEndAt && nowD > a.attemptEndAt) {
                // tính qCount từ snapshot
                const ver = await db.query.classQuizVersionsTable.findFirst({
                    where: eq(classQuizVersionsTable.classQuizVersionId, a.classQuizVersionId!),
                    columns: { questionsSnapshot: true },
                });
                if (!ver) throw new NotFoundError('Version not found');
                const snap = parseSnapshot(ver.questionsSnapshot);
                const qCount = snap.items.length;

                // correct_count từ answers
                const rows = await db.execute(sql`
          SELECT COUNT(*)::int AS correct_count
          FROM class_quiz_attempt_answers
          WHERE attempt_id = ${a.attemptId} AND correct = TRUE;
        `);
                const correctCount = Number(rows.rows[0]?.correct_count ?? 0);
                const score = qCount > 0 ? Math.round((correctCount / qCount) * 100) : 0;

                // finalize (đánh dấu submitted)
                await db
                    .update(classQuizAttemptsTable)
                    .set({
                        status: 'submitted',
                        submittedAt: nowD,
                        correctCount,
                        questionsCount: qCount,
                        score,
                        updatedAt: nowD,
                    })
                    .where(eq(classQuizAttemptsTable.attemptId, a.attemptId));
                // rồi rơi xuống phần tạo attempt mới ở dưới
            } else {
                // còn thời gian -> TRẢ VỀ attempt đang mở (idempotent)
                return {
                    attemptId: a.attemptId,
                    classQuizVersionId: a.classQuizVersionId!,
                    attemptEndAt: a.attemptEndAt,
                    questionsCount: meta.questionsCount,
                    choicesShuffleSeed: meta.choicesShuffleSeed,
                };
            }
        }

        // Nếu không có open attempt (hoặc open đã được auto-finalize ở trên) -> tạo mới
        const startedAt = nowD;
        const endAt =
            meta.durationSeconds && meta.durationSeconds > 0
                ? new Date(startedAt.getTime() + meta.durationSeconds * 1000)
                : (meta.window.endAt ?? startedAt);

        const [attempt] = await db
            .insert(classQuizAttemptsTable)
            .values({
                classQuizId,
                classQuizVersionId: meta.classQuizVersionId,
                userId,
                attemptStartedAt: startedAt,
                attemptEndAt: endAt,
                status: 'in_progress',
                createdAt: startedAt,
            })
            .returning({
                attemptId: classQuizAttemptsTable.attemptId,
                classQuizVersionId: classQuizAttemptsTable.classQuizVersionId,
                attemptEndAt: classQuizAttemptsTable.attemptEndAt,
            });

        return {
            attemptId: attempt.attemptId,
            classQuizVersionId: attempt.classQuizVersionId!,
            attemptEndAt: attempt.attemptEndAt,
            questionsCount: meta.questionsCount,
            choicesShuffleSeed: meta.choicesShuffleSeed,
        };
    },

    async assertAttemptEditable(attemptId: number, userId: number, classQuizId: number) {
        const a = await db.query.classQuizAttemptsTable.findFirst({
            where: eq(classQuizAttemptsTable.attemptId, attemptId),
            columns: {
                attemptId: true,
                classQuizId: true,
                userId: true,
                status: true,
                attemptEndAt: true,
            },
        });
        if (!a) throw new NotFoundError('attempt not found');
        if (a.userId !== userId) throw new Forbidden('Not your attempt');
        if (a.classQuizId !== classQuizId) throw new Forbidden('Wrong quiz');
        if (a.status !== 'in_progress') throw new BadRequest('Attempt is not editable');
        if (a.attemptEndAt && now() > a.attemptEndAt) throw new BadRequest('Attempt time is over');
        return a;
    },

    async upsertAnswer(attemptId: number, snapshotQuestionIdx: number, userAnswerIndex: number | null) {
        // need correctIndex to compute "correct"
        const attempt = await db.query.classQuizAttemptsTable.findFirst({
            columns: {
                classQuizVersionId: true,
            },
            where: eq(classQuizAttemptsTable.attemptId, attemptId),
        });
        if (!attempt?.classQuizVersionId) throw new NotFoundError('Attempt/version not found');

        const ver = await db.query.classQuizVersionsTable.findFirst({
            where: eq(classQuizVersionsTable.classQuizVersionId, attempt.classQuizVersionId),
            columns: { questionsSnapshot: true },
        });
        if (!ver) throw new NotFoundError('Version not found');

        const snap = parseSnapshot(ver.questionsSnapshot);
        const item = snap.items[snapshotQuestionIdx - 1]; // idx is 1-based
        if (!item) throw new BadRequest('Invalid snapshot_question_idx');

        // pick correctIndex (origin or adHoc)
        let correctIndex = -1;
        if (
            typeof item === 'object' &&
            item !== null &&
            'correctIndex' in item &&
            typeof (item as { correctIndex: number }).correctIndex === 'number'
        ) {
            correctIndex = (item as { correctIndex: number }).correctIndex;
        } else {
            // originQuestionId flow: your snapshot should include resolved correctIndex at publish
            // If not, you may need to lookup question core here. For now we assume snapshot already contains correctIndex for all items.
            throw new BadRequest('Snapshot does not carry correctIndex for originQuestionId');
        }

        const isCorrect = userAnswerIndex !== null && userAnswerIndex === correctIndex;

        // upsert
        const existed = await db
            .select({
                id: classQuizAttemptAnswersTable.attemptId,
            })
            .from(classQuizAttemptAnswersTable)
            .where(
                and(
                    eq(classQuizAttemptAnswersTable.attemptId, attemptId),
                    eq(classQuizAttemptAnswersTable.snapshotQuestionIdx, snapshotQuestionIdx)
                )
            );

        if (existed.length) {
            await db
                .update(classQuizAttemptAnswersTable)
                .set({
                    userAnswerIndex: userAnswerIndex ?? null,
                    correct: isCorrect,
                    answeredAt: now(),
                })
                .where(
                    and(
                        eq(classQuizAttemptAnswersTable.attemptId, attemptId),
                        eq(classQuizAttemptAnswersTable.snapshotQuestionIdx, snapshotQuestionIdx)
                    )
                );
        } else {
            await db.insert(classQuizAttemptAnswersTable).values({
                attemptId,
                snapshotQuestionIdx,
                userAnswerIndex: userAnswerIndex ?? null,
                correct: isCorrect,
                answeredAt: now(),
            });
        }

        return { attemptId, snapshotQuestionIdx, userAnswerIndex, correct: isCorrect };
    },

    async finalizeAttempt(userId: number, ids: { classQuizId: number; attemptId: number }) {
        // check ownership + state
        await classQuizSharedRepo.assertAttemptEditable(ids.attemptId, userId, ids.classQuizId);

        // compute stats: correct_count, questions_count
        // questions_count from snapshot
        const attempt = await db.query.classQuizAttemptsTable.findFirst({
            where: eq(classQuizAttemptsTable.attemptId, ids.attemptId),
            columns: {
                classQuizVersionId: true,
            },
        });
        if (!attempt?.classQuizVersionId) throw new NotFoundError('Version not found');

        const ver = await db.query.classQuizVersionsTable.findFirst({
            where: eq(classQuizVersionsTable.classQuizVersionId, attempt.classQuizVersionId),
            columns: { questionsSnapshot: true },
        });
        if (!ver) throw new NotFoundError('Version not found');
        const snap = parseSnapshot(ver.questionsSnapshot);
        const qCount = snap.items.length;

        // correct_count from answers table
        const rows = await db.execute(sql`
      SELECT COUNT(*)::int AS correct_count
      FROM class_quiz_attempt_answers
      WHERE attempt_id = ${ids.attemptId} AND correct = TRUE;
    `);
        const correctCount = Number(rows.rows[0]?.correct_count ?? 0);
        const score = qCount > 0 ? Math.round((correctCount / qCount) * 100) : 0;

        // finalize
        const [updated] = await db
            .update(classQuizAttemptsTable)
            .set({
                status: 'submitted',
                submittedAt: now(),
                correctCount,
                questionsCount: qCount,
                score,
                updatedAt: now(),
            })
            .where(eq(classQuizAttemptsTable.attemptId, ids.attemptId))
            .returning({
                attemptId: classQuizAttemptsTable.attemptId,
                score: classQuizAttemptsTable.score,
                correctCount: classQuizAttemptsTable.correctCount,
                questionsCount: classQuizAttemptsTable.questionsCount,
                submittedAt: classQuizAttemptsTable.submittedAt,
            });

        return updated;
    },

    async myAttempts(userId: number, classId: number) {
        const rows = await db.execute(sql`
      SELECT a.attempt_id AS "attemptId",
             a.class_quiz_id AS "classQuizId",
             cq.title,
             a.status,
             a.score,
             a.correct_count AS "correctCount",
             a.questions_count AS "questionsCount",
             a.attempt_started_at AS "attemptStartedAt",
             a.submitted_at AS "submittedAt"
      FROM class_quiz_attempts a
      JOIN class_quizzes cq ON cq.class_quiz_id = a.class_quiz_id
      WHERE a.user_id = ${userId}
        AND cq.class_id = ${classId}
      ORDER BY a.attempt_started_at DESC;
    `);
        return rows.rows;
    },

    async attemptDetail(userId: number, ids: { classQuizId: number; attemptId: number }) {
        // ownership
        const a = await db.query.classQuizAttemptsTable.findFirst({
            where: eq(classQuizAttemptsTable.attemptId, ids.attemptId),
            columns: { userId: true, classQuizId: true, classQuizVersionId: true, status: true },
        });
        if (!a) throw new NotFoundError('attempt not found');
        if (a.userId !== userId) throw new Forbidden('Not your attempt');
        if (a.classQuizId !== ids.classQuizId) throw new Forbidden('Wrong quiz');

        const version = await db.query.classQuizVersionsTable.findFirst({
            where: eq(classQuizVersionsTable.classQuizVersionId, a.classQuizVersionId!),
            columns: {
                questionsSnapshot: true,
                choicesShuffleSeed: true,
                createdAt: true,
            },
        });
        if (!version) throw new NotFoundError('version not found');

        const answers = await db
            .select({
                snapshotQuestionIdx: classQuizAttemptAnswersTable.snapshotQuestionIdx,
                userAnswerIndex: classQuizAttemptAnswersTable.userAnswerIndex,
                correct: classQuizAttemptAnswersTable.correct,
                answeredAt: classQuizAttemptAnswersTable.answeredAt,
            })
            .from(classQuizAttemptAnswersTable)
            .where(eq(classQuizAttemptAnswersTable.attemptId, ids.attemptId))
            .orderBy(classQuizAttemptAnswersTable.snapshotQuestionIdx);

        return {
            attemptId: ids.attemptId,
            status: a.status,
            classQuizVersion: {
                choicesShuffleSeed: version.choicesShuffleSeed,
                snapshot: parseSnapshot(version.questionsSnapshot),
                createdAt: version.createdAt,
            },
            answers,
        };
    },

    async getDraft(classQuizId: number, teacherId?: number) {
        // (optional) đảm bảo quiz tồn tại & (nếu truyền teacherId) là chủ sở hữu
        const quiz = await db.query.classQuizzesTable.findFirst({
            where: eq(classQuizzesTable.classQuizId, classQuizId),
            columns: { classQuizId: true, teacherId: true },
        });
        if (!quiz) throw new NotFoundError('class_quiz not found');
        if (teacherId && quiz.teacherId !== teacherId) {
            throw new Forbidden('Not quiz owner');
        }

        // Lấy bản nháp hiện tại (bảng của bạn đang upsert theo 1 row/quiz)
        const draft = await db.query.classQuizDraftsTable.findFirst({
            where: eq(classQuizDraftsTable.classQuizId, classQuizId),
            columns: { draftJson: true, version: true, updatedAt: true },
        });

        return {
            draftJson: draft?.draftJson ?? null,
            version: draft?.version ?? null,
            updatedAt: draft?.updatedAt ? ((draft.updatedAt as Date).toISOString?.() ?? String(draft.updatedAt)) : null,
        };
    },

    async getClassQuizInfo(classQuizId: number, teacherId?: number) {
        const quiz = await db.query.classQuizzesTable.findFirst({
            where: eq(classQuizzesTable.classQuizId, classQuizId),
            columns: {
                classQuizId: true,
                title: true,
                content: true,
                teacherId: true,
                startAt: true,
                endAt: true,
                durationSeconds: true,
            },
        });
        if (!quiz) throw new NotFoundError('class_quiz not found');
        if (teacherId && quiz.teacherId !== teacherId) {
            throw new Forbidden('Not quiz owner');
        }
        return {
            classQuizId: quiz.classQuizId,
            title: quiz.title,
            content: quiz.content ?? '',
            startAt: quiz.startAt ?? null,
            endAt: quiz.endAt ?? null,
            durationSeconds: quiz.durationSeconds ?? null,
        };
    },
};
