import Animal from "../models/Animal.js";

export const createAnimal = async (req, res) => {
  const animal = await Animal.create(req.body);
  res.json(animal);
};

export const getAnimals = async (req, res) => {
  const animals = await Animal.find();
  res.json(animals);
};