// controllers/doctor.controller.js
import { getDoctorsByBranchId, getAllDoctors as getAllDoctorsFromRepo } from '../repositories/doctor.repository.js'; // getAllDoctors'ı import edin

// Branşa göre doktorları getirme
export async function getDoctors(req, res) {
  try {
    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ error: 'Geçersiz branş ID.' });
    }
    const doctors = await getDoctorsByBranchId(branchId);
    if (!doctors || doctors.length === 0) {
      return res.status(404).json({ message: 'Bu branşta doktor bulunamadı.' });
    }
    res.json(doctors);
  } catch (err) {
    console.error('Doktorlar alınırken sunucu hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası: Doktorlar alınamadı.' });
  }
}

// TÜM DOKTORLARI GETİRME - YENİ FONKSİYON
export async function getAllDoctors(req, res) {
  try {
    const doctors = await getAllDoctorsFromRepo();
    if (!doctors || doctors.length === 0) {
      return res.status(404).json({ message: 'Hiç doktor bulunamadı.' });
    }
    res.json(doctors);
  } catch (err) {
    console.error('Tüm doktorlar alınırken sunucu hatası:', err);
    res.status(500).json({ error: 'Sunucu hatası: Tüm doktorlar alınamadı.' });
  }
}