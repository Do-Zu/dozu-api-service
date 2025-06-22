// Test script to populate sample progress data
// Run this with: npx ts-node -r tsconfig-paths/register scripts/populate-test-data.ts

import { progressRepository } from '../src/repositories/progress/progress.repo';
import { ProgressStatus, ContentType } from '../src/types/progress/progress.type';

async function populateTestData() {
  console.log('🚀 Starting to populate test data...');
  
  const userId = 'user_123';
  
  try {
    // 1. Create some progress records
    console.log('📚 Creating progress records...');
      const progressRecords = [
      {
        userId,
        contentId: 'topic_javascript_basics',
        contentType: 'topic' as ContentType,
        completionPercentage: 100,
        status: ProgressStatus.COMPLETED,
        score: 92.5,
        metadata: {
          timeSpent: 180,
          attempts: 1,
          notes: 'Completed JavaScript basics topic'
        }
      },
      {
        userId,
        contentId: 'topic_react_advanced',
        contentType: 'topic' as ContentType,
        completionPercentage: 65,
        status: ProgressStatus.IN_PROGRESS,
        score: 78.0,
        metadata: {
          timeSpent: 240,
          attempts: 2,
          notes: 'Currently learning React hooks'
        }
      },
      {
        userId,
        contentId: 'quiz_html_basics',
        contentType: ContentType.QUIZ,
        completionPercentage: 100,
        status: ProgressStatus.COMPLETED,
        score: 85.0,
        metadata: {
          timeSpent: 25,
          attempts: 1,
          answers: { q1: 'A', q2: 'C', q3: 'B', q4: 'D' }
        }
      },
      {
        userId,
        contentId: 'flashcard_css_properties',
        contentType: ContentType.FLASHCARD,
        completionPercentage: 100,
        status: ProgressStatus.COMPLETED,
        score: 95.5,
        metadata: {
          timeSpent: 45,
          attempts: 1,
          notes: 'Mastered CSS properties'
        }
      },
      {
        userId,
        contentId: 'video_nodejs_intro',
        contentType: ContentType.VIDEO,
        completionPercentage: 100,
        status: ProgressStatus.COMPLETED,
        score: 88.0,
        metadata: {
          timeSpent: 120,
          attempts: 1,
          lastPosition: 3600
        }
      },
      {
        userId,
        contentId: 'note_web_security',
        contentType: ContentType.NOTE,
        completionPercentage: 80,
        status: ProgressStatus.IN_PROGRESS,
        metadata: {
          timeSpent: 60,
          attempts: 1,
          lastPosition: 2400
        }
      }
    ];

    for (const record of progressRecords) {
      const created = await progressRepository.create(record);
      console.log(`✅ Created progress: ${created.contentId}`);
    }

    // 2. Create daily study records for the past 14 days
    console.log('📅 Creating daily study records...');
    
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Random study time between 30-180 minutes
      const randomMinutes = Math.floor(Math.random() * 150) + 30;
      
      const record = await progressRepository.createDailyStudyRecord({
        userId,
        date: dateString,
        totalMinutes: randomMinutes,
        sessionsCount: Math.floor(Math.random() * 3) + 1
      });
      
      console.log(`✅ Created daily study record for ${dateString}: ${randomMinutes} minutes`);
    }

    console.log('🎉 Test data populated successfully!');
    console.log('🔗 You can now test the following endpoints:');
    console.log('   GET /progress?userId=1');
    console.log('   GET /progress/overview');
    console.log('   GET /progress/dashboard');
    console.log('   GET /progress/daily-study?days=7');
    console.log('   GET /progress/learning-methods');
    
  } catch (error) {
    console.error('❌ Error populating test data:', error);
  }
}

// Run the script
if (require.main === module) {
  populateTestData().then(() => {
    console.log('Script completed');
    process.exit(0);
  }).catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

export { populateTestData };
