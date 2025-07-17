/******************************************************************
 * witTest.js  –  Wit.ai + Gemini entegrasyonu
 * ---------------------------------------------------------------
 * • WIT_TOKEN  ve GEMINI_API_KEY  .env içinde tanımlı olmalı
 * • Oturum bilgisi (hastane, bölüm, tarih) tutulur
 * • generateResponse, dışarıdan verilen llmFn parametresiyle
 * ChatGPT / Gemini seçiminde esnek çalışır
 ******************************************************************/

import fetch from 'node-fetch';
// import 'dotenv/config.js'; // BU SATIRI KALDIRIN! SADECE server.js'de yüklenecek.

const WIT_TOKEN      = process.env.WIT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!WIT_TOKEN || !GEMINI_API_KEY) {
  // Bu hata fırlatma hala kalmalı, çünkü server.js yüklemezse sorun var demektir.
  throw new Error('WIT_TOKEN veya GEMINI_API_KEY tanımlı değil (.env)!');
}

/* -------------------------------------------------------------- */
/* 1)  Oturum nesnesi                                             */
/* -------------------------------------------------------------- */
const session = {
  hastane  : null,
  bolum    : null,
  datetime : null,
};

/* -------------------------------------------------------------- */
/* 2)  Wit.ai – doğal dil & intent                                */
/* -------------------------------------------------------------- */
export async function askWit(text) {
  const witApiVersion = '20250710';    // WIT API versioning
  const url = `https://api.wit.ai/message?v=${witApiVersion}&q=${encodeURIComponent(text)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${WIT_TOKEN}` },
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Wit.ai Hatası: ${res.status} ${res.statusText} – ${detail}`);
  }
  return res.json();
}

/* -------------------------------------------------------------- */
/* 3)  Gemini – fallback LLM                                      */
/* -------------------------------------------------------------- */
export async function askGemini(text, context = '') {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{
      parts: [{ text: context ? `${context}\n${text}` : text }],
    }],
  };

  const res = await fetch(url, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify(body),
  });

  const data = await res.json();

  if (data.error) {
    console.error('[Gemini] Ayrıntı:', data.error);
    return '🤖 Şu an yanıt veremiyorum, lütfen daha sonra tekrar deneyin.';
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text
           || '🤖 Anlayamadım, lütfen farklı ifade edin.';
}

/* -------------------------------------------------------------- */
/* 4)  Yanıt üretimi                                              */
/* -------------------------------------------------------------- */
export async function generateResponse(witData, userMessage, llmFn = null) {
  const text       = userMessage.toLowerCase();
  const intentObj  = witData.intents?.[0] || {};
  const intent     = intentObj.name;
  const confidence = intentObj.confidence || 0;
  const entities   = witData.entities || {};

  /* --- Oturum bilgisini güncelle --- */
  session.hastane  = session.hastane
    || entities['hastane:hastane']?.[0]?.value
    || entities['hastane']?.[0]?.value;

  session.bolum    = session.bolum
    || entities['bolum:bolum']?.[0]?.value
    || entities['bolum']?.[0]?.value;

  session.datetime = session.datetime
    || entities['wit$datetime:datetime']?.[0]?.value
    || entities['wit/datetime:datetime']?.[0]?.value
    || entities['wit/datetime']?.[0]?.values?.[0]?.value;

  /* --- İptal komutu --- */
  if (text.includes('iptal') || text.includes('cancel')) {
    Object.keys(session).forEach(k => session[k] = null);
    return 'Randevu işlemi iptal edildi.';
  }

  /* --- Randevu akışı --- */
  const requiresKeyword = true;
  const hasKeyword      = text.includes('randevu');

  const inFlow = (
        (requiresKeyword && hasKeyword && intent === 'randevu_al' && confidence > 0.7) ||
        (!requiresKeyword && intent === 'randevu_al' && confidence > 0.7) ||
        session.hastane || session.bolum || session.datetime
      );

  if (inFlow) {
    if (!session.hastane)   return 'Hangi hastane için randevu almak istiyorsunuz?';
    if (!session.bolum)    return 'Hangi bölüm için randevu almak istiyorsunuz?';
    if (!session.datetime) return 'Hangi tarih ve saatte randevu almak istiyorsunuz?';

    const confirm =
      `✅ Onay: ${session.hastane} / ${session.bolum} için ${session.datetime} tarihinde randevu. Onaylıyor musunuz? (evet/hayır)`;

    if (!text.includes('evet')) return confirm;

    Object.keys(session).forEach(k => session[k] = null);   // oturumu sıfırla
    return 'Randevunuz başarıyla oluşturuldu!';
  }

  /* --- LLM fallback (Gemini ya da ChatGPT) --- */
  const context =
    `Kullanıcı mesajı: "${userMessage}".` +
    (intent ? ` Wit.ai intent: "${intent}" (conf=${confidence.toFixed(2)}).` : '') +
    ' Doğal, sohbet tarzı yanıt ver.';

  const callLLM = llmFn || askGemini;
  return await callLLM(userMessage, context);
}