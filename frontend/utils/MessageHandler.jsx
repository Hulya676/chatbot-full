//dispatch: Redux store'a action göndermek için kullanılır.
//setMessages, setLoading: Redux slice'tan import edilen action'lardır.
//handleExampleClick: Örnek butona tıklanınca mesajı Redux state'ine ekler.
//handleSendMessage: Kullanıcı mesajını ve ardından asistan cevabını Redux state'ine ekler.
//handleMessageUpdate: Mesajları günceller (örneğin bir mesaj silindiğinde veya değiştirildiğinde).
//action, Redux'a "şu işlemi yap" diyen bir nesnedir.
import { createUserMessage, createTextResponse } from './Messages';
import { createComponentByType, getComponentTypeFromContent } from './ComponentMapper';
import { setMessages, setLoading, addMessage } from '../store/ChatSlice';

//this = MessageHandler nesnesinin kendisi ve constructor'da atanan React state fonksiyonlarına erişim sağlar.
//await kod gerçekleşene kadarbekler.

//MessageHandler sınıfı, tüm mesaj işleme mantığını bir araya getiren bir yöneticidir (controller). Özellikle mesaj gönderme, örnek mesaj tıklama, AI'den yanıt alma gibi işlevleri tek bir merkezden kontrol etmek için kullanılır.
// MessageHandler.js
//Bu action’ı örn: addMessage dispatch ile Redux store’a gönderir.Redux, ilgili reducer’ı çalıştırır ve state’i günceller.Uygulamanın ilgili yerleri otomatik olarak güncellenir.
export class MessageHandler {
  constructor(dispatch, handleMessageUpdate) {
    this.dispatch = dispatch;
    this.handleMessageUpdate = handleMessageUpdate;
  }

  async handleExampleClick(content, setShowButtons, messages) {
    setShowButtons(false);
    await this.processMessage(content,messages);
  }

  async handleSendMessage(input, clearInput, messages) {
    if (!input.trim()) return;
    const userMessage = createUserMessage(input);
    this.dispatch(addMessage(userMessage));
    clearInput('');
    this.dispatch(setLoading(true));
    await this.processMessage(input, [...messages, userMessage], userMessage);
  }
//Eğer içerik özel bir bileşen gerektiriyorsa (ör: "randevu al", "sonuç görüntüle" gibi), ilgili React componentini oluşturur ve mesaj listesine ekler.
//Eğer özel bir bileşen gerekmiyorsa, AI'den cevap almak için API'ye istek atar ve gelen cevabı mesaj olarak ekler.
//Her durumda, yükleniyor (loading) durumunu yönetir.
async processMessage(content, messages = [], userMessage = null) {
    const componentType = getComponentTypeFromContent(content);

    if (componentType) {
      const result = createComponentByType(componentType, {
        dispatch: this.dispatch,
        onResult: this.handleMessageUpdate,
      });
      if (result) {
        this.dispatch(addMessage(result.component));
        this.dispatch(setLoading(false));
        return;
      }
    }

    if (userMessage) {
      try {
        const aiReply = await sendAIMessage(messages);
        const assistantMessage = createTextResponse(aiReply);
        this.dispatch(addMessage(assistantMessage));
      } catch (error) {
        console.error('AI mesajı gönderilirken hata:', error);
        const errorMessage = createTextResponse("Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.");
        this.dispatch(addMessage(errorMessage));
      }
    }

    this.dispatch(setLoading(false));
  }
}
