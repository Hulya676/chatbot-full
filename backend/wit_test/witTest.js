// backend/wit_test/witTest.js
// ---------------------------------------------------------------
//  Hastane randevu asistanı – akış sırası: Hastane → Bölüm → Doktor → Tarih/Saat
//  LLM: Google Gemini (2.5-flash)
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
  if (!value) return false;
  const v = String(value).trim().toLowerCase(); // String() ile değeri stringe çevir
  return !['bilinmiyor', '-', 'yok', 'unknown'].includes(v) && v !== '';
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
  console.log('[Session Current State]', session); // Her isteğin başında oturum durumunu göster

  /* 4-A) İptal komutu ---------------------------------------------- */
  if (text.includes('iptal') || text.includes('cancel')) {
    resetSession();
    return 'Randevu işlemi iptal edildi. Yeni bir randevu oluşturmak isterseniz "randevu al" gibi bir ifade kullanabilirsiniz.';
  }

  /* 4-B) Onay aşaması yönetimi (öncelikli) ------------------------- */
  if (session.state === 'await_confirm') {
    if (text.includes('evet') || text.includes('e')) {
      resetSession(); // Randevu onaylandı, oturumu sıfırla
      // Randevu oluşturulduktan sonra Gemini'ye sorma kısmı
      const geminiFinalQuestion = await llmFn("Randevu başarıyla oluşturuldu. Başka bir işlem yapmak ister misiniz?", "Randevu asistanısın. Randevu oluşturulduktan sonra kullanıcıya başka bir işlem yapmak isteyip istemediğini sor.");
      return 'Randevunuz başarıyla oluşturuldu! ' + geminiFinalQuestion;
    }
    if (text.includes('hayır') || text.includes('h')) {
      resetSession(); // Randevu iptal edildi, oturumu sıfırla
      // Randevu iptal edildikten sonra Gemini'ye sorma kısmı
      const geminiCancelQuestion = await llmFn("Randevu işlemi iptal edildi. Başka bir randevu oluşturmak ister misiniz?", "Randevu asistanısın. Randevu iptal edildikten sonra kullanıcıya başka bir randevu oluşturmak isteyip istemediğini sor.");
      return 'Randevu işlemi iptal edildi. ' + geminiCancelQuestion;
    }
    // Eğer onay aşamasındaysa ama "evet" veya "hayır" demediyse, tekrar sor
    return `Randevu bilgileri: ${session.hastane} / ${session.bolum} / Dr. ${session.doktor} – ${session.datetime}. Onaylıyor musunuz? (evet/hayır)`;
  }

  /* 4-C) Genel Sohbet veya Akışı Başlatma -------------------------- */
  // Eğer henüz randevu akışı başlamadıysa ve kullanıcı 'randevu' kelimesini içermiyorsa,
  // bu bir genel sohbet isteğidir. Bu durumda sadece Gemini'ye sor ve onun yanıtını döndür.
  if (!text.includes('randevu') && session.state === 'initial') {
    const generalChatReply = await llmFn(userMessage, "Sen bir genel sohbet asistanısın. Sadece randevu oluşturma akışı dışında kalan genel sorulara cevap ver. Randevu ile ilgili bir soru gelirse, kullanıcıyı 'randevu al' gibi bir ifade kullanmaya teşvik et.");
    return generalChatReply;
  }
  // Kullanıcı "randevu" ile başladıysa veya akış zaten başladıysa, akışı başlat
  if (text.includes('randevu') && session.state === 'initial') {
    session.state = 'in_progress';
    return 'Randevu almak istediğinizi anladım. Hangi hastaneden randevu almak istersiniz?';
  }

  // Eğer akış in_progress ise, bilgi toplamaya devam et
  session.state = 'in_progress';

  /* 4-D) Gemini'den yapılandırılmış yanıt talebi (sadece bilgi ayıklamak için) */
  // Gemini'yi bu aşamada sadece bilgi ayıklaması için kullanıyoruz.
  const infoExtractionContext = `
Sen bir metin analizcisin. Kullanıcının son mesajında HASTANE, BÖLÜM, DOKTOR veya TARİH_SAAT bilgisi geçiyorsa, sadece bu bilgileri aşağıdaki **yapılandırılmış formatta** döndür. Bulamadığın veya belirtilmeyen bilgiyi döndürme. Ek açıklama yapma, sadece formatı kullan.
HASTANE: [Hastane Adı]
BÖLÜM: [Bölüm Adı]
DOKTOR: [Doktor Adı]
TARİH_SAAT: [Tarih Saat Bilgisi (örn: YYYY-MM-DD HH:mm)]
Kullanıcı mesajı: "${userMessage}"
`;

  const geminiResp = await llmFn(userMessage, infoExtractionContext);
  console.log('[Gemini Extraction Response]', geminiResp); // Gemini'nin ham ayıklama yanıtını gör

  /* 4-E) Bilgi ayıkla ---------------------------------------------- */
  const extractedInfo = {};
  geminiResp.split('\n').forEach(line => {
    let m;
    if (m = line.match(/^HASTANE:\s*(.+)/i))     extractedInfo.hastane   = m[1].trim();
    else if (m = line.match(/^BÖLÜM:\s*(.+)/i))  extractedInfo.bolum     = m[1].trim();
    else if (m = line.match(/^DOKTOR:\s*(.+)/i)) extractedInfo.doktor    = m[1].trim();
    else if (m = line.match(/^TARİH_SAAT:\s*(.+)/i)) extractedInfo.datetime  = m[1].trim();
  });

  /* 4-F) Oturumu güncelle (yalnızca geçerli ve henüz boş olan değerler) */
  if (isValid(extractedInfo.hastane) && !isValid(session.hastane)) {
    session.hastane = extractedInfo.hastane;
    console.log(`[Session Updated] Hastane: ${session.hastane}`);
  }
  if (isValid(extractedInfo.bolum) && !isValid(session.bolum)) {
    session.bolum = extractedInfo.bolum;
    console.log(`[Session Updated] Bölüm: ${session.bolum}`);
  }
  if (isValid(extractedInfo.doktor) && !isValid(session.doktor)) {
    session.doktor = extractedInfo.doktor;
    console.log(`[Session Updated] Doktor: ${session.doktor}`);
  }
  if (isValid(extractedInfo.datetime) && !isValid(session.datetime)) {
    session.datetime = extractedInfo.datetime;
    console.log(`[Session Updated] Tarih/Saat: ${session.datetime}`);
  }

  /* 4-G) Sıralı sorular (bu kısım sadece kod tarafından yönetilir) ---- */
  // Tüm bilgiler toplanana kadar veya onay beklenene kadar bu sırayı takip et.
  if (session.state === 'in_progress') {
    if (!isValid(session.hastane)) {
      return 'Hangi hastaneden randevu almak istersiniz?';
    }
    if (!isValid(session.bolum)) {
      return `Hangi bölümden randevu almak istersiniz? (Hastane: ${session.hastane})`;
    }
    if (!isValid(session.doktor)) {
      // Burada doktor listeleme ve veritabanı sorgusu eklenecek
      return `Hangi doktordan randevu almak istersiniz? (Hastane: ${session.hastane}, Bölüm: ${session.bolum})`;
    }
    if (!isValid(session.datetime)) {
      // Burada doktorun uygun saatlerini listeleme ve veritabanı sorgusu eklenecek
      return `Hangi tarih ve saatte randevu almak istersiniz? (Hastane: ${session.hastane}, Bölüm: ${session.bolum}, Doktor: ${session.doktor})`;
    }
  }

  /* 4-H) Onay aşamasına geçiş ------------------------------------- */
  // Tüm zorunlu bilgiler toplandıysa, onay aşamasına geç.
  if (session.state === 'in_progress' &&
      isValid(session.hastane) && isValid(session.bolum) &&
      isValid(session.doktor) && isValid(session.datetime)) {
    session.state = 'await_confirm';
    return `✅ Onay: ${session.hastane} / ${session.bolum} / Dr. ${session.doktor} – ${session.datetime}. Onaylıyor musunuz? (evet/hayır)`;
  }

  /* 4-I) Beklenmedik durum – Bu kısma düşmemeli (debug amaçlı) ---- */
  // Eğer buraya gelindiyse, yukarıdaki koşullardan hiçbiri eşleşmedi demektir.
  // Bu durumda Gemini'nin kendi yanıtını döndürmek yerine bir hata mesajı vermek daha iyi olabilir.
  console.warn('[Warning] generateResponse: Beklenmedik duruma düşüldü. Session:', session, 'User Message:', userMessage);
  return 'Randevu akışında bir sorun oluştu. Lütfen "iptal" yazarak yeniden deneyin.';
}

/* ------------------------------------------------------------------ */
/* 5) Oturumu sıfırlama                                                */
/* ------------------------------------------------------------------ */
export function resetSession() {
  Object.keys(session).forEach(k => session[k] = null);
  session.state = 'initial';
}

