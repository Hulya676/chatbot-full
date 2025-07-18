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
export const updateRandevuSonucMessage = () => {
  const state = store.getState();

  // Son randevuyu bul (tipi RandevuAl veya RandevuSonuc olan)
  const lastRandevu = [...state.chat.messages]
    .reverse()
    .find(msg => msg.componentType === "RandevuAl" || msg.componentType === "RandevuSonuc");

  if (!lastRandevu || !lastRandevu.componentProps?.id) {
    console.warn("Güncellenecek randevu bulunamadı.");
    return;
  }

  const targetId = lastRandevu.componentProps.id;

  // Mesajı güncelle
  const updatedMessages = state.chat.messages.map(msg =>
    msg.componentProps?.id === targetId
      ? {
          ...msg,
          componentType: "RandevuSonuc",
          componentProps: {
            ...msg.componentProps,
            hideButtons: true // örnek ekstra prop
          },
          content: null
        }
      : msg
  );

  // Yeni form mesajı
  const newFormMessage = {
    componentType: "RandevuAl",
    componentProps: {
      id: Date.now()
    }
  };

  store.dispatch(setMessages([...updatedMessages, newFormMessage]));
};



// Randevuyu onayla ve bileşeni tekrar ama props olarak kaydet
// Randevuyu onayla ve bileşeni tekrar ama props olarak kaydet
export const confirmRandevuSonucMessage = () => {
  const state = store.getState();

  // Son randevuya ait bilgileri bul (örnek: en son RandevuAl veya RandevuSonuc componentType'lı mesaj)
const lastRandevuWithIndex = [...state.chat.messages]
  .map((msg, idx) => ({ msg, idx }))
  .reverse()
  .find(obj => obj.msg.componentType === "RandevuAl" || obj.msg.componentType === "RandevuSonuc");

if (!lastRandevuWithIndex) {
  const newMessage = {
    role: "assistant",
    content: "Randevu Onaylandı!",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
  store.dispatch(setMessages([...state.chat.messages, newMessage]));
  return;
}

const filteredMessages = state.chat.messages.filter((_, idx) => idx !== lastRandevuWithIndex.idx);

const randevuCard = createComponentResponse(
  "RandevuSonuc",
  {
    hospital: lastRandevuWithIndex.msg.componentProps?.hospital || "",
    doctor: lastRandevuWithIndex.msg.componentProps?.doctor || "",
    department: lastRandevuWithIndex.msg.componentProps?.department || "",
    date: lastRandevuWithIndex.msg.componentProps?.date || "",
    hideButtons: true
  }
);

store.dispatch(setMessages([
  ...filteredMessages,
  {
    role: "assistant",
    content: "Randevu Onaylandı!",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
  randevuCard
]));
};