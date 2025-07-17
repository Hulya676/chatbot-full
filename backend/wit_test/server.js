// server.js – ES-modules
import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import 'dotenv/config.js';

// ROUTES
import appointmentRoutes from './routes/appointment.routes.js';
import hospitalRoutes from './routes/hospital.routes.js';
import doctorRoutes from './routes/doctor.routes.js'; // doctorRoutes'u hala import ediyoruz

// Chat ve LLM
import { askWit, askGemini, generateResponse } from './witTest.js';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// ROUTE MOUNTING
app.use('/api/appointments', appointmentRoutes);
app.use('/api/hospitals', hospitalRoutes);

// Branşa göre doktorları getiren rota için: /api/branches/:branchId/doctors
// doctorRoutes içinde router.get('/:branchId/doctors', getDoctors); olmalı
app.use('/api/branches', doctorRoutes);

// Doktorun müsait zaman dilimlerini getiren rota için: /api/doctors/:doctorId/times
// doctorRoutes içinde router.get('/:doctorId/times', getDoctorSlots); olmalı
app.use('/api/doctors', doctorRoutes); // BURADAKİ DEĞİŞİKLİK: doctorRoutes'u bir daha bağlıyoruz

// ✅ CHATBOT (Wit.ai + Gemini + OpenAI)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || null;

async function askOpenAI(prompt, systemCtx = '') {
  if (!OPENAI_API_KEY) throw new Error('NO_OPENAI_KEY');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemCtx },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'OpenAI error');
  return data.choices?.[0]?.message?.content?.trim() || '🤖 ChatGPT’den anlamlı yanıt gelmedi.';
}

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;
  const providerHdr = (req.headers['x-ai-provider'] || '').toLowerCase();
  if (!userMessage) return res.status(400).json({ error: 'message alanı zorunludur' });

  try {
    const witData = await askWit(userMessage);
    const llmChooser = async (prompt, ctx) => {
      if (providerHdr === 'chatgpt') {
        try {
          return await askOpenAI(prompt, ctx);
        } catch (e) {
          if (e.message !== 'NO_OPENAI_KEY') throw e;
          console.warn('GPT istendi fakat OPENAI_API_KEY yok; Gemini kullanılıyor.');
        }
      }
      return await askGemini(prompt, ctx);
    };

    const botResponse = await generateResponse(witData, userMessage, llmChooser);
    res.json({ reply: botResponse });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
});

// SERVER LISTEN
app.listen(port, () => {
  console.log(`🟢 API http://localhost:${port} üzerinden çalışıyor.`);
});