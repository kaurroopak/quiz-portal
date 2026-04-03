import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth.middleware';
import {
  createQuiz, listQuizzes, getQuiz, updateQuiz, deleteQuiz,
  addQuestion, updateQuestion, deleteQuestion,
  getQuizSessions, getSessionReport, getQuizResults, getAllStudents
} from '../controllers/admin.controller';

const router = Router();
router.use(authenticate, adminOnly);

router.post('/quizzes', createQuiz);
router.get('/quizzes', listQuizzes);
router.get('/quizzes/:id', getQuiz);
router.put('/quizzes/:id', updateQuiz);
router.delete('/quizzes/:id', deleteQuiz);

router.post('/quizzes/:quizId/questions', addQuestion);
router.put('/questions/:id', updateQuestion);
router.delete('/questions/:id', deleteQuestion);

router.get('/quizzes/:quizId/sessions', getQuizSessions);
router.get('/quizzes/:quizId/results', getQuizResults);
router.get('/sessions/:sessionId/report', getSessionReport);
router.get('/students', getAllStudents);

export default router;
