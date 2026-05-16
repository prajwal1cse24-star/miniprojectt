import { addHealthRecord as storeAddHealthRecord, getHealthRecords as storeGetHealthRecords, getAnimals as storeGetAnimals } from "../data/store.js";

const populateHealthRecord = (record, animals) => ({
  ...record,
  animal: animals.find((animal) => animal._id === record.animalId) || null,
});

export const createHealthRecord = async (req, res) => {
  const record = await storeAddHealthRecord(req.body);
  res.json(record);
};

export const getHealthRecords = async (req, res) => {
  const records = await storeGetHealthRecords();
  const animals = await storeGetAnimals();
  res.json(records.map((record) => populateHealthRecord(record, animals)));
};