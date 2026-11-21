export const NORMAL_SLOT_COUNT = 10;
export const EMERGENCY_SLOT_COUNT = 5;
export const RATES_PER_HOUR = {
  Bike: 10,
  Car: 20,
  SUV: 30,
  Emergency: 50
};

const STORAGE_KEY = "smartpark.frontend.v1";
const REGISTRATION_PATTERN = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/;

export const state = {
  normalSlots: Array(NORMAL_SLOT_COUNT).fill(null),
  emergencySlots: Array(EMERGENCY_SLOT_COUNT).fill(null),
  waitingQueue: [],
  history: []
};

export function normalizeRegistration(value) {
  return String(value ?? "").toUpperCase().replace(/[\s-]/g, "");
}

export function validateRegistration(value) {
  const registration = normalizeRegistration(value);
  if (!registration) {
    return { valid: false, message: "Enter a vehicle registration number." };
  }
  if (!REGISTRATION_PATTERN.test(registration)) {
    return {
      valid: false,
      message: "Enter a valid registration, for example UK07AB1234."
    };
  }
  return { valid: true, registration };
}

export function validateVehicleType(type) {
  return Object.hasOwn(RATES_PER_HOUR, type);
}

export function findVehicle(registration) {
  const number = normalizeRegistration(registration);
  for (const [kind, slots] of [
    ["normal", state.normalSlots],
    ["emergency", state.emergencySlots]
  ]) {
    const index = slots.findIndex(vehicle => vehicle?.registration === number);
    if (index !== -1) {
      return { kind, index, vehicle: slots[index] };
    }
  }
  return null;
}

export function availableNormalCount() {
  return state.normalSlots.filter(slot => slot === null).length;
}

export function availableEmergencyCount() {
  return state.emergencySlots.filter(slot => slot === null).length;
}

export function occupiedCount() {
  return NORMAL_SLOT_COUNT + EMERGENCY_SLOT_COUNT
    - availableNormalCount() - availableEmergencyCount();
}

export function saveState() {
  const snapshot = {
    normalSlots: state.normalSlots,
    emergencySlots: state.emergencySlots,
    waitingQueue: state.waitingQueue,
    history: state.history
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    return true;
  } catch (error) {
    console.warn("SmartPark could not save data:", error);
    return false;
  }
}

export function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") return;

    if (Array.isArray(saved.normalSlots)) {
      state.normalSlots = Array.from(
        { length: NORMAL_SLOT_COUNT },
        (_, index) => saved.normalSlots[index] ?? null
      );
    }
    if (Array.isArray(saved.emergencySlots)) {
      state.emergencySlots = Array.from(
        { length: EMERGENCY_SLOT_COUNT },
        (_, index) => saved.emergencySlots[index] ?? null
      );
    }
    state.waitingQueue = Array.isArray(saved.waitingQueue) ? saved.waitingQueue : [];
    state.history = Array.isArray(saved.history) ? saved.history : [];
  } catch (error) {
    console.warn("SmartPark could not restore saved data:", error);
  }
}

export function calculateBill(vehicle, exitTime = new Date()) {
  const start = new Date(vehicle.entryTime);
  const end = new Date(exitTime);
  const elapsedMs = Math.max(0, end.getTime() - start.getTime());
  // Parking is charged by started hour, with a one-hour minimum.
  const durationHours = Math.max(1, Math.ceil(elapsedMs / 3_600_000));
  const hourlyRate = RATES_PER_HOUR[vehicle.type] ?? 0;
  return {
    durationHours,
    hourlyRate,
    fee: durationHours * hourlyRate
  };
}

