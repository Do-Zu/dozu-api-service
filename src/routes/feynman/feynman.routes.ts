import express from 'express';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
const router = express.Router();

// Apply global async handler
globalAsyncHandler(router);

// Define routes


// Register the router
registerRoute('/feynman', router, {
  description: 'Feynman API endpoints',
  version: 'v1',
  isEnabled: true,
});
  
export default router;
