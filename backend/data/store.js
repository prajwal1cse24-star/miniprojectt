import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, "db.json");

const defaultDb = {
  users: [],
  animals: [],
  feeders: [],
  feedLogs: [],
  vaccinations: [],
  healthRecords: [],
  staff: [],
  notifications: [],
};

const normalizeDb = (data) => ({
  ...defaultDb,
  ...data,
  users: Array.isArray(data?.users) ? data.users : [],
  animals: Array.isArray(data?.animals) ? data.animals : [],
  feeders: Array.isArray(data?.feeders) ? data.feeders : [],
  feedLogs: Array.isArray(data?.feedLogs) ? data.feedLogs : [],
  vaccinations: Array.isArray(data?.vaccinations) ? data.vaccinations : [],
  healthRecords: Array.isArray(data?.healthRecords) ? data.healthRecords : [],
  staff: Array.isArray(data?.staff) ? data.staff : [],
  notifications: Array.isArray(data?.notifications) ? data.notifications : [],
});

const ensureDb = async () => {
  try {
    await fs.access(dbFile);
  } catch {
    await fs.mkdir(path.dirname(dbFile), { recursive: true });
    await fs.writeFile(dbFile, JSON.stringify(defaultDb, null, 2), "utf8");
  }
};

const readDb = async () => {
  await ensureDb();
  const data = await fs.readFile(dbFile, "utf8");
  return normalizeDb(JSON.parse(data || JSON.stringify(defaultDb)));
};

const writeDb = async (data) => {
  await fs.writeFile(dbFile, JSON.stringify(data, null, 2), "utf8");
};

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const getUsers = async () => {
  const db = await readDb();
  return db.users;
};

export const addUser = async (user) => {
  const db = await readDb();
  if (db.users.some((existing) => existing.email === user.email)) {
    throw new Error("Email already exists");
  }
  const record = { ...user, _id: makeId() };
  db.users.push(record);
  await writeDb(db);
  return record;
};

export const getUserByEmail = async (email) => {
  const db = await readDb();
  return db.users.find((user) => user.email === email) || null;
};

export const getAnimals = async () => {
  const db = await readDb();
  return db.animals;
};

export const addAnimal = async (animal) => {
  const db = await readDb();
  const record = { ...animal, _id: makeId() };
  db.animals.push(record);
  await writeDb(db);
  return record;
};

export const getFeeders = async () => {
  const db = await readDb();
  return db.feeders;
};

export const addFeeder = async (feeder) => {
  const db = await readDb();
  const record = { ...feeder, _id: makeId(), lastUpdated: new Date().toISOString() };
  db.feeders.push(record);
  await writeDb(db);
  return record;
};

export const updateFeederById = async (id, changes) => {
  const db = await readDb();
  const index = db.feeders.findIndex((feeder) => feeder._id === id);
  if (index === -1) {
    return null;
  }
  db.feeders[index] = {
    ...db.feeders[index],
    ...changes,
    lastUpdated: new Date().toISOString(),
  };
  await writeDb(db);
  return db.feeders[index];
};

export const getFeedLogs = async () => {
  const db = await readDb();
  return db.feedLogs;
};

export const addFeedLog = async (log) => {
  const db = await readDb();
  const record = { ...log, _id: makeId(), date: new Date().toISOString() };
  db.feedLogs.push(record);
  await writeDb(db);
  return record;
};

export const getVaccinations = async () => {
  const db = await readDb();
  return db.vaccinations;
};

export const addVaccination = async (vaccination) => {
  const db = await readDb();
  const record = {
    ...vaccination,
    _id: makeId(),
    dueDate: vaccination.dueDate || null,
    status: vaccination.status || "pending",
    createdAt: new Date().toISOString(),
  };
  db.vaccinations.push(record);
  await writeDb(db);
  return record;
};

export const getHealthRecords = async () => {
  const db = await readDb();
  return db.healthRecords;
};

export const addHealthRecord = async (healthRecord) => {
  const db = await readDb();
  const record = {
    ...healthRecord,
    _id: makeId(),
    date: healthRecord.date || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  db.healthRecords.push(record);
  await writeDb(db);
  return record;
};

export const getStaff = async () => {
  const db = await readDb();
  return db.staff;
};

export const addStaff = async (staffMember) => {
  const db = await readDb();
  const record = { ...staffMember, _id: makeId(), createdAt: new Date().toISOString() };
  db.staff.push(record);
  await writeDb(db);
  return record;
};

export const getNotifications = async () => {
  const db = await readDb();
  return db.notifications;
};

export const addNotification = async (notification) => {
  const db = await readDb();
  const record = {
    ...notification,
    _id: makeId(),
    createdAt: notification.createdAt || new Date().toISOString(),
  };
  db.notifications.unshift(record);
  await writeDb(db);
  return record;
};
