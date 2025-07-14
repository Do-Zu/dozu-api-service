import db from '@/libs/drizzleClient.lib';
import { userFeatureUsageTable } from '@/models/subscription/userFeatureUsage.model';
import logger from '@/utils/logger';
import { lt } from 'drizzle-orm';
import cron from 'node-cron';

class FeatureUsageCleanupJob {
    // Run daily at 2 AM
    start() {
        cron.schedule('0 2 * * *', async () => {
            try {
                // Clean up expired usage records (older than 1 year)
                const oneYearAgo = new Date();
                oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

                await db.delete(userFeatureUsageTable).where(lt(userFeatureUsageTable.resetPeriodEnd, oneYearAgo));

                logger.info('Feature usage cleanup completed');
            } catch (error) {
                logger.error('Feature usage cleanup failed:', error);
            }
        });
    }
}

export const featureUsageCleanupJob = new FeatureUsageCleanupJob();
