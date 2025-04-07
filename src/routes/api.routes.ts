import express, { Router } from 'express';
import globalAsyncHandler from '@/middleware/handler';

const router: Router = express.Router();

//import routers here
import './demo/demo.routes';
import { getRoutes } from './register.routes';

// Apply global async handler to router
globalAsyncHandler(router);

getRoutes()?.forEach(({ path, router: moduleRouter }) => {
  if (!path || typeof path !== 'string') {
    throw new Error('Path must be a string and cannot be empty');
  }
  if (!moduleRouter || !(moduleRouter instanceof Router)) {
    throw new Error('Router must be an instance of express.Router');
  }
  const normalizedPath: string = path.startsWith('/') ? path : `/${path}`;
  console.log(normalizedPath, '\n');
  router.use(normalizedPath, moduleRouter);
});

export default router;
