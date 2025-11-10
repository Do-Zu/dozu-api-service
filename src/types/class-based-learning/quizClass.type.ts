export interface IQuizClassStatistics {
    totalStudents: number;
    completedCount: number;
    inProgressCount: number;
    notStartedCount: number;
}

export interface IQuizAnswerDetail {
    questionIndex: number;
    userAnswerIndex: number | null;
    isCorrect: boolean;
    answeredAt: Date | null;
}

export interface IStudentQuizResult {
    userId: number;
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
    status: 'completed' | 'in_progress' | 'not_started';
    completedAt: Date | null;
    score: number | null;
    correctCount: number | null;
    questionsCount: number | null;
    correctPercentage: number | null;
    answers?: IQuizAnswerDetail[];
}

export interface IQuizClassResultsResponse {
    quizInfo: {
        classQuizId: number;
        title: string;
        dueDate: Date | null;
    };
    statistics: IQuizClassStatistics;
    studentResults: IStudentQuizResult[];
}

export interface IClassQuizResource {
    classQuizId: number;
    teacherId: number;
    classId: number;
    title: string;
}

export type QuestionCategory = 'thuong_sai' | 'doi_luc_sai' | 'it_khi_sai' | 'chua_bat_dau';

export interface IQuestionAnalysis {
    questionIndex: number;
    questionText?: string; 
    choices?: string[];
    correctIndex?: number; 
    correctRate: number; // 0-1 range, calculated as (correctAnswers / totalAnswered)
    category: QuestionCategory;
    correctCount: number;
    totalAnswered: number;
    totalStudents: number;
}

export interface IQuestionAnalysisResponse {
    questions: IQuestionAnalysis[];
    totalStudents: number;
    summary: {
        thuongSai: number;
        doiLucSai: number;
        itKhiSai: number;
        chuaBatDau: number;
    };
}

