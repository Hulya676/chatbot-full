import React, { useState, useEffect } from "react";
import { createComponentResponse } from "../utils/Messages";
import RandevuSonuc from "./RandevuSonuc";
import { useGetBranchesByHospitalIdQuery, useGetHospitalsQuery, useSendMessageMutation, useGetDoctorsByBranchIdQuery, useGetTimesByDoctorIdQuery } from "../api/api";

function RandevuAl({ onResult, onRemoveFormMessage, setMessages, id }) {
    const { data: hospitals, isLoading } = useGetHospitalsQuery();
    const [hospitalId, setHospitalId] = useState(null);
    const { data: branches } = useGetBranchesByHospitalIdQuery(hospitalId, {
        skip: !hospitalId, // hospitalId boşsa sorgu atmasın
    });

    const [selectedHospital, setSelectedHospital] = useState("");

    useEffect(() => {
        if (selectedHospital) {
            setHospitalId(selectedHospital);
        }
    }, [selectedHospital]);

    const [selectedDoctor, setSelectedDoctor] = useState("");

    const [selectedDepartment, setSelectedDepartment] = useState("");

    const [doctorId, setDoctorId] = useState(null);
    const { data: doctors, isSuccess } = useGetDoctorsByBranchIdQuery(selectedDepartment, {
        skip: !selectedDepartment,
    });

    useEffect(() => {
        if (isSuccess && doctors) {
            console.log("✅ Doktorlar geldi:", doctors);
        }
    }, [isSuccess, doctors]);


    useEffect(() => {
        if (selectedDoctor) {
            setDoctorId(selectedDoctor);
        }
    }, [selectedDoctor]);

    const [selectedDate, setSelectedDate] = useState("");
    const [selectedTime, setSelectedTime] = useState("");

    const { data: doctorTimes } = useGetTimesByDoctorIdQuery(selectedDoctor, {
        skip: !selectedDoctor,
    });

    const [currentStep, setCurrentStep] = useState(1);
    const [sendMessage] = useSendMessageMutation();
    const [showResult, setShowResult] = useState(false);
    const [sonucComponent, setSonucComponent] = useState(null);

    const today = new Date();
    const formatDate = (date) => date.toISOString().split("T")[0];

    const dateObj = new Date(selectedDate);
    const formattedDate = dateObj.toLocaleDateString('tr-TR', { //bir Date nesnesini yerel dil ve format kurallarına göre biçimlendirir
        day: '2-digit',
        month: 'long',
        year: 'numeric'
        //tarih formatının hangi şekilde gösterileceğini belirler
    });

    const selectedTimetoFormat = selectedTime;
    const [hour, minute] = selectedTimetoFormat.split(":");
    const formattedTime = `${hour}:${minute}`;
    // console.log(formattedTime); // "14:05"


    const selectedHospitalObj = hospitals?.find(h => h.id.toString() === selectedHospital);
    const selectedDepartmentObj = branches?.find(b => b.id.toString() === selectedDepartment);
    const selectedDoctorObj = doctors?.find(d => d.id.toString() === selectedDoctor);

    const handleConfirm = () => {

        // Önce form mesajını kaldır
        if (onRemoveFormMessage && setMessages && id) {
            onRemoveFormMessage(setMessages, id);
        }
        // Sonra randevu sonuç mesajını oluştur ve state'e ata
        setSonucComponent(
            <RandevuSonuc
                id={Date.now()}
                hospital={selectedHospitalObj?.name || "Bilinmiyor"}
                doctor={selectedDoctorObj?.name || "Bilinmiyor"}
                department={selectedDepartmentObj?.name || "Bilinmiyor"}
                date={`${selectedDate}`}
                time={`${selectedTime}`}
            />
        );
        setShowResult(true);
        setCurrentStep(5);

        setSelectedHospital("");
        setSelectedDoctor("");
        setSelectedDepartment("");
        setSelectedDate("");
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-xl space-y-4">
            <h2 className="text-2xl font-semibold text-center text-gray-800">Randevu Oluştur</h2>

            {currentStep === 1 && (
                <div>
                    <label className="block mb-1">Hastane</label>
                    <select className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" value={selectedHospital} onChange={(e) => setSelectedHospital(e.target.value)}>
                        <option value="">Seçiniz</option>
                        {hospitals?.map(hospital => (
                            <option key={hospital.id} value={hospital.id}>
                                {hospital.name}
                            </option>
                        ))}
                    </select>
                    <button
                        className="w-full mt-5 bg-[#303030]  hover:bg-[#414141] text-white py-2 px-4 rounded-2xl cursor-pointer"
                        onClick={async () => {
                            if (!selectedHospital) return;
                            const response = await sendMessage([{ role: "assistant", content: `Hastane: ${selectedHospitalObj?.name}}` }]).unwrap();
                            console.log(`${selectedHospitalObj?.name}`)
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
                        {branches?.map(branch => (
                            <option key={branch.id} value={branch.id}>
                                {branch.name}
                            </option>
                        ))}
                    </select>
                    <button
                        className="w-full mt-5 bg-[#303030] hover:bg-[#414141] text-white py-2 px-4 rounded-2xl cursor-pointer"
                        onClick={async () => {
                            if (!selectedDepartment) return;
                            const response = await sendMessage([{ role: "assistant", content: `Bölüm: ${selectedDepartmentObj?.name}` }]).unwrap();
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
                        {doctors?.map(doctor => (
                            <option key={doctor.id} value={doctor.id}>
                                {doctor.name}
                            </option>
                        ))}
                    </select>
                    <button
                        className="w-full mt-5 bg-[#303030] hover:bg-[#414141] text-white py-2 px-4 rounded-2xl cursor-pointer"
                        onClick={async () => {
                            if (!selectedDoctor) return;
                            const response = await sendMessage([{ role: "assistant", content: `Doktor: ${selectedDoctorObj?.name}` }]).unwrap();
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
                        <option value="">Saat seçiniz</option>
                        {doctorTimes?.available?.map((time, i) => (
                            <option key={i} value={time}>
                                {time}
                            </option>
                        ))}
                    </select>

                    <button
                        className="w-full mt-5 bg-[#303030] hover:bg-[#414141] text-white py-2 px-4 rounded-2xl cursor-pointer"
                        onClick={async () => {
                            if (!selectedDate || !selectedTime) return;
                            const response = await sendMessage([
                                { role: "assistant", content: `Tarih: ${formattedDate} - Saat: ${formattedTime}` },
                            ]).unwrap();
                            console.log(`Tarih: ${formattedDate} - Saat: ${formattedTime}`)
                            console.log("✅ API cevabı:", response);
                            handleConfirm();
                        }}
                    >
                        Devam Et
                    </button>
                </div>
            )}


            {currentStep === 5 && showResult && (
                <div>
                    {sonucComponent}
                </div>
            )}
        </div>
    );
}

export default RandevuAl;
