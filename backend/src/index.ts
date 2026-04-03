import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectRedis } from './config/redis';
import authRoutes from './routes/auth';
import quizRoutes from './routes/quiz';
import adminRoutes from './routes/admin';
import { startTimerExpiryJob } from './jobs/timerExpiry.job';
import { startBufferFlushJob } from './jobs/bufferFlush.job';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api', quizRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

const start = async () => {
  await connectRedis();
  startTimerExpiryJob();
  startBufferFlushJob();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

start().catch(console.error);
