/**
 * Email templates for notification service
 * Centralized location for all email HTML and text templates
 */

export interface EmailTemplate {
  html: string;
  text: string;
}

export interface DailyReminderTemplateData {
  fullName: string;
  frontendUrl: string;
}

export interface WeeklyReportTemplateData {
  fullName: string;
  studyHours: number;
  topicsCompleted: number;
  achievementsEarned: number;
  streak: number;
  frontendUrl: string;
}

export interface AchievementTemplateData {
  fullName: string;
  achievementTitle: string;
  achievementDescription: string;
  achievementIcon: string;
  frontendUrl: string;
}

export interface ReEngagementTemplateData {
  fullName: string;
  frontendUrl: string;
}

export interface SystemAnnouncementTemplateData {
  title: string;
  message: string;
}

/**
 * Generate daily learning reminder email template
 */
export function getDailyReminderTemplate(data: DailyReminderTemplateData): EmailTemplate {
  return {
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Hi ${data.fullName}! 👋</h2>
        <p>Time for your daily learning session!</p>
        <p>Don't break your learning streak - even 10 minutes of study can make a difference.</p>
        <a href="${data.frontendUrl}/topics" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          Start Learning
        </a>
        <p style="color: #6b7280; font-size: 14px;">
          You can update your notification preferences in your profile settings.
        </p>
      </div>
    `,
    text: `Hi ${data.fullName}! Time for your daily learning session. Visit ${data.frontendUrl}/topics to start learning.`
  };
}

/**
 * Generate weekly progress report email template
 */
export function getWeeklyReportTemplate(data: WeeklyReportTemplateData): EmailTemplate {
  return {
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Weekly Report for ${data.fullName} 📊</h2>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>This Week's Achievements</h3>
          <ul style="list-style: none; padding: 0;">
            <li style="margin: 10px 0;">⏰ Study Time: <strong>${data.studyHours} hours</strong></li>
            <li style="margin: 10px 0;">📚 Topics Completed: <strong>${data.topicsCompleted}</strong></li>
            <li style="margin: 10px 0;">🏆 Achievements Earned: <strong>${data.achievementsEarned}</strong></li>
            <li style="margin: 10px 0;">🔥 Current Streak: <strong>${data.streak} days</strong></li>
          </ul>
        </div>
        <p>Keep up the great work! Continue your learning journey.</p>
        <a href="${data.frontendUrl}/progress" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          View Full Progress
        </a>
      </div>
    `,
    text: `Weekly Report: ${data.studyHours}h study time, ${data.topicsCompleted} topics completed, ${data.achievementsEarned} achievements, ${data.streak} day streak.`
  };
}

/**
 * Generate achievement notification email template
 */
export function getAchievementTemplate(data: AchievementTemplateData): EmailTemplate {
  return {
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Congratulations ${data.fullName}! 🎉</h2>
        <div style="background-color: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">${data.achievementIcon}</div>
          <h3 style="color: #92400e; margin: 0;">${data.achievementTitle}</h3>
          <p style="color: #92400e; margin: 10px 0 0 0;">${data.achievementDescription}</p>
        </div>
        <p>You've unlocked a new achievement! Keep up the excellent work.</p>
        <a href="${data.frontendUrl}/progress" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          View All Achievements
        </a>
      </div>
    `,
    text: `Congratulations! You've unlocked: ${data.achievementTitle} - ${data.achievementDescription}`
  };
}

/**
 * Generate re-engagement notification email template
 */
export function getReEngagementTemplate(data: ReEngagementTemplateData): EmailTemplate {
  return {
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Hi ${data.fullName}! 👋</h2>
        <p>We noticed you haven't been active on Dozu lately. We miss you!</p>
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1e40af; margin-top: 0;">What's waiting for you:</h3>
          <ul style="color: #1e40af;">
            <li>📚 New learning materials</li>
            <li>🎯 Updated study goals</li>
            <li>🏆 New achievements to unlock</li>
            <li>📊 Track your progress</li>
          </ul>
        </div>
        <p>Don't let your learning streak break! Come back and continue your journey.</p>
        <a href="${data.frontendUrl}/topics" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          Continue Learning
        </a>
        <p style="color: #6b7280; font-size: 14px;">
          If you no longer wish to receive these emails, you can update your preferences in your profile settings.
        </p>
      </div>
    `,
    text: `Hi ${data.fullName}! We miss you on Dozu. Come back and continue your learning journey: ${data.frontendUrl}/topics`
  };
}

/**
 * Generate system announcement email template
 */
export function getSystemAnnouncementTemplate(data: SystemAnnouncementTemplateData): EmailTemplate {
  return {
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">📢 ${data.title}</h2>
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
          <p style="margin: 0; font-size: 16px; line-height: 1.6;">${data.message}</p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          Thank you for being part of the Dozu learning community!
        </p>
      </div>
    `,
    text: `${data.title}: ${data.message}`
  };
}
