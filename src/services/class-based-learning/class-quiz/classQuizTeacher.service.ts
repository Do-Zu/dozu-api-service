import { CreateClassQuizDto, ScheduleDto, UpdateQuizSettingsDto } from '@/dtos/class-quiz/classQuiz.dto';
import { classQuizTeacherRepo } from '@/repositories/class-based-learning/class-quiz/classQuizTeacher.repo';

class ClassQuizTeacherService {
  createDraftQuiz(classId: number, dto: CreateClassQuizDto) {
    return classQuizTeacherRepo.createDraftQuiz(classId, dto);
  }
  upsertDraft(classQuizId: number, dto: { teacherId: number; draftJson: any }) {
    return classQuizTeacherRepo.upsertDraft(classQuizId, dto);
  }
  updateSettings(classQuizId: number, dto: UpdateQuizSettingsDto) {
    return classQuizTeacherRepo.updateSettings(classQuizId, dto);
  }
  schedule(classQuizId: number, dto: ScheduleDto) {
    return classQuizTeacherRepo.schedule(classQuizId, dto);
  }
  publish(classQuizId: number) {
    return classQuizTeacherRepo.publish(classQuizId);
  }
  setAcceptingSubmissions(classQuizId: number, accepting: boolean) {
    return classQuizTeacherRepo.setAcceptingSubmissions(classQuizId, accepting);
  }
  close(classQuizId: number) {
    return classQuizTeacherRepo.close(classQuizId);
  }
  listClassQuizzes(classId: number, status?: 'draft'|'scheduled'|'published'|'closed') {
    return classQuizTeacherRepo.listClassQuizzes(classId, status);
  }
    getDraft(classQuizId: number, teacherId?: number) {
    return classQuizTeacherRepo.getDraft(classQuizId, teacherId);
  }
}
export const classQuizTeacherService = new ClassQuizTeacherService();
