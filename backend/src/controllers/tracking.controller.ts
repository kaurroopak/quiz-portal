import { Response } from 'express';
import prisma from '../config/db';
import redis from '../config/redis';

interface TrackingEvent {
  question_id: string;
  event_type: 'focus' | 'blur' | 'answer_changed' | 'revisit' | 'submitted';
  payload: { answer?: string; added_time_ms?: number; visit_count?: number; change_count?: number; marked_for_review?: boolean; };
  client_ts: number;
}

export const batchEvents = async (req: any, res: Response) => {
  try {
    const { events } = req.body as { events: TrackingEvent[] };
    const sessionId: string = req.params.sessionId;

    const session = await prisma.session.findFirst({
      where: { id: sessionId, studentId: req.user.id, status: 'active' },
    });
    if (!session) return res.status(404).json({ error: 'Active session not found' });

    const remaining = await redis.get(`session:${sessionId}:remaining`);
    const remainingSecs = remaining ? parseInt(remaining as string) : 0;
    if (remainingSecs <= 0) return res.status(400).json({ error: 'Quiz time has expired', remainingSeconds: 0 });

    const bufferKey = `session:${sessionId}:buffer`;
    const dbEvents: any[] = [];

    for (const event of events) {
      dbEvents.push({ sessionId, questionId: event.question_id, eventType: event.event_type, payload: event.payload });

      if (event.event_type === 'answer_changed' || event.event_type === 'blur') {
        const currentRaw = await redis.hGet(bufferKey, event.question_id);
        const current = currentRaw ? JSON.parse(currentRaw as string) : { answer: null, changeCount: 0, timeSpentMs: 0, markedForReview: false };

        if (event.event_type === 'answer_changed' && event.payload.answer !== undefined) {
          current.answer = event.payload.answer;
          current.changeCount += 1;
        }
        if (event.payload.added_time_ms) current.timeSpentMs += event.payload.added_time_ms;
        if (event.payload.marked_for_review !== undefined) current.markedForReview = event.payload.marked_for_review;

        await redis.hSet(bufferKey, event.question_id, JSON.stringify(current));
        await redis.expire(bufferKey, remainingSecs + 300);
      }
    }

    if (dbEvents.length > 0) await prisma.questionEvent.createMany({ data: dbEvents });

    const newRemaining = Math.max(0, remainingSecs - 5);
    await redis.setEx(`session:${sessionId}:remaining`, newRemaining + 10, String(newRemaining));

    res.json({ status: 'ok', remainingSeconds: newRemaining });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
};
