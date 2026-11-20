import {
  loadState,
  enterVehicle,
  exitVehicle,
  getParkingSnapshot,
  calculateBill,
  searchHistory,
  formatDuration
} from "./parking.js";

const $ = id => document.getElementById(id);

function showMessage(id, message, isError = false) {
  const element = $(id);
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("error", isError);
}

function renderSlots(containerId, slots, prefix) {
  const container = $(containerId);
  if (!container) return;

  container.replaceChildren();
  slots.forEach((vehicle, index) => {
    const item = document.createElement("div");
    item.className = `slot${vehicle ? " occupied" : ""}`;

    const name = document.createElement("strong");
    name.textContent = `${prefix} ${index + 1}`;

    const detail = document.createElement("span");
    detail.textContent = vehicle ? vehicle.registration : "Available";

    item.append(name, detail);
    container.append(item);
  });
}

function renderQueue(queue) {
  const list = $("queue-list");
  const count = $("queue-count");
  if (!list || !count) return;

  list.replaceChildren();
  count.textContent = String(queue.length);

  if (!queue.length) {
    list.className = "empty-state";
    list.textContent = "No vehicles in the queue.";
    return;
  }

  list.className = "";
  queue.forEach((vehicle, index) => {
    const row = document.createElement("div");
    row.className = "queue-row";

    const name = document.createElement("span");
    name.textContent = `${index + 1}. ${vehicle.registration}`;

    const type = document.createElement("span");
    type.textContent = vehicle.type;

    row.append(name, type);
    list.append(row);
  });
}

function renderHistory() {
  const body = $("history-body");
  if (!body) return;

  body.replaceChildren();
  const searchInput = $("history-search");
  const records = searchHistory(searchInput?.value ?? "");

  if (!records.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "empty-state";
    cell.textContent = "No matching parking history.";
    row.append(cell);
    body.append(row);
    return;
  }

  records.slice(0, 20).forEach(record => {
    const row = document.createElement("tr");
    const values = [
      record.registration,
      record.type,
      formatDuration(record.durationHours),
      `₹${record.fee}`
    ];

    values.forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = String(value);
      row.append(cell);
    });
    body.append(row);
  });
}

function render() {
  const snapshot = getParkingSnapshot();

  renderSlots("normal-slots", snapshot.normalSlots, "N");
  renderSlots("emergency-slots", snapshot.emergencySlots, "E");

  const values = {
    "stat-normal": snapshot.availableNormal,
    "normal-caption": `${snapshot.availableNormal} available`,
    "stat-occupied": snapshot.occupied,
    "stat-emergency": snapshot.availableEmergency,
    "emergency-caption": `${snapshot.availableEmergency} available`,
    "stat-queue": snapshot.waitingQueue.length,
    "hero-available": snapshot.availableNormal,
    "hero-occupied": snapshot.occupied,
    "hero-queued": snapshot.waitingQueue.length
  };

  Object.entries(values).forEach(([id, value]) => {
    const element = $(id);
    if (element) element.textContent = String(value);
  });

  renderQueue(snapshot.waitingQueue);
  renderHistory();
}

function setupEntryForm() {
  const form = $("entry-form");
  if (!form) return;

  form.addEventListener("submit", event => {
    event.preventDefault();

    const registration = $("entry-number")?.value ?? "";
    const type = $("entry-type")?.value ?? "";
    const result = enterVehicle(registration, type);

    showMessage("entry-message", result.message, !result.ok);
    if (result.ok) {
      form.reset();
      render();
    }
  });
}

function setupExitForm() {
  const form = $("exit-form");
  if (!form) return;

  form.addEventListener("submit", event => {
    event.preventDefault();

    const registration = $("exit-number")?.value ?? "";
    const result = exitVehicle(registration);
    showMessage("exit-message", result.message, !result.ok);

    if (result.ok) {
      form.reset();
      const billAmount = $("bill-amount");
      if (billAmount) billAmount.textContent = "—";
      render();
    }
  });
}

function setupBillPreview() {
  const input = $("exit-number");
  if (!input) return;

  input.addEventListener("input", () => {
    const registration = String(input.value)
      .trim()
      .toUpperCase()
      .replace(/[\s-]/g, "");

    const snapshot = getParkingSnapshot();
    const vehicle = [...snapshot.normalSlots, ...snapshot.emergencySlots]
      .find(item => item?.registration === registration);

    const amount = $("bill-amount");
    if (amount) {
      amount.textContent = vehicle ? `₹${calculateBill(vehicle).fee}` : "—";
    }
  });
}

function setupHistorySearch() {
  $("history-search")?.addEventListener("input", renderHistory);
}

function initializeSmartPark() {
  loadState();
  setupEntryForm();
  setupExitForm();
  setupBillPreview();
  setupHistorySearch();
  render();
}

initializeSmartPark();
