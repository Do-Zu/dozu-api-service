import { authMiddleware, validateTeacher } from "@/middleware/auth.middleware";
import { globalAsyncHandler } from "@/middleware/handler/handler.v2";
import { Router } from "express";
import classController from "@/controllers/class-based-learning/class.controller";
import { registerRoute } from "../register.routes";
import topicController from "@/controllers/topic/topic.controller";
import classEnrollmentController from "@/controllers/class-based-learning/classEnrollment.controller";

const router = Router();

globalAsyncHandler(router);

// todo-ka: add middleware for verifying teacher
router.use(authMiddleware);

router.get('/', classController.getClassesForUser);
router.post('/', validateTeacher, classController.createClassForUser);
router.put('/:classId', validateTeacher, classController.updateClassById);

router.get('/:classId/topics', topicController.getTopicsInClass);
router.post('/:classId/topic', validateTeacher, topicController.createTopicForClass);
router.post('/enrollments', classEnrollmentController.joinClass);

router.get('/:classId', classController.getClassById);

registerRoute('/classes', router, {
    description: 'Classes API for managing classes (of teacher)',
    version: 'v1',
    isEnabled: true,
});

export const classManagementRoutes = router;