// Component işlemleri (güncelle, onayla, sil) + API ile iletişim içerir
import { store } from '../store/store';
import { setMessages } from '../store/ChatSlice';
import { createComponentResponse } from './Messages';
import { localApi } from '../api/api';

// API'ye bir metin gönder
export const sendActionToAPI = async (actionText) => {
  try {
    console.log("🟡 API'ye gönderiliyor:", actionText);
    const result = await store.dispatch(
      localApi.endpoints.sendMessage.initiate([
        { role: "user", content: actionText }
      ])
    ).unwrap();
    console.log("🟢 API'den gelen cevap:", result);
    return result;
  } catch (e) {
    console.error("API hatası:", e);
  }
};

// Randevu formu mesajını sil ve metinle değiştir
export const removeRandevuFormMessage = (id) => {
  const state = store.getState();
  const updated = state.chat.messages.map(msg =>
    msg.id === id
      ? { ...msg, componentType: null, componentProps: null, content: "Randevu Oluşturuldu!" }
      : msg
  );
  store.dispatch(setMessages(updated));
};

// Randevu sonucunu iptal et ve metinle değiştir
export const removeRandevuSonucMessage = () => {
  const state = store.getState();
  const newMessage = {
    role: "assistant",
    content: "Randevu İptal Edildi!",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
  store.dispatch(setMessages([...state.chat.messages, newMessage]));
};

// Randevuyu güncelle ve yeni bir RandevuAl formu ekle
export const updateRandevuSonucMessage = (id) => {
  const state = store.getState();
  const updatedMessages = state.chat.messages.map(msg =>
    msg.id === id
      ? {
          ...msg,
          componentType: "RandevuSonuc", // ✅ doğru component adı
          componentProps: { ...msg.componentProps }, // mevcut props korunur
          content: null // bileşen gösterileceği için metin olmayabilir
        }
      : msg
  );
    const newFormMessage = {
    componentType: "RandevuAl",
    componentProps: {
      id: Date.now()
      // Gerekirse başka veri ekle
    }
  };
  store.dispatch(setMessages([...updatedMessages, newFormMessage]));
};

// Randevuyu onayla ve bileşeni tekrar ama props olarak kaydet
export const confirmRandevuSonucMessage = () => {
  const state = store.getState();

  // Son randevuya ait bilgileri bul (örnek: en son RandevuAl veya RandevuSonuc componentType'lı mesaj)
  const lastRandevu = [...state.chat.messages]
    .reverse()
    .find(msg => msg.componentType === "RandevuAl" || msg.componentType === "RandevuSonuc");

  // Eğer randevu bilgisi yoksa, sadece onay mesajı ekle
  if (!lastRandevu) {
    const newMessage = {
      role: "assistant",
      content: "Randevu Onaylandı!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    store.dispatch(setMessages([...state.chat.messages, newMessage]));
    return;
  }
 // Onay bekleyen kartı mesaj listesinden çıkar
  const filteredMessages = state.chat.messages.filter((_, idx) => idx !== lastRandevuIndex.idx);
  // Randevu kartı mesajı oluştur
  const randevuCard = createComponentResponse(
    "RandevuSonuc",
    {
      hospital: lastRandevu.componentProps?.hospital || "",
      doctor: lastRandevu.componentProps?.doctor || "",
      department: lastRandevu.componentProps?.department || "",
      date: lastRandevu.componentProps?.date || "",
       hideButtons: true //butonlar onaylandıktan sonra gözükmez
    }
  );

  // Randevu onaylandı mesajı ve kartı ekle
  store.dispatch(setMessages([
    ...state.chat.messages,
    {
      role: "assistant",
      content: "Randevu Onaylandı!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
    randevuCard
  ]));
};
