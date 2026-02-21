import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDb, initDb } from './lib/db.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize DB on startup
initDb().catch(console.error);

// Risk Engine Classification Logic
const calculateRisk = (symptoms: string[]) => {
  const highRiskSymptoms = ['headache', 'swelling', 'bleeding', 'seizure', 'fever', 'reduced movement'];
  const mediumRiskSymptoms = ['nausea', 'vomiting', 'fatigue', 'back pain'];

  let score = 0;
  let hasHighRisk = false;

  symptoms.forEach(s => {
    const symptomRaw = s.toLowerCase();
    if (highRiskSymptoms.some(h => symptomRaw.includes(h))) {
      score += 40;
      hasHighRisk = true;
    } else if (mediumRiskSymptoms.some(m => symptomRaw.includes(m))) {
      score += 15;
    } else {
      score += 5;
    }
  });

  if (hasHighRisk || score >= 70) return { score: Math.min(score, 100), level: 'high' };
  if (score >= 40) return { score, level: 'medium' };
  return { score, level: 'low' };
};

// 1. Health Check pointing to SQLite
app.get('/api/health', async (req, res) => {
  let dbStatus = 'untested';
  try {
    const db = await getDb();
    await db.get('SELECT 1');
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'error';
  }

  res.json({ status: 'ok', message: 'Backend is running correctly with SQLite.', database: dbStatus });
});

// 2. Save Conversation & Assess Risk
app.post('/api/conversations', async (req, res) => {
  const { user_id, transcript, detected_symptoms } = req.body;

  if (!user_id || !transcript) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const db = await getDb();
    const convId = `conv_${Date.now()}`;
    const symptomsArray = Array.isArray(detected_symptoms) ? detected_symptoms : [];

    // Save conversation
    await db.run(
      'INSERT INTO conversations (id, user_id, transcript, detected_symptoms) VALUES (?, ?, ?, ?)',
      [convId, user_id, transcript, JSON.stringify(symptomsArray)]
    );

    // Run Risk Engine
    const risk = calculateRisk(symptomsArray);
    const assessmentId = `risk_${Date.now()}`;

    // Save Risk Assessment
    await db.run(
      'INSERT INTO risk_assessments (id, user_id, risk_score, risk_level, symptoms) VALUES (?, ?, ?, ?, ?)',
      [assessmentId, user_id, risk.score, risk.level, JSON.stringify(symptomsArray)]
    );

    // Tiered Alert: If High risk, escalate to CHEW/Hospital
    let alertCreated = false;
    if (risk.level === 'high') {
      const alertId = `alert_${Date.now()}`;
      await db.run(
        'INSERT INTO alerts (id, user_id, status) VALUES (?, ?, ?)',
        [alertId, user_id, 'pending']
      );
      alertCreated = true;
    }

    res.json({
      success: true,
      conversation_id: convId,
      risk_assessment: risk,
      alert_triggered: alertCreated
    });

  } catch (error) {
    console.error('Error saving conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Fetch Patient History (Memory for Context)
app.get('/api/patients/:user_id/history', async (req, res) => {
  const { user_id } = req.params;
  try {
    const db = await getDb();
    const conversations = await db.all(
      'SELECT transcript, detected_symptoms, created_at FROM conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
      [user_id]
    );
    res.json({ history: conversations });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. Fetch Active Alerts (CHEW Dashboard)
app.get('/api/alerts', async (req, res) => {
  try {
    const db = await getDb();
    // Simplified join for the demo to get the latest risk assessment alongside the alert
    const alerts = await db.all(`
      SELECT a.id as alert_id, a.user_id, a.status, a.created_at as alert_created_at,
             r.risk_score, r.risk_level, r.symptoms
      FROM alerts a
      LEFT JOIN risk_assessments r ON a.user_id = r.user_id
      WHERE a.status = 'pending'
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `);

    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
