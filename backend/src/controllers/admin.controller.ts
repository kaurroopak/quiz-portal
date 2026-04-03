import { Response } from 'express';
import prisma from '../config/db';

export const createQuiz = async (req: any, res: Response) => {
  try {
    const { title, description, durationSeconds, shuffleQuestions, startTime } = req.body;
    const quiz = await prisma.quiz.create({
      data: { title, description, durationSeconds, shuffleQuestions: !!shuffleQuestions, startTime: startTime ? new Date(startTime) : null, createdBy: req.user.id },
    });
    res.status(201).json(quiz);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
};

export const listQuizzes = async (_req: any, res: Response) => {
  try {
    const quizzes = await prisma.quiz.findMany({
      include: { _count: { select: { questions: true, sessions: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(quizzes);
  } catch { res.status(500).json({ error: 'Server error' }); }
};

export const getQuiz = async (req: any, res: Response) => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: String(req.params.id) },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json(quiz);
  } catch { res.status(500).json({ error: 'Server error' }); }
};

export const updateQuiz = async (req: any, res: Response) => {
  try {
    const { title, description, durationSeconds, shuffleQuestions, status, startTime } = req.body;
    const quiz = await prisma.quiz.update({
      where: { id: String(req.params.id) },
      data: { title, description, durationSeconds, shuffleQuestions, status, startTime: startTime ? new Date(startTime) : undefined },
    });
    res.json(quiz);
  } catch { res.status(500).json({ error: 'Server error' }); }
};

export const deleteQuiz = async (req: any, res: Response) => {
  try {
    await prisma.quiz.delete({ where: { id: String(req.params.id) } });
    res.json({ message: 'Quiz deleted' });
  } catch { res.status(500).json({ error: 'Server error' }); }
};

export const addQuestion = async (req: any, res: Response) => {
  try {
    const { text, options, correctAnswer, marks, orderIndex } = req.body;
    const question = await prisma.question.create({
      data: { quizId: String(req.params.quizId), text, options, correctAnswer, marks: marks || 1, orderIndex: orderIndex || 0, questionType: 'mcq' },
    });
    res.status(201).json(question);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
};

export const updateQuestion = async (req: any, res: Response) => {
  try {
    const { text, options, correctAnswer, marks, orderIndex } = req.body;
    const question = await prisma.question.update({
      where: { id: String(req.params.id) },
      data: { text, options, correctAnswer, marks, orderIndex },
    });
    res.json(question);
  } catch { res.status(500).json({ error: 'Server error' }); }
};

export const deleteQuestion = async (req: any, res: Response) => {
  try {
    await prisma.question.delete({ where: { id: String(req.params.id) } });
    res.json({ message: 'Question deleted' });
  } catch { res.status(500).json({ error: 'Server error' }); }
};

export const getQuizSessions = async (req: any, res: Response) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { quizId: String(req.params.quizId) },
      include: { student: { select: { name: true, email: true } } },
      orderBy: { startedAt: 'desc' },
    });
    res.json(sessions);
  } catch { res.status(500).json({ error: 'Server error' }); }
};

export const getSessionReport = async (req: any, res: Response) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: String(req.params.sessionId) },
      include: {
        student: { select: { name: true, email: true } },
        quiz: { select: { title: true, durationSeconds: true } },
        answers: { include: { question: true } },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch { res.status(500).json({ error: 'Server error' }); }
};

export const getQuizResults = async (req: any, res: Response) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { quizId: String(req.params.quizId), status: { in: ['submitted', 'expired'] } },
      include: { student: { select: { name: true, email: true } }, answers: true },
      orderBy: { score: 'desc' },
    });
    const quiz = await prisma.quiz.findUnique({ where: { id: String(req.params.quizId) }, include: { _count: { select: { questions: true } } } });
    res.json({ quiz, sessions });
  } catch { res.status(500).json({ error: 'Server error' }); }
};

export const getAllStudents = async (_req: any, res: Response) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'student' },
      select: { id: true, name: true, email: true, createdAt: true, _count: { select: { sessions: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(students);
  } catch { res.status(500).json({ error: 'Server error' }); }
};
