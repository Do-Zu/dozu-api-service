import express from 'express';
import { registerRoute } from '../register.routes';
import { globalAsyncHandler } from '@/middleware/handler/handler.v2';
import { authMiddleware, validateTeacher } from '@/middleware/auth.middleware';
import {
    addFlashcardsToNodeController,
    deleteMindmapController,
    getAllChildrenOfANodeController,
    getAllNodesOfMindmapController,
    getClassProgressOfNodeController,
    getFlashcardsOfNodeController,
    getProgressOfNodeController,
    getSingularNodeController,
    getTopicMindmapController,
    saveTopicMindmapController,
    updateFlashcardLinksController,
    uploadImageTESTDELETELATER,
} from '@/controllers/mindmap/mindmap.controller';
import { fileUploadSingleMiddleware } from '@/libs/multer.lib';
import paramsValidator from '@/core/validations/params.validator';
import { verifyMindmapOwner } from '@/middleware/mindmap/mindmap.middleware';
import topicMiddleware from '@/middleware/topic/topic.middleware';
const router = express.Router();

globalAsyncHandler(router);

// apply middleware here and use key word "use"
// router.use(middleware function here)
router.use(authMiddleware);

router.post('/uploadImageTESTINGDELETELATER', fileUploadSingleMiddleware, uploadImageTESTDELETELATER);
router.post('/:topicId', saveTopicMindmapController);

router.get('/:topicId', getTopicMindmapController);
router.delete('/:topicId', verifyMindmapOwner, deleteMindmapController);
router.get('/:topicId/nodes', getAllNodesOfMindmapController);
router.get('/:topicId/nodes/:nodeId/children', getAllChildrenOfANodeController);
// router.get('/:topicId/nodes/:nodeId', getSingularNodeController);
router.get('/nodes/:nodeId', getFlashcardsOfNodeController); //todo - Duy: Check if  need to improve url structure
router.get('/nodes/:nodeId/progress', getProgressOfNodeController); //todo - Duy: Check if  need to improve url structure
router.get(
    '/:classId/:nodeId/class-progress',
    paramsValidator.validateId('classId'),
    validateTeacher,
    getClassProgressOfNodeController
);

// router.put('/:topicId/nodes/:nodeId', addFlashcardsToNodeController);
router.put(
    '/:topicId/nodes/:nodeId',
    paramsValidator.validateId('topicId'),
    topicMiddleware.verifyTopicByIdInParam,
    topicMiddleware.verifyUserCanAccessTopic,
    updateFlashcardLinksController
);

registerRoute('/mindmap', router, {
    description: 'Mindmap endpoints',
    version: 'v1',
    isEnabled: true,
});

export default router;
