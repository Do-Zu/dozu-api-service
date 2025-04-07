import express from 'express';
import { registerRoute } from '../register.routes';
import { handleDemoController } from '@/controllers/demo.controller';
import globalAsyncHandler from '@/middleware/handler';

const router = express.Router();

globalAsyncHandler(router);

// apply middleware here and use key word "use"
// router.use(middleware function here)

// implement route and method below middleware
router.get('/', handleDemoController);

//important: remember register router  !!!!
registerRoute('/demo', router); // register the route with the path "/demo"

export default router;
