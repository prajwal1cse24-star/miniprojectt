import { addConsultation, getConsultations, getConsultationById, addPrescriptionToConsultation, getAnimals } from "../data/store.js";

export const createConsultation = async (req, res) => {
  const payload = req.body || {};
  const record = await addConsultation(payload);
  res.status(201).json(record);
};

export const listConsultations = async (req, res) => {
  const list = await getConsultations();
  const animals = await getAnimals();
  const populated = list.map((c) => ({ ...c, animal: animals.find((a) => String(a._id) === String(c.animalId)) || null }));
  res.json(populated);
};

export const addPrescription = async (req, res) => {
  const id = req.params.id;
  const payload = req.body || {};
  const updated = await addPrescriptionToConsultation(id, payload);
  if (!updated) return res.status(404).json({ message: 'Consultation not found' });
  res.json(updated);
};

export const getConsultation = async (req, res) => {
  const id = req.params.id;
  const c = await getConsultationById(id);
  if (!c) return res.status(404).json({ message: 'Consultation not found' });
  res.json(c);
};
