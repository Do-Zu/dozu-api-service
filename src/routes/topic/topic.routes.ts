// import { globalAsyncHandler } from "@/middleware/handler/handler.v2";
// import { Router } from "express";
// import { registerRoute } from "../register.routes";
// import { handleDeleteAllFlashcardsController, handleDeleteOneFlashcardController, handleGetAllFlashcardsController, handleInsertManyFlashcardsController, handleUpdateManyFlashcardsController, handleUpdateOneFlashcardController } from "@/controllers/topic.controller";
// import flashcardController from "@/controllers/flashcard.controller";

// const router = Router();

// globalAsyncHandler(router);

// // hiển thị danh sách flashcards
// router.get('/:topicId/flashcards', flashcardController.handleGetFlashcardsForTopic);

// // update 1 flashcard cụ thể
// router.patch('/:topicId/flashcards/:flashcardId', handleUpdateOneFlashcardController);

// // delete 1 flashcard cụ thể
// router.delete('/:topicId/flashcards/:flashcardId', handleDeleteOneFlashcardController);

// // tạo mới 1 danh sách flashcards 
// router.post('/:topicId/flashcards', handleInsertManyFlashcardsController);
// // router.patch('/:topicId/flashcards', handleUpdateManyFlashcardsController);
// // router.delete('/:topicId/flashcards', handleDeleteAllFlashcardsController);

// // user có thể tạo, chỉnh sửa, xóa cùng 1 lúc
// router.post('/:topicId/flashcards/batch');

// registerRoute('/topics', router, {
//     description: 'Topic API for CRUD new Topic and Flashcard in a topic',
//     version: 'v1',
//     isEnabled: true
// })

// export const topicRoutes = router;
