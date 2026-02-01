import express from 'express';
import ticketsRouter from './routes/tickets.js';

const app = express();

// Body parsers
app.use(express.json({ limit: '2mb' }));

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

// Routes
app.use('/tickets', ticketsRouter);

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const payload = {
    error: err.message || 'Internal Server Error',
    details: err.details || undefined,
  };
  res.status(status).json(payload);
});

export default app;
