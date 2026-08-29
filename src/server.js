import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

function allowedOrigin(origin) {
  if (!origin) return true;
  const extras = String(process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (extras.includes('*') || extras.includes(origin)) return true;
  if (origin === 'http://localhost:5173' || origin === 'http://localhost:4173') return true;
  return /^https:\/\/estimates-front([\w.-]*)?\.vercel\.app$/.test(origin);
}

const app = express();
app.use(cors({ origin: (origin, cb) => cb(null, allowedOrigin(origin)) }));
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan(process.env.VERCEL ? 'tiny' : 'dev'));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || 4000);
  const bind = (tries = 0) => {
    const server = app.listen(port, () => console.log('API listening on http://localhost:' + port + '/api'));
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE' && tries < 8) {
        setTimeout(() => bind(tries + 1), 250);
        return;
      }
      throw err;
    });
  };
  bind();
}
