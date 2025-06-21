import { IProgressStatistics, IProgress, IDashboardStatistics, ContentType } from '@/types/progress/progress.type';

class ProgressService {
  public static async getStatistics(userId: string | number): Promise<IProgressStatistics> {
    // TODO: Tổng hợp dữ liệu thực tế từ DB
    // Dưới đây là mock data mẫu
    return {
      totalContents: 120,
      completedContents: 84,
      inProgressContents: 20,
      notStartedContents: 16,
      averageCompletionPercentage: 70.2,
      averageScore: 8.5,
      totalTimeSpent: 36000,
      lastActiveAt: new Date(),
    };
  }

  public static async getDashboardStatistics(userId: string | number): Promise<IDashboardStatistics> {
    // TODO: Thay thế bằng queries thực tế từ database
    
    // Mock data dựa trên UI trong hình
    const dailyHours = [
      { day: 'Sun', hours: 4.5, date: '2024-06-14' },
      { day: 'Mon', hours: 3.2, date: '2024-06-15' },
      { day: 'Tue', hours: 5.0, date: '2024-06-16' },
      { day: 'Wed', hours: 2.8, date: '2024-06-17' },
      { day: 'Thu', hours: 6.1, date: '2024-06-18' },
      { day: 'Fri', hours: 3.5, date: '2024-06-19' },
      { day: 'Sat', hours: 2.0, date: '2024-06-20' },
    ];

    const totalStudyHours = dailyHours.reduce((sum, day) => sum + day.hours, 0);
    const averageDailyStudy = totalStudyHours / dailyHours.length;

    return {
      totalStudyHours: Math.round(totalStudyHours * 10) / 10, // 27.1 hours
      averageDailyStudy: Math.round(averageDailyStudy * 10) / 10, // 3.9 hours/day
      completedTopics: 84, // 84 items
      weeklyComparison: {
        totalStudyHours: totalStudyHours,
        percentageChange: 12, // +12% from previous week
      },
      dailyStudyHours: dailyHours,
      learningMethodsDistribution: [
        { method: ContentType.FLASHCARD, percentage: 40, count: 48 },
        { method: ContentType.QUIZ, percentage: 30, count: 36 },
        { method: ContentType.VIDEO, percentage: 20, count: 24 },
        { method: ContentType.ARTICLE, percentage: 10, count: 12 },
      ],
      topPerformanceRank: 15, // Top 15% of all users
    };
  }

  // New public methods for API endpoints
  public static async getDailyStudyRecords(userId: string | number, days: number = 7): Promise<Array<{day: string, hours: number, date: string}>> {
    // TODO: Query database để lấy số giờ học theo ngày
    // SELECT date, SUM(totalMinutes) as totalMinutes FROM daily_study_records 
    // WHERE userId = ? AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    // GROUP BY date ORDER BY date
    
    return [
      { day: 'Sun', hours: 4.5, date: '2024-06-14' },
      { day: 'Mon', hours: 3.2, date: '2024-06-15' },
      { day: 'Tue', hours: 5.0, date: '2024-06-16' },
      { day: 'Wed', hours: 2.8, date: '2024-06-17' },
      { day: 'Thu', hours: 6.1, date: '2024-06-18' },
      { day: 'Fri', hours: 3.5, date: '2024-06-19' },
      { day: 'Sat', hours: 2.0, date: '2024-06-20' },
    ];
  }

  public static async getLearningMethodsDistribution(userId: string | number): Promise<Array<{method: ContentType, percentage: number, count: number}>> {
    // TODO: Query database để lấy phân bố phương pháp học tập
    return [
      { method: ContentType.FLASHCARD, percentage: 40, count: 48 },
      { method: ContentType.QUIZ, percentage: 30, count: 36 },
      { method: ContentType.VIDEO, percentage: 20, count: 24 },
      { method: ContentType.ARTICLE, percentage: 10, count: 12 },
    ];
  }

  public static async getWeeklyComparison(userId: string | number): Promise<{totalStudyHours: number, percentageChange: number}> {
    // TODO: Query database để so sánh với tuần trước
    return {
      totalStudyHours: 27.1,
      percentageChange: 12, // +12% from previous week
    };
  }

  // Method để tính completed topics từ database thực tế - now public
  public static async getCompletedTopicsCount(userId: string | number): Promise<number> {
    // TODO: Query database để đếm số topic đã completed
    // SELECT COUNT(*) FROM progress 
    // WHERE userId = ? AND status = 'completed' AND contentType IN ('lesson', 'course', 'topic')
    return 84;
  }

  // Thêm method để tính total study hours từ daily records
  private static async getTotalStudyHours(userId: string | number, days: number = 7): Promise<number> {
    // TODO: Query database để tính tổng số giờ học trong khoảng thời gian
    // SELECT SUM(totalMinutes) FROM daily_study_records 
    // WHERE userId = ? AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    const totalMinutes = 1626; // 27.1 hours * 60 minutes
    return Math.round((totalMinutes / 60) * 10) / 10;
  }

  // Thêm method để lấy daily study hours
  private static async getDailyStudyHours(userId: string | number, days: number = 7): Promise<Array<{day: string, hours: number, date: string}>> {
    // TODO: Query database để lấy số giờ học theo ngày
    // SELECT date, SUM(totalMinutes) as totalMinutes FROM daily_study_records 
    // WHERE userId = ? AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    // GROUP BY date ORDER BY date
    
    return [
      { day: 'Sun', hours: 4.5, date: '2024-06-14' },
      { day: 'Mon', hours: 3.2, date: '2024-06-15' },
      { day: 'Tue', hours: 5.0, date: '2024-06-16' },
      { day: 'Wed', hours: 2.8, date: '2024-06-17' },
      { day: 'Thu', hours: 6.1, date: '2024-06-18' },
      { day: 'Fri', hours: 3.5, date: '2024-06-19' },
      { day: 'Sat', hours: 2.0, date: '2024-06-20' },
    ];
  }
}

export default ProgressService;