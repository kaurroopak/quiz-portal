import { Response } from 'express';
import prisma from '../config/db';
import redis from '../config/redis';
import { computeScore } from '../services/score.service';

export const listActiveQuizzes = async (_req: any, res: Response) => {
  try {
    const quizzes = await prisma.quiz.findMany({
      where: { status: 'active' },
      include: { _count: { select: { questions: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(quizzes);
  } catch { res.status(500).json({ error: 'Server error' }); }
};

export const startSession = async (req: any, res: Response) => {
  try {
    const { quizId } = req.body;
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { questions: { orderBy: { orderIndex: 'asc' } } } });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    if (quiz.status !== 'active') return res.status(400).json({ error: 'Quiz is not active' });

    const existing = await prisma.session.findFirst({ where: { studentId: req.user.id, quizId, status: 'active' } });
    if (existing) {
      const remaining = await redis.get(`session:${existing.id}:remaining`);
      const questions = quiz.shuffleQuestions ? shuffle(quiz.questions) : quiz.questions;
      const safeQuestions = questions.map(({ correctAnswer: _ca, ...q }) => q);
      return res.json({ session: existing, questions: safeQuestions, remainingSeconds: remaining ? parseInt(remaining as string) : quiz.durationSeconds });
    }

    const session = await prisma.session.create({ data: { studentId: req.user.id, quizId, ipAddress: req.ip } });
    await redis.setEx(`session:${session.id}:remaining`, quiz.durationSeconds, String(quiz.durationSeconds));

    const questions = quiz.shuffleQuestions ? shuffle(quiz.questions) : quiz.questions;
    const safeQuestions = questions.map(({ correctAnswer: _ca, ...q }) => q);
    res.status(201).json({ session, questions: safeQuestions, remainingSeconds: quiz.durationSeconds });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

export const getSessionStatus = async (req: any, res: Response) => {
  try {
    const session = await prisma.session.findFirst({ where: { id: req.params.id, studentId: req.user.id } });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const remaining = await redis.get(`session:${session.id}:remaining`);
    res.json({ status: session.status, remainingSeconds: remaining ? parseInt(remaining as string) : 0, submittedAt: session.submittedAt });
  } catch { res.status(500).json({ error: 'Server error' }); }
};

export const submitSession = async (req: any, res: Response) => {
  try {
    const session = await prisma.session.findFirst({ where: { id: req.params.id, studentId: req.user.id, status: 'active' } });
    if (!session) return res.status(404).json({ error: 'Active session not found' });

    await flushRedisBuffer(session.id);
    const { score, totalMarks } = await computeScore(session.id, session.quizId);
    const updated = await prisma.session.update({ where: { id: session.id }, data: { status: 'submitted', submittedAt: new Date(), score, totalMarks } });

    const firstQ = await prisma.question.findFirst({ where: { quizId: session.quizId } });
    if (firstQ) await prisma.questionEvent.create({ data: { sessionId: session.id, questionId: firstQ.id, eventType: 'submitted', payload: { score, totalMarks } } });

    await redis.del(`session:${session.id}:remaining`);
    await redis.del(`session:${session.id}:buffer`);
    res.json({ message: 'Quiz submitted', score, totalMarks, session: updated });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};

export const mySessionHistory = async (req: any, res: Response) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { studentId: req.user.id },
      include: { quiz: { select: { title: true, durationSeconds: true } } },
      orderBy: { startedAt: 'desc' },
    });
    res.json(sessions);
  } catch { res.status(500).json({ error: 'Server error' }); }
};

export const flushRedisBuffer = async (sessionId: string) => {
  const bufferKey = `session:${sessionId}:buffer`;
  const buffer = await redis.hGetAll(bufferKey);
  if (!buffer || Object.keys(buffer).length === 0) return;
  for (const [questionId, raw] of Object.entries(buffer)) {
    const data = JSON.parse(raw as string);
    await prisma.sessionAnswer.upsert({
      where: { sessionId_questionId: { sessionId, questionId } },
      update: { answer: data.answer, changeCount: data.changeCount, timeSpentMs: BigInt(data.timeSpentMs), markedForReview: data.markedForReview },
      create: { sessionId, questionId, answer: data.answer, changeCount: data.changeCount, timeSpentMs: BigInt(data.timeSpentMs), markedForReview: data.markedForReview },
    });
  }
};

function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }
