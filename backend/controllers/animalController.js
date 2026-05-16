import { addAnimal as storeAddAnimal, getAnimals as storeGetAnimals } from "../data/store.js";

export const createAnimal = async (req, res) => {
  const animal = await storeAddAnimal(req.body);
  res.json(animal);
};

export const getAnimals = async (req, res) => {
  const animals = await storeGetAnimals();
  res.json(animals);
};