// routes/doctor.routes.js
import express from 'express';
import { getDoctors } from '../controllers/doctor.controller.js'; // Branşa göre doktorlar için
import { getDoctorSlots } from '../controllers/doctorSlot.controller.js'; // Doktorun zamanları için
import { getAllDoctors } from '../controllers/doctor.controller.js'; // BURADA YENİ BİR İMPORT OLMALI!

const router = express.Router();

// Branşa göre doktorları getirme rotası (Örnek: /api/branches/1/doctors)
router.get('/:branchId/doctors', getDoctors);

// Doktorun müsait zaman dilimlerini getirme rotası (Örnek: /api/doctors/111/times)
router.get('/:doctorId/times', getDoctorSlots);

// TÜM DOKTORLARI GETİRME ROTASI - BURADA DÜZELTME YAPILDI!
// Bu rota, /api/doctors isteğini karşılar
router.get('/', getAllDoctors); // Yeni eklenen rota

export default router;