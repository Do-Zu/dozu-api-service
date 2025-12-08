import express from 'express';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { embeddingController } from '@/controllers/embedding/embedding.controller';

const router = express.Router();

// must add global async handler
globalAsyncHandler(router);

// router.use(middleware function here)
router.post('/', embeddingController.processEmbedding);
router.post('/query', embeddingController.queryTopSimilarity);

//important: remember register router
registerRoute('/v1/embedding', router, {
    description: 'embedding API endpoints ',
    version: 'v1',
    isEnabled: true,
});

export default router;
