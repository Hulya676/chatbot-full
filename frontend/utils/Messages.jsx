//Kullanıcı mesajı, asistan mesajı veya component mesajı oluşturmak için yardımcı fonksiyonlar içerir.Her mesajın rolünü, içeriğini ve zaman bilgisini ayarlar.
import React from "react";
import RandevuSonuc from "../components/RandevuSonuc";

export const createUserMessage = (content) => ({
  role: "user",
  content,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),//yerel saati bir stringe çevirir
});

export const createTextResponse = (content) => ({
  role: "assistant",
  content,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
});

export const createComponentResponse = (component, id = Date.now()) => ({
  role: "assistant",
  component,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  id,
});

export const createRandevuCardMessage = ({ hospital, doctor, department, date }) =>
  createComponentResponse(
    <RandevuSonuc hospital={hospital} doctor={doctor} department={department} date={date} />
  );
