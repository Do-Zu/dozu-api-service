import quizClassRepo from '@/repositories/class-based-learning/quizClass.repo';
import { 
    IQuizClassResultsResponse, 
    IStudentQuizResult,
    IQuestionAnalysisResponse,
    QuestionCategory 
} from '@/types/class-based-learning/quizClass.type';

class QuizClassService {
    /**
     * Get quiz results overview for a class
     */
    public async getQuizResults(classQuizId: number, includeAnswers: boolean = false): Promise<IQuizClassResultsResponse> {
        const [quizInfo, statistics, studentResults] = await Promise.all([
            quizClassRepo.getQuizInfo(classQuizId),
            quizClassRepo.getQuizStatistics(classQuizId),
            quizClassRepo.getStudentQuizResults(classQuizId, includeAnswers),
        ]);

        // Sort students by name (A-Z)
        const sortedResults = this.sortStudentsByName(studentResults);

        return {
            quizInfo,
            statistics,
            studentResults: sortedResults,
        };
    }

    /**
     * Get quiz statistics only
     */
    public async getQuizStatistics(classQuizId: number) {
        return quizClassRepo.getQuizStatistics(classQuizId);
    }

    /**
     * Get student quiz results only
     */
    public async getStudentQuizResults(classQuizId: number, includeAnswers: boolean = false): Promise<IStudentQuizResult[]> {
        const results = await quizClassRepo.getStudentQuizResults(classQuizId, includeAnswers);
        return this.sortStudentsByName(results);
    }

    /**
     * Sort students by fullName (A-Z), fallback to username if no name
     */
    private sortStudentsByName(students: IStudentQuizResult[]): IStudentQuizResult[] {
        return [...students].sort((a, b) => {
            const nameA = a.fullName || a.username;
            const nameB = b.fullName || b.username;
            return nameA.localeCompare(nameB);
        });
    }

    /**
     * Get quiz monitoring data for activity monitoring page
     */
    public async getQuizMonitoringData(classQuizId: number) {
        const [quizInfo, statistics, studentResults] = await Promise.all([
            quizClassRepo.getQuizInfo(classQuizId),
            quizClassRepo.getQuizStatistics(classQuizId),
            quizClassRepo.getStudentQuizResults(classQuizId),
        ]);

        return {
            activity: {
                id: quizInfo.classQuizId.toString(),
                title: quizInfo.title,
                type: 'quiz' as const,
                dueDate: quizInfo.dueDate,
                totalStudents: statistics.totalStudents,
                completedStudents: statistics.completedCount,
                inProgressStudents: statistics.inProgressCount,
                notStartedStudents: statistics.notStartedCount,
            },
            students: this.sortStudentsByName(studentResults).map(student => ({
                id: student.userId.toString(),
                name: student.fullName || student.username,
                username: student.username,
                avatar: student.avatarUrl,
                status: student.status,
                completedAt: student.completedAt,
                score: student.score,
                correctCount: student.correctCount,
                questionsCount: student.questionsCount,
                correctPercentage: student.correctPercentage,
            })),
            statistics: {
                totalStudents: statistics.totalStudents,
                completedCount: statistics.completedCount,
                inProgressCount: statistics.inProgressCount,
                notStartedCount: statistics.notStartedCount,
                completionRate: statistics.totalStudents > 0
                    ? Math.round((statistics.completedCount / statistics.totalStudents) * 100)
                    : 0,
            },
        };
    }

    /**
     * Get detailed answers for a specific student
     */
    public async getStudentQuizAnswers(classQuizId: number, userId: number) {
        return quizClassRepo.getStudentQuizAnswers(classQuizId, userId);
    }

