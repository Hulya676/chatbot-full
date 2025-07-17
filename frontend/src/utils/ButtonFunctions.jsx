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
export const removeRandevuSonucMessage = (id) => {
  const state = store.getState();
  const updated = state.chat.messages.map(msg =>
    msg.id === id
      ? { ...msg, componentType: null, componentProps: null, content: "Randevu İptal Edildi!" }
      : msg
  );
  store.dispatch(setMessages(updated));
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
export const confirmRandevuSonucMessage = async (id) => {
  const state = store.getState();
  const updated = state.chat.messages.map(msg =>
    msg.id === id
      ? {
          ...msg,
          componentType: "RandevuSonuc",
          componentProps: {
            id: id,
            hospital: msg.hospital,
            doctor: msg.doctor,
            department: msg.department,
            date: msg.date,
            hideButtons: true
          },
          content: "",
        }
      : msg
  );

  store.dispatch(setMessages(updated));
  await sendActionToAPI("Randevu Onayla");
};
