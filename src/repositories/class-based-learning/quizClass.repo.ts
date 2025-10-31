import db from '@/libs/drizzleClient.lib';
import {
    classQuizzesTable,
    classQuizAttemptsTable,
    classQuizAttemptAnswersTable,
    classEnrollmentsTable,
    usersTable,
} from '@/models';
import { IQuizClassStatistics, IStudentQuizResult } from '@/types/class-based-learning/quizClass.type';
import { eq, sql, and, inArray } from 'drizzle-orm';

class QuizClassRepo {
    /**
     * Get statistics for a quiz in a class
     */
    public async getQuizStatistics(classQuizId: number): Promise<IQuizClassStatistics> {
        // Get all students in the class
        const classId = await this.getClassIdFromQuizId(classQuizId);
        
        const totalStudentsResult = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(classEnrollmentsTable)
            .where(eq(classEnrollmentsTable.classId, classId));
        const totalStudents = totalStudentsResult[0]?.count || 0;

        // Get completed count (status = 'submitted')
        const completedResult = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(classQuizAttemptsTable)
            .where(
                and(
                    eq(classQuizAttemptsTable.classQuizId, classQuizId),
                    eq(classQuizAttemptsTable.status, 'submitted')
                )
            );
        const completedCount = completedResult[0]?.count || 0;

        // Get in progress count (status = 'in_progress')
        const inProgressResult = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(classQuizAttemptsTable)
            .where(
                and(
                    eq(classQuizAttemptsTable.classQuizId, classQuizId),
                    eq(classQuizAttemptsTable.status, 'in_progress')
                )
            );
        const inProgressCount = inProgressResult[0]?.count || 0;

        // Not started = total students - completed - in progress
        const notStartedCount = totalStudents - completedCount - inProgressCount;

        return {
            totalStudents,
            completedCount,
            inProgressCount,
            notStartedCount,
        };
    }

    /**
     * Get quiz results for all students in a class
     */
    public async getStudentQuizResults(classQuizId: number, includeAnswers: boolean = false): Promise<IStudentQuizResult[]> {
        const classId = await this.getClassIdFromQuizId(classQuizId);

        // Get all students in the class
        const students = await db
            .select({
                userId: usersTable.userId,
                username: usersTable.username,
                fullName: usersTable.fullName,
                avatarUrl: usersTable.avatarUrl,
            })
            .from(classEnrollmentsTable)
            .innerJoin(usersTable, eq(usersTable.userId, classEnrollmentsTable.studentId))
            .where(eq(classEnrollmentsTable.classId, classId));

        // Get all attempts for this quiz
        const attempts = await db
            .select({
                attemptId: classQuizAttemptsTable.attemptId,
                userId: classQuizAttemptsTable.userId,
                status: classQuizAttemptsTable.status,
                submittedAt: classQuizAttemptsTable.submittedAt,
                score: classQuizAttemptsTable.score,
                correctCount: classQuizAttemptsTable.correctCount,
                questionsCount: classQuizAttemptsTable.questionsCount,
            })
            .from(classQuizAttemptsTable)
            .where(eq(classQuizAttemptsTable.classQuizId, classQuizId));

        // Get all answers if needed
        let answersMap = new Map<number, Array<{
            questionIndex: number;
            userAnswerIndex: number | null;
            isCorrect: boolean;
            answeredAt: Date | null;
        }>>();

        if (includeAnswers && attempts.length > 0) {
            const attemptIds = attempts.map(a => a.attemptId);
            const answers = await db
                .select({
                    attemptId: classQuizAttemptAnswersTable.attemptId,
                    questionIndex: classQuizAttemptAnswersTable.snapshotQuestionIdx,
                    userAnswerIndex: classQuizAttemptAnswersTable.userAnswerIndex,
                    isCorrect: classQuizAttemptAnswersTable.correct,
                    answeredAt: classQuizAttemptAnswersTable.answeredAt,
                })
                .from(classQuizAttemptAnswersTable)
                .where(inArray(classQuizAttemptAnswersTable.attemptId, attemptIds))
                .orderBy(classQuizAttemptAnswersTable.attemptId, classQuizAttemptAnswersTable.snapshotQuestionIdx);

            // Group answers by attemptId
            answers.forEach(answer => {
                if (!answersMap.has(answer.attemptId)) {
                    answersMap.set(answer.attemptId, []);
                }
                answersMap.get(answer.attemptId)!.push({
                    questionIndex: answer.questionIndex,
                    userAnswerIndex: answer.userAnswerIndex,
                    isCorrect: answer.isCorrect,
                    answeredAt: answer.answeredAt,
                });
            });
        }

        // Create a map of user attempts
        const attemptsMap = new Map(
            attempts.map(attempt => [attempt.userId, attempt])
        );

        // Combine students with their attempts
        const results: IStudentQuizResult[] = students.map(student => {
            const attempt = attemptsMap.get(student.userId);
            
            let status: 'completed' | 'in_progress' | 'not_started';
            let completedAt: Date | null = null;
            let score: number | null = null;
            let correctCount: number | null = null;
            let questionsCount: number | null = null;
            let correctPercentage: number | null = null;
            let answers: Array<{
                questionIndex: number;
                userAnswerIndex: number | null;
                isCorrect: boolean;
                answeredAt: Date | null;
            }> | undefined = undefined;

            if (!attempt) {
                status = 'not_started';
            } else if (attempt.status === 'submitted') {
                status = 'completed';
                completedAt = attempt.submittedAt || null;
                score = attempt.score || null;
                correctCount = attempt.correctCount || null;
                questionsCount = attempt.questionsCount || null;
                
                // Calculate percentage
                if (correctCount !== null && questionsCount !== null && questionsCount > 0) {
                    correctPercentage = Math.round((correctCount / questionsCount) * 100);
                }

                // Get answers if requested
                if (includeAnswers) {
                    answers = answersMap.get(attempt.attemptId) || [];
                }
            } else {
                status = 'in_progress';
                // Get partial answers if in progress
                if (includeAnswers && attempt.attemptId) {
                    answers = answersMap.get(attempt.attemptId) || [];
                }
            }

            return {
                userId: student.userId,
                username: student.username,
                fullName: student.fullName,
                avatarUrl: student.avatarUrl,
                status,
                completedAt,
                score,
                correctCount,
                questionsCount,
                correctPercentage,
                answers,
            };
        });

        return results;
    }

