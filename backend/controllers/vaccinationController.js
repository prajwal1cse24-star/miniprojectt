import { addVaccination as storeAddVaccination, getVaccinations as storeGetVaccinations, getAnimals as storeGetAnimals } from "../data/store.js";

const populateVaccination = (vaccination, animals) => ({
  ...vaccination,
  animal: animals.find((animal) => animal._id === vaccination.animalId) || null,
});

export const createVaccination = async (req, res) => {
  const vaccination = await storeAddVaccination(req.body);
  res.json(vaccination);
};

export const getVaccinations = async (req, res) => {
  const vaccinations = await storeGetVaccinations();
  const animals = await storeGetAnimals();
  res.json(vaccinations.map((vaccination) => populateVaccination(vaccination, animals)));
};