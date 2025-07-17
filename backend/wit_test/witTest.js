// backend/wit_test/witTest.js
// ---------------------------------------------------------------
//  Hastane randevu asistanı – akış sırası: Hastane → Bölüm → Doktor → Tarih/Saat
//  LLM: Google Gemini (2.5 flash)
// ---------------------------------------------------------------

import fetch from 'node-fetch';

/* ------------------------------------------------------------------ */
/* 0) Ortam değişkeni kontrolü                                         */
/* ------------------------------------------------------------------ */
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY tanımlı değil (.env)!');

/* ------------------------------------------------------------------ */
/* 1) Oturum durumu                                                    */
/* ------------------------------------------------------------------ */
const session = {
  hastane  : null,
  bolum    : null,
  doktor   : null,
  datetime : null,
  state    : 'initial',   // 'initial' | 'in_progress' | 'await_confirm'
};

/* ------------------------------------------------------------------ */
/* 2) Yardımcı: Geçerli bilgi mi?                                      */
/* ------------------------------------------------------------------ */
function isValid(value) {
  if (!value) return false;                    // null, undefined, "", 0
  const v = value.trim().toLowerCase();
  return !['bilinmiyor', '-', 'yok', 'unknown'].includes(v);
}

/* ------------------------------------------------------------------ */
/* 3) Gemini çağrısı                                                   */
/* ------------------------------------------------------------------ */
export async function askGemini(text, context = '') {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{ parts: [{ text: context ? `${context}\n${text}` : text }] }],
  };

  const res  = await fetch(url, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify(body),
  });

  const data = await res.json();
  if (data.error) {
    console.error('[Gemini] Hata:', data.error);
    return '🤖 Şu an yanıt veremiyorum, lütfen daha sonra tekrar deneyin.';
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text
       ?? '🤖 Anlayamadım, lütfen farklı ifade edin.';
}

/* ------------------------------------------------------------------ */
/* 4) Ana yanıt üreticisi                                              */
/* ------------------------------------------------------------------ */
export async function generateResponse(userMessage, llmFn = askGemini) {
  const text = userMessage.toLowerCase().trim();
  console.log('[Session]', session);

  /* 4 A) İptal komutu ---------------------------------------------- */
  if (text.includes('iptal') || text.includes('cancel')) {
    resetSession();
    return 'Randevu işlemi iptal edildi.';
  }

  /* 4 B) Akışı başlatma (randevu kelimesi vs.) --------------------- */
  if (!text.includes('randevu') && session.state === 'initial') {
    const ctx = 'Bir hastane randevu asistanısın. Yalnızca randevu işlemleriyle ilgilen.';
    const firstReply = await llmFn(userMessage, ctx);
    if (firstReply.toLowerCase().includes('randevu')) session.state = 'in_progress';
    else return firstReply;
  } else {
    session.state = 'initial';
  }

  /* 4 C) Gemini’den yapılandırılmış yanıt talebi ------------------- */
  const currentCtx = `
Sen bir hastane randevu asistanısın. Kullanıcıdan HASTANE, BÖLÜM, DOKTOR ve TARİH_SAAT bilgilerini eksiksiz toplamalısın.
Mevcut oturum: Hastane=${session.hastane ?? 'bilinmiyor'}, Bölüm=${session.bolum ?? 'bilinmiyor'}, Doktor=${session.doktor ?? 'bilinmiyor'}, Tarih/Saat=${session.datetime ?? 'bilinmiyor'}.
Kullanıcının mesajında bu bilgilerden biri/birkaçını bulursan aşağıdaki biçimde ÇIKTI ver (sadece bulduklarını yaz):
HASTANE: [...]
BÖLÜM: [...]
DOKTOR: [...]
TARİH_SAAT: [...]
Bilgi yoksa, hangi bilginin eksik olduğunu belirtip kısa bir soru sor.
`;

  const geminiResp = await llmFn(userMessage, currentCtx);
  console.log('[Gemini]', geminiResp);

  /* 4 D) Bilgi ayıkla ---------------------------------------------- */
  const info = {};
  geminiResp.split('\n').forEach(line => {
    let m;
    if (m = line.match(/^HASTANE:\s*(.+)/i))      info.hastane  = m[1].trim();
    else if (m = line.match(/^BÖLÜM:\s*(.+)/i))   info.bolum    = m[1].trim();
    else if (m = line.match(/^DOKTOR:\s*(.+)/i))  info.doktor   = m[1].trim();
    else if (m = line.match(/^TARİH_SAAT:\s*(.+)/i)) info.datetime = m[1].trim();
  });

  /* 4 E) Oturumu güncelle (yalnızca geçerli değerler) -------------- */
  if (isValid(info.hastane)  && !isValid(session.hastane))  session.hastane  = info.hastane;
  if (isValid(info.bolum)    && !isValid(session.bolum))    session.bolum    = info.bolum;
  if (isValid(info.doktor)   && !isValid(session.doktor))   session.doktor   = info.doktor;
  if (isValid(info.datetime) && !isValid(session.datetime)) session.datetime = info.datetime;

  /* 4 F) Sıralı sorular ------------------------------------------- */
  if (session.state === 'in_progress') {
    if (!isValid(session.hastane))
      return 'Hangi hastaneden randevu almak istersiniz?';
    if (!isValid(session.bolum))
      return `Hangi bölümden randevu almak istersiniz? (Hastane: ${session.hastane})`;
    if (!isValid(session.doktor))
      return `Hangi doktordan randevu almak istersiniz? (Hastane: ${session.hastane}, Bölüm: ${session.bolum})`;
    if (!isValid(session.datetime))
      return `Hangi tarih ve saatte randevu almak istersiniz? (Hastane: ${session.hastane}, Bölüm: ${session.bolum}, Doktor: ${session.doktor})`;
  }

  /* 4 G) Onay aşaması --------------------------------------------- */
  if (session.state === 'in_progress' &&
      isValid(session.hastane) && isValid(session.bolum) &&
      isValid(session.doktor) && isValid(session.datetime)) {

    session.state = 'await_confirm';
    return `✅ Onay: ${session.hastane} / ${session.bolum} / Dr. ${session.doktor} – ${session.datetime}. Onaylıyor musunuz? (evet/hayır)`;
  }

  if (session.state === 'await_confirm') {
    if (text.includes('evet')) {
      resetSession();
      return 'Randevunuz başarıyla oluşturuldu!';
    }
    if (text.includes('hayır')) {
      resetSession();
      return 'Randevu işlemi iptal edildi. Yeni bir randevu oluşturmak ister misiniz?';
    }
    return `Randevu bilgileri: ${session.hastane} / ${session.bolum} / Dr. ${session.doktor} – ${session.datetime}. Onaylıyor musunuz? (evet/hayır)`;
  }

  /* 4 H) Beklenmedik durum – Gemini çıktısını ilet ---------------- */
  return geminiResp;
}

/* ------------------------------------------------------------------ */
/* 5) Oturumu sıfırlama                                                */
/* ------------------------------------------------------------------ */
export function resetSession() {
  Object.keys(session).forEach(k => session[k] = null);
  session.state = 'initial';
}


