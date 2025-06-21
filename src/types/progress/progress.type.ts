export interface IProgress {
  id: string;
  userId: string;
  contentId: string;  // ID của bài học, khóa học, thẻ ghi nhớ, etc.
  contentType: ContentType; // Loại nội dung (course, lesson, flashcard, etc.)
  completionPercentage: number; // 0-100
  status: ProgressStatus;
  score?: number; // Điểm số (nếu có)
  lastInteractionAt: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: ProgressMetadata; // Dữ liệu bổ sung
}

export enum ContentType {
  COURSE = 'course',
  LESSON = 'lesson',
  QUIZ = 'quiz',
  FLASHCARD = 'flashcard',
  VIDEO = 'video',
  ARTICLE = 'article'
}

export enum ProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface ProgressMetadata {
  attempts?: number; // Số lần thử
  timeSpent?: number; // Thời gian đã dành (tính bằng giây)
  lastPosition?: number; // Vị trí cuối cùng (video timestamp, page number, etc.)
  answers?: Record<string, any>; // Lưu trữ câu trả lời cho quiz
  notes?: string; // Ghi chú cá nhân
}

export interface IProgressCreate {
  userId: string;
  contentId: string;
  contentType: ContentType;
  status?: ProgressStatus;
  completionPercentage?: number;
  score?: number;
  metadata?: ProgressMetadata;
}

export interface IProgressUpdate {
  status?: ProgressStatus;
  completionPercentage?: number;
  score?: number;
  lastInteractionAt?: Date;
  metadata?: Partial<ProgressMetadata>;
}

export interface IProgressQuery {
  userId?: string;
  contentId?: string;
  contentType?: ContentType;
  status?: ProgressStatus;
  fromDate?: Date;
  toDate?: Date;
  minCompletionPercentage?: number;
  maxCompletionPercentage?: number;
}

// Dữ liệu thống kê tiến trình học tập
export interface IProgressStatistics {
  totalContents: number;
  completedContents: number; 
  inProgressContents: number;
  notStartedContents: number;
  averageCompletionPercentage: number;
  averageScore?: number;
  totalTimeSpent: number; // Tính bằng giây
  lastActiveAt?: Date;
}

// Thêm interface cho dashboard statistics
export interface IDashboardStatistics {
  totalStudyHours: number; // Tổng số giờ học
  averageDailyStudy: number; // Trung bình giờ học/ngày
  completedTopics: number; // Số chủ đề đã hoàn thành
  weeklyComparison: {
    totalStudyHours: number;
    percentageChange: number; // % thay đổi so với tuần trước
  };
  dailyStudyHours: Array<{
    day: string; // 'Sun', 'Mon', 'Tue', etc.
    hours: number;
    date: string; // YYYY-MM-DD
  }>;
  learningMethodsDistribution: Array<{
    method: ContentType;
    percentage: number;
    count: number;
  }>;
  topPerformanceRank?: number; // Top 15% of all users
}

// Thêm interface cho daily study tracking
export interface IDailyStudyRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  sessionsCount: number;
  createdAt: Date;
  updatedAt: Date;
}