export function formatDuration(hours) {
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days} day${days === 1 ? "" : "s"} ${remainingHours} hr${remainingHours === 1 ? "" : "s"}`;
}

function addToQueue(vehicle) {
  if (state.waitingQueue.some(item => item.registration === vehicle.registration)) {
    return { ok: false, message: "Vehicle is already waiting." };
  }
  state.waitingQueue.push(vehicle);
  return { ok: true, position: state.waitingQueue.length };
}

function assignNextWaitingVehicle(slotIndex) {
  if (state.waitingQueue.length === 0 || state.normalSlots[slotIndex] !== null) {
    return null;
  }
  const nextVehicle = state.waitingQueue.shift();
  state.normalSlots[slotIndex] = {
    ...nextVehicle,
    slotNumber: slotIndex + 1,
    slotKind: "Normal"
  };
  return state.normalSlots[slotIndex];
}

export function enterVehicle(rawRegistration, type) {
  const checked = validateRegistration(rawRegistration);
  if (!checked.valid) return { ok: false, message: checked.message };
  if (!validateVehicleType(type)) {
    return { ok: false, message: "Choose a valid vehicle type." };
  }

  const alreadyParked = findVehicle(checked.registration);
  const alreadyWaiting = state.waitingQueue.some(
    vehicle => vehicle.registration === checked.registration
  );
  if (alreadyParked || alreadyWaiting) {
    return { ok: false, message: "This vehicle is already parked or waiting." };
  }

  const vehicle = {
    registration: checked.registration,
    type,
    entryTime: new Date().toISOString()
  };

  const slots = type === "Emergency" ? state.emergencySlots : state.normalSlots;
  const index = slots.findIndex(slot => slot === null);

  if (index === -1) {
    if (type === "Emergency") {
      return { ok: false, message: "No emergency parking space is available." };
    }
    const queued = addToQueue(vehicle);
    if (!queued.ok) return queued;
    saveState();
    return {
      ok: true,
      queued: true,
      position: queued.position,
      message: `Parking is full. Vehicle added to waiting queue at position ${queued.position}.`
    };
  }

  slots[index] = {
    ...vehicle,
    slotNumber: index + 1,
    slotKind: type === "Emergency" ? "Emergency" : "Normal"
  };
  saveState();

  return {
    ok: true,
    queued: false,
    message: `${checked.registration} parked in ${type === "Emergency" ? "emergency" : "normal"} slot ${index + 1}.`
  };
}

export function exitVehicle(rawRegistration) {
  const checked = validateRegistration(rawRegistration);
  if (!checked.valid) return { ok: false, message: checked.message };

  const found = findVehicle(checked.registration);
  if (!found) {
    return { ok: false, message: "This vehicle is not currently parked." };
  }

  const exitTime = new Date().toISOString();
  const bill = calculateBill(found.vehicle, exitTime);
  const completed = {
    registration: found.vehicle.registration,
    type: found.vehicle.type,
    entryTime: found.vehicle.entryTime,
    exitTime,
    durationHours: bill.durationHours,
    fee: bill.fee
  };

  const slots = found.kind === "emergency"
    ? state.emergencySlots
    : state.normalSlots;
  slots[found.index] = null;

  state.history.unshift(completed);
  if (found.kind === "normal") {
    assignNextWaitingVehicle(found.index);
  }

  saveState();
  return {
    ok: true,
    message: `${checked.registration} has exited. Parking fee: ₹${bill.fee}.`,
    fee: bill.fee,
    durationHours: bill.durationHours,
    completed
  };
}

export function searchHistory(query = "") {
  const term = String(query).trim().toUpperCase();
  if (!term) return [...state.history];
  return state.history.filter(record =>
    String(record.registration).toUpperCase().includes(term)
  );
}

export function clearHistory() {
  state.history = [];
  saveState();
}

export function getParkingSnapshot() {
  return {
    normalSlots: state.normalSlots,
    emergencySlots: state.emergencySlots,
    waitingQueue: state.waitingQueue,
    history: state.history,
    availableNormal: availableNormalCount(),
    availableEmergency: availableEmergencyCount(),
    occupied: occupiedCount()
  };
}
