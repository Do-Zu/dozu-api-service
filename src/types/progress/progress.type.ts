export interface IProgress {
  progressId: number;
  userId: number;
  topicId: number;  
  contentType: ContentType; 
  completionPercentage: number; 
  status: ProgressStatus;
  score?: number; 
  lastInteractionAt: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: ProgressMetadata;
}

export enum ContentType {
  TOPIC = 'topic',
  QUIZ = 'quiz',
  FLASHCARD = 'flashcard',
  // VIDEO = 'video',
  // NOTE = 'note'
}

export enum ProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface ProgressMetadata {
  attempts?: number; 
  timeSpent?: number; 
  lastPosition?: number; 
  answers?: Record<string, unknown>; 
  notes?: string;
  // Learning tracking fields
  itemsStudied?: number;
  accuracy?: number;
  sessionData?: Record<string, unknown>;
  lastUpdated?: string;
}

export interface IProgressCreate {
  userId: number;
  topicId: number;
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
  userId?: number;
  topicId?: number;
  contentType?: ContentType;
  status?: ProgressStatus;
  fromDate?: Date;
  toDate?: Date;
  minCompletionPercentage?: number;
  maxCompletionPercentage?: number;
}


export interface IProgressStatistics {
  totalContents: number;
  completedContents: number; 
  inProgressContents: number;
  notStartedContents: number;
  averageCompletionPercentage: number;
  averageScore?: number;
  totalTimeSpent: number; 
  lastActiveAt?: Date;
}

export interface IDashboardStatistics {
  totalStudyHours: number; 
  averageDailyStudy: number; 
  completedTopics: number; 
  weeklyComparison: {
    totalStudyHours: number;
    percentageChange: number; 
  };
  dailyStudyHours: Array<{
    day: string; 
    hours: number;
    date: string; 
  }>;
  learningMethodsDistribution: Array<{
    method: ContentType;
    percentage: number;
    count: number;
  }>;
  topPerformanceRank?: number; // Top 15% of all users
}


export interface IDailyStudyRecord {
  id: string;
  userId: number;
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  sessionsCount: number;
  createdAt: Date;
  updatedAt: Date;
}