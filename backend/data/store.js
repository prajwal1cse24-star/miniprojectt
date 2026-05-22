import fs from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
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
  consultations: [],
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
  consultations: Array.isArray(data?.consultations) ? data.consultations : [],
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

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const ensureUniqueFarmerId = (db, preferred) => {
  const base = slugify(preferred) || `user-${Date.now().toString(36)}`;
  let candidate = base;
  let suffix = 1;

  while (
    db.users.some((existing) => String(existing.farmerId || "").trim().toLowerCase() === candidate)
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};

export const getUsers = async () => {
  const db = await readDb();
  return db.users;
};

export const addUser = async (user) => {
  const db = await readDb();
  const normalizedEmail = String(user.email || "").trim().toLowerCase();
  const normalizedFarmerId = String(user.farmerId || "").trim().toLowerCase();

  if (normalizedEmail && db.users.some((existing) => String(existing.email || "").trim().toLowerCase() === normalizedEmail)) {
    throw new Error("Email already exists");
  }

  if (!normalizedFarmerId) {
    throw new Error("Farmer ID is required");
  }

  if (db.users.some((existing) => String(existing.farmerId || "").trim().toLowerCase() === normalizedFarmerId)) {
    throw new Error("Farmer ID already exists");
  }

  const record = {
    ...user,
    role: user.role || "Staff",
    email: normalizedEmail,
    farmerId: normalizedFarmerId,
    _id: makeId(),
  };
  db.users.push(record);
  await writeDb(db);
  return record;
};

export const getUserByEmail = async (email) => {
  const db = await readDb();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  return db.users.find((user) => String(user.email || "").trim().toLowerCase() === normalizedEmail) || null;
};

export const getUserByName = async (name) => {
  const db = await readDb();
  const normalizedName = String(name || "").trim().toLowerCase();
  return db.users.find((user) => String(user.name || "").trim().toLowerCase() === normalizedName) || null;
};

export const getUserByFarmerId = async (farmerId) => {
  const db = await readDb();
  const normalizedFarmerId = String(farmerId || "").trim().toLowerCase();
  return db.users.find((user) => String(user.farmerId || "").trim().toLowerCase() === normalizedFarmerId) || null;
};

export const ensureUserFarmerIds = async () => {
  const db = await readDb();
  let changed = false;

  const updatedUsers = [];
  for (const user of db.users) {
    const current = String(user.farmerId || "").trim().toLowerCase();
    if (current) {
      updatedUsers.push({ ...user, farmerId: current });
      continue;
    }

    changed = true;
    const snapshot = { ...db, users: [...updatedUsers, ...db.users] };
    const fallback = user.email ? String(user.email).split("@")[0] : user.name;
    const generated = ensureUniqueFarmerId(snapshot, fallback);
    updatedUsers.push({ ...user, farmerId: generated });
  }

  db.users = updatedUsers;

  if (changed) {
    await writeDb(db);
  }
};

export const getUserById = async (id) => {
  const db = await readDb();
  return db.users.find((user) => String(user._id) === String(id)) || null;
};

export const updateUserRole = async (id, role) => {
  const db = await readDb();
  const index = db.users.findIndex((u) => String(u._id) === String(id));
  if (index === -1) return null;
  db.users[index] = { ...db.users[index], role };
  await writeDb(db);
  return db.users[index];
};

export const updateUserById = async (id, changes) => {
  const db = await readDb();
  const index = db.users.findIndex((u) => String(u._id) === String(id));
  if (index === -1) return null;
  db.users[index] = { ...db.users[index], ...changes };
  await writeDb(db);
  return db.users[index];
};

export const createUserByAdmin = async (user) => {
  const db = await readDb();
  const name = String(user.name || "").trim();
  const preferredFarmerId = String(user.farmerId || "").trim().toLowerCase();
  const role = String(user.role || "Staff").trim() || "Staff";
  const status = String(user.status || "Active").trim() || "Active";
  const phone = String(user.phone || "").trim();

  if (!name || !preferredFarmerId) {
    throw new Error("Name and Farmer ID are required");
  }

  const normalizedFarmerId = slugify(preferredFarmerId);
  if (!normalizedFarmerId) {
    throw new Error("Invalid Farmer ID");
  }

  if (db.users.some((existing) => String(existing.farmerId || "").trim().toLowerCase() === normalizedFarmerId)) {
    throw new Error("Farmer ID already exists");
  }

  const record = {
    _id: makeId(),
    name,
    farmerId: normalizedFarmerId,
    email: user.email ? String(user.email).trim().toLowerCase() : `${normalizedFarmerId}@farm.local`,
    role,
    status,
    phone,
    createdAt: new Date().toISOString(),
    ...(user.password ? { password: await bcrypt.hash(String(user.password), 10) } : {}),
  };

  db.users.push(record);
  await writeDb(db);
  return record;
};

export const deleteUserById = async (id) => {
  const db = await readDb();
  const index = db.users.findIndex((u) => String(u._id) === String(id));
  if (index === -1) return null;
  const [removed] = db.users.splice(index, 1);
  await writeDb(db);
  return removed;
};

export const getAnimals = async () => {
  const db = await readDb();
  return db.animals;
};

export const addAnimal = async (animal) => {
  const db = await readDb();
  const record = { ...animal, _id: makeId(), createdAt: animal.createdAt || new Date().toISOString() };
  db.animals.push(record);
  await writeDb(db);
  return record;
};

export const updateAnimalById = async (id, changes) => {
  const db = await readDb();
  const index = db.animals.findIndex((animal) => animal._id === id);

  if (index === -1) {
    return null;
  }

  db.animals[index] = {
    ...db.animals[index],
    ...changes,
    updatedAt: new Date().toISOString(),
  };

  await writeDb(db);
  return db.animals[index];
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

export const getConsultations = async () => {
  const db = await readDb();
  return db.consultations || [];
};

export const addConsultation = async (consultation) => {
  const db = await readDb();
  const record = {
    ...consultation,
    _id: makeId(),
    photos: consultation.photos || [],
    status: consultation.status || 'pending',
    createdAt: new Date().toISOString(),
  };
  db.consultations.push(record);
  await writeDb(db);
  return record;
};

export const getConsultationById = async (id) => {
  const db = await readDb();
  return db.consultations.find((c) => String(c._id) === String(id)) || null;
};

export const addPrescriptionToConsultation = async (id, prescription) => {
  const db = await readDb();
  const idx = db.consultations.findIndex((c) => String(c._id) === String(id));
  if (idx === -1) return null;
  db.consultations[idx] = {
    ...db.consultations[idx],
    diagnosis: prescription.diagnosis || db.consultations[idx].diagnosis,
    prescription: prescription.prescription || db.consultations[idx].prescription || [],
    status: prescription.status || 'completed',
    updatedAt: new Date().toISOString(),
  };
  await writeDb(db);
  return db.consultations[idx];
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
