// RandevuAl
import React, { useState } from "react";
import { createComponentResponse } from "../utils/Messages";
import { useSendMessageMutation } from "../api/api";
import {
  removeRandevuFormMessage,
  removeRandevuSonucMessage,
  updateRandevuSonucMessage,
  confirmRandevuSonucMessage
} from '../utils/ButtonFunctions';
import { store } from '../store/store'; // Redux store'a erişim için
import { setMessages } from '../store/ChatSlice'; // setMessages import edildi

function RandevuAl({ id }) {
    const hospitals = ["Devlet Hastanesi", "Şehir Hastanesi", "Özel Hastane", "Ankara Şehir Hastanesi"];
    const doctors = ["Dr. Ali Yılmaz", "Dr. Ayşe Demir", "Dr. Mehmet Kaya"];
    const departments = ["Kardiyoloji", "Dahiliye", "Ortopedi"];

    const [selectedHospital, setSelectedHospital] = useState("");
    const [selectedDoctor, setSelectedDoctor] = useState("");
    const [selectedDepartment, setSelectedDepartment] = useState("");
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedTime, setSelectedTime] = useState(""); // Saat için state

    const [currentStep, setCurrentStep] = useState(1);
    const [sendMessage] = useSendMessageMutation();
    const [showResult, setShowResult] = useState(false);

    const today = new Date();
    const formatDate = (date) => date.toISOString().split("T")[0];

    // Saat seçeneklerini 15 dakikalık aralıklarla ve mesai saatleri içinde oluşturan fonksiyon
    const generateTimeOptions = () => {
        const times = [];
        const startHour = 9;  // Mesai başlangıç saati
        const endHour = 17;   // Mesai bitiş saati (bu saate kadar dahil)

        for (let hour = startHour; hour < endHour; hour++) { // 9'dan başla, 17'den küçük olana kadar (yani 16'ya kadar)
            for (let minute = 0; minute < 60; minute += 15) {
                const hourStr = hour.toString().padStart(2, '0');
                const minuteStr = minute.toString().padStart(2, '0');
                times.push(`${hourStr}:${minuteStr}`);
            }
        }
        return times;
    };

    const timeOptions = generateTimeOptions();

    const handleConfirm = () => {
        // Form mesajını kaldır (id'si ile)
        removeRandevuFormMessage(id); // RandevuAl bileşeninin kendi id'si

        // Tarih ve saati birleştirerek tam bir tarih/saat stringi oluştur
        const fullDateTime = selectedDate && selectedTime ? `${selectedDate} ${selectedTime}` : selectedDate;

        // Randevu sonucunu bir mesaj olarak Redux store'a ekle
        const newRandevuSonucMessage = createComponentResponse(
            "RandevuSonuc",
            {
                hospital: selectedHospital,
                doctor: selectedDoctor,
                department: selectedDepartment,
                date: fullDateTime, // Güncellendi: fullDateTime kullanıldı
            },
            Date.now() // Yeni bir id ile RandevuSonuc mesajı oluştur
        );

        // Mevcut mesajlara yeni RandevuSonuc mesajını ekle
        const state = store.getState();
        store.dispatch(setMessages([...state.chat.messages, newRandevuSonucMessage]));

        setShowResult(true);
        setCurrentStep(5); // Randevu sonucu gösterildiğinde adımı 5'e ayarla

        // Alanları temizle
        setSelectedHospital("");
        setSelectedDoctor("");
        setSelectedDepartment("");
        setSelectedDate("");
        setSelectedTime(""); // Temizle: Saat alanı
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-xl space-y-4">
            <h2 className="text-2xl font-semibold text-center text-gray-800">Randevu Oluştur</h2>

            {currentStep === 1 && (
                <div>
                    <label className="block mb-1">Hastane</label>
                    <select className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value={selectedHospital} onChange={(e) => setSelectedHospital(e.target.value)}>
                        <option value="">Seçiniz</option>
                        {hospitals.map((item, i) => (
                            <option key={i} value={item}>{item}</option>
                        ))}
                    </select>
                    <button
                        className="w-full mt-5 bg-[#303030] hover:bg-[#414141] text-white py-2 px-4 rounded-2xl cursor-pointer"
                        onClick={async () => {
                            if (!selectedHospital) return;
                            const response = await sendMessage([{ role: "assistant", content: `Hastane: ${selectedHospital}` }]).unwrap();
                            console.log("✅ API cevabı:", response);
                            setCurrentStep(2);
                        }}
                    >
                        Devam Et
                    </button>
                </div>
            )}


            {currentStep === 2 && (
                <div>
                    <label className="block mb-1">Bölüm</label>
                    <select className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}>
                        <option value="">Seçiniz</option>
                        {departments.map((item, i) => (
                            <option key={i} value={item}>{item}</option>
                        ))}
                    </select>
                    <button
                        className="w-full mt-5 bg-[#303030] hover:bg-[#414141] text-white py-2 px-4 rounded-2xl cursor-pointer"
                        onClick={async () => {
                            if (!selectedDepartment) return;
                            const response = await sendMessage([{ role: "assistant", content: `Bölüm: ${selectedDepartment}` }]).unwrap();
                            console.log("✅ API cevabı:", response);
                            setCurrentStep(3);
                        }}
                    >
                        Devam Et
                    </button>
                </div>
            )}

            {currentStep === 3 && (
                <div>
                    <label className="block mb-1">Doktor</label>
                    <select className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)}>
                        <option value="">Seçiniz</option>
                        {doctors.map((item, i) => (
                            <option key={i} value={item}>{item}</option>
                        ))}
                    </select>
                    <button
                        className="w-full mt-5 bg-[#303030] hover:bg-[#414141] text-white py-2 px-4 rounded-2xl cursor-pointer"
                        onClick={async () => {
                            if (!selectedDoctor) return;
                            const response = await sendMessage([{ role: "assistant", content: `Doktor: ${selectedDoctor}` }]).unwrap();
                            console.log("✅ API cevabı:", response);
                            setCurrentStep(4);
                        }}
                    >
                        Devam Et
                    </button>
                </div>
            )}


            {currentStep === 4 && (
                <div>
                    <label className="block mb-1">Tarih</label>
                    <input
                        type="date"
                        value={selectedDate}
                        min={formatDate(today)}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
                    />
                    <label className="block mb-1">Saat</label>
                    <select
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                    >
                        <option value="">Seçiniz</option>
                        {timeOptions.map((time, i) => (
                            <option key={i} value={time}>{time}</option>
                        ))}
                    </select>
                    <button
                        className="w-full mt-5 bg-[#303030] hover:bg-[#414141] text-white py-2 px-4 rounded-2xl cursor-pointer"
                        onClick={async () => {
                            if (!selectedDate || !selectedTime) return;
                            const response = await sendMessage([{ role: "assistant", content: `Tarih: ${selectedDate} Saat: ${selectedTime}` }]).unwrap();
                            console.log("✅ API cevabı:", response);
                            handleConfirm();
                        }}
                    >
                        Randevuyu Oluştur
                    </button>
                </div>
            )}
        </div>
    );
}

export default RandevuAl;