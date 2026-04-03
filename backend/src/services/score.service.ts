import prisma from '../config/db';

export const computeScore = async (sessionId: string, quizId: string) => {
  const questions = await prisma.question.findMany({ where: { quizId } });
  const answers = await prisma.sessionAnswer.findMany({ where: { sessionId } });

  const answerMap = new Map(answers.map(a => [a.questionId, a.answer]));

  let score = 0;
  let totalMarks = 0;

  for (const question of questions) {
    totalMarks += question.marks;
    const studentAnswer = answerMap.get(question.id);
    const isCorrect = studentAnswer === question.correctAnswer;

    if (isCorrect) score += question.marks;

    // Update isCorrect in session_answers
    await prisma.sessionAnswer.upsert({
      where: { sessionId_questionId: { sessionId, questionId: question.id } },
      update: { isCorrect },
      create: { sessionId, questionId: question.id, answer: studentAnswer ?? null, isCorrect },
    });
  }

  return { score, totalMarks };
};
