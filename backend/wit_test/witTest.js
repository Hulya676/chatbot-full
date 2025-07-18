// backend/wit_test/witTest.js
// witTest.js – Wit.ai kısımları yorum satırı yapıldı, Gemini aktif
import fetch from 'node-fetch';
// import 'dotenv/config.js'; // Bu satırı server.js'de yüklendiği için burada yorum satırı bırakmaya devam edin

// const WIT_TOKEN      = process.env.WIT_TOKEN; // Wit.ai token'ını yorum satırı yapın
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) { // Sadece Gemini token kontrolü kalsın
  throw new Error('GEMINI_API_KEY tanımlı değil (.env)!');
}

/* -------------------------------------------------------------- */
/* 1) Oturum nesnesi (Randevu akışı için hala gerekli)            */
/* -------------------------------------------------------------- */
const session = {
  hastane  : null,
  bolum    : null,
  datetime : null,
};

/* -------------------------------------------------------------- */
/* 2) Wit.ai – doğal dil & intent (TAMAMEN YORUM SATIRI YAPILDI) */
/* -------------------------------------------------------------- */
// export async function askWit(text) {
//   const witApiVersion = '20250710';    // WIT API versioning
//   const url = `https://api.wit.ai/message?v=${witApiVersion}&q=${encodeURIComponent(text)}`;

//   const res = await fetch(url, {
//   headers: { Authorization: `Bearer ${WIT_TOKEN}` },
//   });

//   if (!res.ok) {
//     const detail = await res.text();
//     throw new Error(`Wit.ai Hatası: ${res.status} ${res.statusText} – ${detail}`);
//   }
//   return res.json();
// }

/* -------------------------------------------------------------- */
/* 3) Gemini – LLM için ana fonksiyon                            */
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
/* 4) Yanıt üretimi (Wit.ai bağımlılıkları kaldırıldı)            */
/* -------------------------------------------------------------- */
// generateResponse fonksiyonu burada zaten export ediliyor
export async function generateResponse(userMessage, llmFn = askGemini) { // generateResponse sadece userMessage alacak
  const text = userMessage.toLowerCase();

  // Basit iptal komutu hala çalışsın
  if (text.includes('iptal') || text.includes('cancel')) {
    Object.keys(session).forEach(k => session[k] = null);
    return 'Randevu işlemi iptal edildi.';
  }

  // Gemini'ye göndereceğimiz bağlamı oluşturalım
  // Randevu akışını Gemini'nin anlamasına ve yönetmesine güveniyoruz
  const context = `Bir hastane randevu asistanısın. Kullanıcıdan hastane, bölüm ve tarih/saat bilgilerini alarak randevu oluşturma sürecini yönet. Bilgiler eksikse sor. Kullanıcı "randevu" kelimesiyle başlayan bir istekte bulunduğunda veya randevu akışı içindeysek ilgili bilgileri almaya çalış. Gerekirse bu bilgileri oturum değişkenlerinden (hastane, bolum, datetime) çek. Eksik bilgi varsa kullanıcıya sor.
  Mevcut oturum bilgileri: Hastane: ${session.hastane || 'bilinmiyor'}, Bölüm: ${session.bolum || 'bilinmiyor'}, Tarih/Saat: ${session.datetime || 'bilinmiyor'}.
  Sadece randevu ile ilgili konularda yardımcı ol. Diğer soruları nazikçe reddet.`;

  // Randevu akışı kontrolü (Gemini'nin yorumlamasına dayalı)
  if (text.includes('randevu') || session.hastane || session.bolum || session.datetime) {
      // Bu kısımda Gemini'nin eksik bilgileri istemesini bekliyoruz.
      // Basit bir örnek olarak, kullanıcıya bilgi sormasını Gemini'ye bırakıyoruz.
      // Daha gelişmiş bir akış için Gemini'den belirli anahtar kelimeleri veya yapıları döndürmesini isteyebiliriz.

      // Doğrudan Gemini'ye soruyu yönlendirelim ve randevu bilgilerini doldurmasını isteyelim
      const geminiResponse = await llmFn(userMessage, context);

      // Gemini'nin yanıtını işleyerek session'ı güncellemeye çalışın
      // Bu kısım Gemini'nin nasıl bir formatta yanıt verdiğine bağlı olarak ayarlanmalı
      // Şimdilik, basit bir örnek:
      // Gemini'nin yanıtında "hastane: X", "bölüm: Y", "tarih: Z" gibi ifadeler varsa bunları yakalamaya çalışalım.
      const hastaneMatch = geminiResponse.match(/hastane:\s*([A-Za-zÇçĞğİıÖöŞşÜü\s]+)/i);
      const bolumMatch = geminiResponse.match(/bölüm:\s*([A-Za-zÇçĞğİıÖöŞşÜü\s]+)/i);
      const datetimeMatch = geminiResponse.match(/(tarih|saat):\s*([0-9\/\.:\s]+)/i);

      if (hastaneMatch) session.hastane = hastaneMatch[1].trim();
      if (bolumMatch) session.bolum = bolumMatch[1].trim();
      if (datetimeMatch) session.datetime = datetimeMatch[2].trim();

      if (session.hastane && session.bolum && session.datetime) {
          const confirmMessage = `✅ Onay: ${session.hastane} / ${session.bolum} için ${session.datetime} tarihinde randevu. Onaylıyor musunuz? (evet/hayır)`;
          if (!text.includes('evet') && !text.includes('onaylıyorum')) { // Onay kelimeleri
              return confirmMessage;
          } else {
              Object.keys(session).forEach(k => session[k] = null); // Oturumu sıfırla
              return 'Randevunuz başarıyla oluşturuldu!';
          }
      } else {
          // Henüz tüm bilgiler tamamlanmadıysa Gemini'nin verdiği yanıtı döndür
          return geminiResponse;
      }
  }

  // Randevu akışı yoksa, doğrudan Gemini'ye soruyu ilet
  return await llmFn(userMessage, context);
}

// Session bilgilerini dışarıya açabiliriz, ileride resetlemek veya kontrol etmek için faydalı olabilir.
export function resetSession() {
    Object.keys(session).forEach(k => session[k] = null);
}

// Artık burada hiçbir şey export etmiyoruz, çünkü fonksiyonlar tanımlandıkları yerde zaten export ediliyorlar.
// export { askGemini }; // Bu satır kaldırıldı!