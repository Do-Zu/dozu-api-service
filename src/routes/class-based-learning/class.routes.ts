import { authMiddleware, validateTeacher } from "@/middleware/auth.middleware";
import { globalAsyncHandler } from "@/middleware/handler/handler.v2";
import { Router } from "express";
import classController from "@/controllers/class-based-learning/class.controller";
import { registerRoute } from "../register.routes";
import topicController from "@/controllers/topic/topic.controller";

const router = Router();

globalAsyncHandler(router);

// todo-ka: add middleware for verifying teacher
router.use(authMiddleware);

router.get('/', classController.handleGetAllClasses);
router.post('/', validateTeacher, classController.handleCreateClass);
router.put('/:classId', validateTeacher, classController.handleUpdateClass);

router.get('/:classId/topics', topicController.handleGetAllTopicsInClass);
router.post('/:classId/topic', validateTeacher, topicController.handleCreateTopicInClass);
router.post('/enrollments', classController.handleJoinClass);

registerRoute('/classes', router, {
    description: 'Classes API for managing classes (of teacher)',
    version: 'v1',
    isEnabled: true,
});

export const classManagementRoutes = router;