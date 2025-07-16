import React, { useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setMessages,
  addMessage,
  setInput,
  setLoading,
  setShowButtons,
} from '../store/ChatSlice';
import {
  removeRandevuSonucMessage,
  updateRandevuSonucMessage,
  confirmRandevuSonucMessage,
} from '../utils/ButtonFunctions';
import { MessageHandler } from '../utils/MessageHandler';
import { useSendMessageMutation } from '../api/api';


const AIAsistan = () => {
  const messages = useSelector((state) => state.chat.messages);
  const input = useSelector((state) => state.chat.input);
  const loading = useSelector((state) => state.chat.loading);
  const showButtons = useSelector((state) => state.chat.showButtons);
  const dispatch = useDispatch();
  const [sendMessageApi] = useSendMessageMutation();
const messageHandler = new MessageHandler(dispatch, (msg) => dispatch(addMessage(msg)));
  const inputRef = useRef(null);

  const handleInputChange = (e) => {
    dispatch(setInput(e.target.value));
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  };
const sendMessage = () => {
  messageHandler.handleSendMessage(input, (val) => dispatch(setInput(val)), messages);
  };

const handleExampleClick = (content) => {
  messageHandler.handleExampleClick(content, (val) => dispatch(setShowButtons(val)));
};


  return (
    <div className='min-h-screen w-full bg-gradient-to-tr from-[#e0def4] via-[#a1bef1] to-[#e0def4]'>
      <div className='md:w-[700px] md:mx-auto relative'>
        <div className='bg-white h-17 rounded-b-3xl mx-auto mb-2 sticky top-0 z-50'>
          <h2 className="text-xl font-semibold text-center pt-5 text-black/80">Randevu Asistanı</h2>
          <div className="absolute top-2 right-4 ">
            <button onClick={() => window.location.reload()}>
              <img src="./Reload.svg" alt="Reload" className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mb-4 space-y-3 px-2 rounded p-2 pb-40">
          {messages.map((msg, idx) => (
            <div key={idx} className={`max-w-[90%] p-4 shadow-xl text-xl break-words relative
              ${msg.role === "user"
                ? "ml-auto bg-[#241f4e] text-white rounded-l-3xl rounded-tr-3xl"
                : "mr-auto bg-white text-black rounded-r-3xl rounded-tl-3xl"}`}>

              {msg.component
                ? React.cloneElement(msg.component, {
                    onResult: () => {},
                    onRemoveMessage: (id) => removeRandevuSonucMessage((msgs) => dispatch(setMessages(msgs)), id),
                    onUpdateMessage: (id) => updateRandevuSonucMessage((msgs) => dispatch(setMessages(msgs)), id),
                    onConfirmMessage: (id) => confirmRandevuSonucMessage((msgs) => dispatch(setMessages(msgs)), id),
                  })
                : <div className="pb-2">{msg.content}</div>}

              {msg.timestamp && (
                <div className={`text-xs absolute bottom-2 opacity-70 ${msg.role === "user" ? "text-white right-3" : "text-black left-3"}`}>
                  {msg.timestamp}
                </div>
              )}

              {idx === 0 && msg.role === "assistant" && showButtons && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {["Randevu Al", "Sonuç Görüntüle", "Hastane Bilgisi Al", "Nöbetçi Eczane", "Geçmiş Randevu Görüntüle", "Gelecek Randevu Görüntüle"].map((btn, i) => (
                    <button key={i} onClick={() => handleExampleClick(btn)} className="border-2 text-black px-4 py-1 rounded-xl hover:border-black/50 hover:text-black/50">
                      {btn}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="mr-auto bg-gray-200 text-black text-sm px-2 py-1 rounded-lg animate-pulse">
              Yazıyor...
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 w-full p-4 flex justify-center gap-2 z-10">
          <div className="relative w-full max-w-2xl">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              placeholder="Örn: Randevu al"
              rows={1}
              className="resize-none w-full min-h-24 max-h-64 top-1/2 focus:outline-none focus:ring-0 focus:border-transparent bg-[#303030] text-white text-lg rounded-4xl placeholder:text-white/70 px-4 md:py-8 py-4 pr-30 overflow-hidden"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="absolute right-10 top-1/2 -translate-y-1/2 bg-white text-black px-4 py-3 rounded-full hover:bg-white/90 disabled:opacity-50"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAsistan;
