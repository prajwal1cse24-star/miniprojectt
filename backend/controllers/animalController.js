import { addAnimal as storeAddAnimal, getAnimals as storeGetAnimals, updateAnimalById as storeUpdateAnimalById } from "../data/store.js";

export const createAnimal = async (req, res) => {
  const animal = await storeAddAnimal(req.body);
  res.json(animal);
};

export const getAnimals = async (req, res) => {
  const animals = await storeGetAnimals();
  res.json(animals);
};

export const updateAnimalPhoto = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image uploaded" });
  }

  const photoUrl = `/uploads/${req.file.filename}`;
  const updated = await storeUpdateAnimalById(req.params.animalId, { photoUrl, imageUrl: photoUrl });

  if (!updated) {
    return res.status(404).json({ message: "Animal not found" });
  }

  return res.json({ success: true, photoUrl, animal: updated });
};

export const updateAnimal = async (req, res) => {
  const updated = await storeUpdateAnimalById(req.params.animalId, req.body);

  if (!updated) {
    return res.status(404).json({ message: "Animal not found" });
  }

  return res.json(updated);
};