    /**
     * Get question-level analysis (all students' answers by question)
     * Calculates correct rate for each question and categorizes them based on the formula:
     * - Thường sai: correctRate <= 0.25
     * - Đôi lúc sai: correctRate > 0.25 && correctRate <= 0.75
     * - Ít khi sai: correctRate > 0.75
     * - Chưa bắt đầu: no answer or null
     */
    public async getQuestionAnalysis(classQuizId: number): Promise<IQuestionAnalysisResponse> {
        // Get total number of students in the class (not just those who submitted)
        const statistics = await quizClassRepo.getQuizStatistics(classQuizId);
        const totalStudents = statistics.totalStudents;

        // Get all students' answers (only from submitted attempts)
        const allAnswers = await quizClassRepo.getAllStudentsAnswers(classQuizId);
        
        if (totalStudents === 0) {
            return {
                questions: [],
                totalStudents: 0,
                summary: {
                    thuongSai: 0,
                    doiLucSai: 0,
                    itKhiSai: 0,
                    chuaBatDau: 0,
                },
            };
        }

        // Group answers by question index
        const questionMap = new Map<number, {
            questionIndex: number;
            correctAnswers: number;
            totalAnswered: number;
        }>();

        // Track which students have answered (for submitted attempts)
        const answeredStudents = new Set<number>();

        allAnswers.forEach(studentData => {
            answeredStudents.add(studentData.userId);
            
            studentData.answers.forEach(answer => {
                if (!questionMap.has(answer.questionIndex)) {
                    questionMap.set(answer.questionIndex, {
                        questionIndex: answer.questionIndex,
                        correctAnswers: 0,
                        totalAnswered: 0,
                    });
                }
                
                const questionData = questionMap.get(answer.questionIndex)!;
                questionData.totalAnswered += 1;
                
                if (answer.isCorrect) {
                    questionData.correctAnswers += 1;
                }
            });
        });

        // Calculate correct rate and categorize each question
        const questions: IQuestionAnalysisResponse['questions'] = [];
        const summary = {
            thuongSai: 0,
            doiLucSai: 0,
            itKhiSai: 0,
            chuaBatDau: 0,
        };

        // Get all question indices (we need to check all questions, even if no one answered)
        // For now, we'll only include questions that have been answered
        // If you need to include all questions, you'd need to get the quiz questions from the quiz data
        const sortedQuestions = Array.from(questionMap.values()).sort((a, b) => a.questionIndex - b.questionIndex);

        sortedQuestions.forEach(questionData => {
            const { questionIndex, correctAnswers, totalAnswered } = questionData;
            
            // Calculate correct rate: (students who answered correctly) / (total students)
            // Formula: correctRate = (số học sinh trả lời đúng) / (tổng số học sinh)
            const correctRate = totalStudents > 0 ? correctAnswers / totalStudents : null;
            
            // Categorize based on formula:
            // - Thường sai: correctRate <= 0.25
            // - Đôi lúc sai: correctRate > 0.25 && correctRate <= 0.75
            // - Ít khi sai: correctRate > 0.75
            // - Chưa bắt đầu: no one answered (totalAnswered === 0 or correctRate is null)
            let category: QuestionCategory;
            if (correctRate === null || totalAnswered === 0) {
                // No one answered this question
                category = 'chua_bat_dau';
                summary.chuaBatDau += 1;
            } else if (correctRate <= 0.25) {
                // <= 25% students answered correctly
                category = 'thuong_sai';
                summary.thuongSai += 1;
            } else if (correctRate <= 0.75) {
                // > 25% and <= 75% students answered correctly
                category = 'doi_luc_sai';
                summary.doiLucSai += 1;
            } else {
                // > 75% students answered correctly
                category = 'it_khi_sai';
                summary.itKhiSai += 1;
            }

            questions.push({
                questionIndex,
                correctRate: correctRate ?? 0, // Use 0 instead of null for easier frontend handling
                category,
                correctCount: correctAnswers,
                totalAnswered,
                totalStudents,
            });
        });

        return {
            questions,
            totalStudents,
            summary,
        };
    }
}

export default new QuizClassService();

