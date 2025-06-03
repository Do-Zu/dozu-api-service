import express from 'express';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { scheduleController } from '@/controllers/schedule/schedule.controller';
const router = express.Router();

// Apply global async handler
globalAsyncHandler(router);

// Define routes
router.get('/', scheduleController.getScheduleInWeek);
router.post('/generate', scheduleController.generateSchedule);

// Register the router
registerRoute('/schedule', router, {
  description: 'Schedule API endpoints',
  version: 'v1',
  isEnabled: true,
});

export default router;
