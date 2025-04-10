import express from 'express';
import { registerRoute } from '../register.routes';
import { handleDemoController, handleInsertDemoController } from '@/controllers/demo.controller';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
const router = express.Router();

// must add global async handler
globalAsyncHandler(router);

// apply middleware here and use key word "use"
// router.use(middleware function here)

// implement route and method below middleware
router.get('/', handleDemoController);
router.post('/', handleInsertDemoController);
// router.put('/', handleDemoController);

//important: remember register router  !!!!
registerRoute('/demo', router, {
  description: 'Demo API endpoints for testing',
  version: 'v1',
  isEnabled: true,
});

export default router;
