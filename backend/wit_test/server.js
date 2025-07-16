// server.js – ES-modules
import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import 'dotenv/config.js';

// Chat ve LLM kullanımı (varsa)
import { askWit, askGemini, generateResponse } from './witTest.js';

const app = express();
const port = process.env.PORT || 3000;
app.use(bodyParser.json());

// OpenAI GPT fallback
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

/***************************************************************
 *  POST /chat                                                 *
 ***************************************************************/
app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;
  const providerHdr = (req.headers['x-ai-provider'] || '').toLowerCase();
  if (!userMessage) return res.status(400).json({ error: 'message alanı zorunludur' });

  try {
    const witData = await askWit(userMessage);
    const llmChooser = async (prompt, ctx) => {
      if (providerHdr === 'chatgpt') {
        try { return await askOpenAI(prompt, ctx); }
        catch (e) {
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

/***************************************************************
 *  YENİ: HAZIR RANDEVU API UÇ NOKTALARI (Frontend için)    *
 ***************************************************************/
const data = {
  hospitals: [
    {
      id: 1,
      name: 'Istanbul Şehir Hastanesi',
      branches: [
        {
          id: 11,
          name: 'Kardiyoloji',
          doctors: [
            { id: 111, name: 'Dr. Ayşe Yılmaz', available: ['10:00', '14:00'] },
            { id: 112, name: 'Dr. Can Demir', available: ['09:30', '13:00'] }
          ]
        },
        {
          id: 12,
          name: 'Nöroloji',
          doctors: [
            { id: 121, name: 'Dr. Ahmet Keskin', available: ['11:00', '15:00'] }
          ]
        }
      ]
    },
    {
      id: 2,
      name: 'Ankara Eğitim Hastanesi',
      branches: [
        {
          id: 21,
          name: 'Ortopedi',
          doctors: [
            { id: 211, name: 'Dr. Zeynep Güler', available: ['09:00', '13:30'] }
          ]
        }
      ]
    }
  ]
};

app.get('/api/hospitals', (req, res) => {
  res.json(data.hospitals.map(({ id, name }) => ({ id, name })));
});

app.get('/api/hospitals/:id/branches', (req, res) => {
  const hospital = data.hospitals.find(h => h.id === parseInt(req.params.id));
  if (!hospital) return res.status(404).json({ error: 'Hastane bulunamadı' });
  res.json(hospital.branches.map(({ id, name }) => ({ id, name })));
});

app.get('/api/branches/:id/doctors', (req, res) => {
  const allBranches = data.hospitals.flatMap(h => h.branches);
  const branch = allBranches.find(b => b.id === parseInt(req.params.id));
  if (!branch) return res.status(404).json({ error: 'Branş bulunamadı' });
  res.json(branch.doctors.map(({ id, name }) => ({ id, name })));
});

app.get('/api/doctors/:id/times', (req, res) => {
  const allDoctors = data.hospitals.flatMap(h => h.branches.flatMap(b => b.doctors));
  const doctor = allDoctors.find(d => d.id === parseInt(req.params.id));
  if (!doctor) return res.status(404).json({ error: 'Doktor bulunamadı' });
  res.json({ doctor: doctor.name, available: doctor.available });
});

app.listen(port, () => {
  console.log(`🟢 API http://localhost:${port} üzerinde çalışıyor.`);
});