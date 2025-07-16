import React, { useState } from "react";
import { createComponentResponse } from "../utils/Messages";
import RandevuSonuc from "./RandevuSonuc";
import { useSendMessageMutation } from "../api/api";

function RandevuAl({ onResult, onRemoveFormMessage, setMessages, id }) {
    const hospitals = ["Devlet Hastanesi", "Şehir Hastanesi", "Özel Hastane", "Ankara Şehir Hastanesi"];
    const doctors = ["Dr. Ali Yılmaz", "Dr. Ayşe Demir", "Dr. Mehmet Kaya"];
    const departments = ["Kardiyoloji", "Dahiliye", "Ortopedi"];

    const [selectedHospital, setSelectedHospital] = useState("");
    const [selectedDoctor, setSelectedDoctor] = useState("");
    const [selectedDepartment, setSelectedDepartment] = useState("");
    const [selectedDate, setSelectedDate] = useState("");

    const [currentStep, setCurrentStep] = useState(1);
    const [sendMessage] = useSendMessageMutation();

    const today = new Date();
    const formatDate = (date) => date.toISOString().split("T")[0];

    
    const handleConfirm = () => {

        // Önce form mesajını kaldır
        if (onRemoveFormMessage && setMessages && id) {
            onRemoveFormMessage(setMessages, id);
        }

        // Sonra randevu sonuç mesajını ekle
        const sonucComponent = (
            <RandevuSonuc
                id={Date.now()}
                hospital={selectedHospital}
                doctor={selectedDoctor}
                department={selectedDepartment}
                date={selectedDate}
                onRemoveMessage={(id) => onResult({ type: "remove", id })}
            />
        );

        onResult(createComponentResponse(sonucComponent, Date.now()));

        setSelectedHospital("");
        setSelectedDoctor("");
        setSelectedDepartment("");
        setSelectedDate("");
        setCurrentStep(1);
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
                        className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                    <button
                        className="w-full mt-5 bg-[#303030] hover:bg-[#414141] text-white py-2 px-4 rounded-2xl cursor-pointer"
                        onClick={async () => {
                            if (!selectedDate) return;
                             const response = await sendMessage([{ role: "assistant", content: `Tarih: ${selectedDate}` }]).unwrap();
                            console.log("✅ API cevabı:", response);
                            handleConfirm();
                        }}
                    >
                        Devam Et
                    </button>
                </div>
            )}
        </div>
    );
}

export default RandevuAl;
