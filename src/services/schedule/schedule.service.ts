// import logger from '@/utils/logger';
// import { scheduleRepo } from '@/repositories/schedule/schedule.repo';
// import { NotFoundError } from '@/core/error';

/**
 * Service class for Schedule functionality
 */
class ScheduleService {
  public async getScheduleInWeek() {
    return null;
  }

  public async generateSchedule() {
    return {
      schedules: [],
    };
  }
}

export const scheduleService = new ScheduleService();