    /**
     * Get quiz information
     */
    public async getQuizInfo(classQuizId: number): Promise<{ classQuizId: number; title: string; dueDate: Date | null }> {
        const [quiz] = await db
            .select({
                classQuizId: classQuizzesTable.classQuizId,
                title: classQuizzesTable.title,
                dueDate: classQuizzesTable.endAt,
            })
            .from(classQuizzesTable)
            .where(eq(classQuizzesTable.classQuizId, classQuizId));
        
        if (!quiz) {
            throw new Error('Quiz not found');
        }

        return quiz;
    }

    /**
     * Get class quiz by ID
     */
    public async getClassQuizById(classQuizId: number) {
        const [quiz] = await db
            .select({
                classQuizId: classQuizzesTable.classQuizId,
                teacherId: classQuizzesTable.teacherId,
                classId: classQuizzesTable.classId,
                title: classQuizzesTable.title,
            })
            .from(classQuizzesTable)
            .where(eq(classQuizzesTable.classQuizId, classQuizId));
        
        return quiz || null;
    }

    /**
     * Helper to get class ID from quiz ID
     */
    private async getClassIdFromQuizId(classQuizId: number): Promise<number> {
        const [quiz] = await db
            .select({
                classId: classQuizzesTable.classId,
            })
            .from(classQuizzesTable)
            .where(eq(classQuizzesTable.classQuizId, classQuizId));
        
        if (!quiz) {
            throw new Error('Quiz not found');
        }

        return quiz.classId;
    }

    /**
     * Get detailed answers for a student's quiz attempt
     */
    public async getStudentQuizAnswers(classQuizId: number, userId: number) {
        // Get the student's attempt
        const [attempt] = await db
            .select({
                attemptId: classQuizAttemptsTable.attemptId,
                status: classQuizAttemptsTable.status,
                attemptStartedAt: classQuizAttemptsTable.attemptStartedAt,
                submittedAt: classQuizAttemptsTable.submittedAt,
                score: classQuizAttemptsTable.score,
                correctCount: classQuizAttemptsTable.correctCount,
                questionsCount: classQuizAttemptsTable.questionsCount,
            })
            .from(classQuizAttemptsTable)
            .where(
                and(
                    eq(classQuizAttemptsTable.classQuizId, classQuizId),
                    eq(classQuizAttemptsTable.userId, userId)
                )
            );

        if (!attempt) {
            return null;
        }

        // Get all answers for this attempt
        const answers = await db
            .select({
                questionIndex: classQuizAttemptAnswersTable.snapshotQuestionIdx,
                userAnswerIndex: classQuizAttemptAnswersTable.userAnswerIndex,
                isCorrect: classQuizAttemptAnswersTable.correct,
                answeredAt: classQuizAttemptAnswersTable.answeredAt,
            })
            .from(classQuizAttemptAnswersTable)
            .where(eq(classQuizAttemptAnswersTable.attemptId, attempt.attemptId))
            .orderBy(classQuizAttemptAnswersTable.snapshotQuestionIdx);

        return {
            attempt,
            answers,
        };
    }

    /**
     * Get all students' answers for a quiz (for question analysis)
     */
    public async getAllStudentsAnswers(classQuizId: number) {
        // Get all attempts for this quiz
        const attempts = await db
            .select({
                attemptId: classQuizAttemptsTable.attemptId,
                userId: classQuizAttemptsTable.userId,
                status: classQuizAttemptsTable.status,
            })
            .from(classQuizAttemptsTable)
            .where(
                and(
                    eq(classQuizAttemptsTable.classQuizId, classQuizId),
                    eq(classQuizAttemptsTable.status, 'submitted')
                )
            );

        if (attempts.length === 0) {
            return [];
        }

        const attemptIds = attempts.map(a => a.attemptId);

        // Get all answers for these attempts
        const answers = await db
            .select({
                attemptId: classQuizAttemptAnswersTable.attemptId,
                questionIndex: classQuizAttemptAnswersTable.snapshotQuestionIdx,
                userAnswerIndex: classQuizAttemptAnswersTable.userAnswerIndex,
                isCorrect: classQuizAttemptAnswersTable.correct,
            })
            .from(classQuizAttemptAnswersTable)
            .where(inArray(classQuizAttemptAnswersTable.attemptId, attemptIds));

        // Group answers by attempt
        const answersByAttempt = new Map<number, typeof answers>();
        answers.forEach(answer => {
            if (!answersByAttempt.has(answer.attemptId)) {
                answersByAttempt.set(answer.attemptId, []);
            }
            answersByAttempt.get(answer.attemptId)!.push(answer);
        });

        // Combine with attempt info
        return attempts.map(attempt => ({
            userId: attempt.userId,
            status: attempt.status,
            answers: answersByAttempt.get(attempt.attemptId) || [],
        }));
    }
}

export default new QuizClassRepo();

