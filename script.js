
const medicineForm = document.getElementById("medicineForm");
const medicineList = document.getElementById("medicineList");
const searchMedicine = document.getElementById("searchMedicine");
const enableAlarmButton = document.getElementById("enableAlarmButton");
const alarmStatus = document.getElementById("alarmStatus");

const API_URL = "http://localhost:3000/api/medicines";

let medicines = [];
let audioContext = null;
let alarmEnabled = false;
const alertedMedicines = new Set();

async function loadMedicines() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Could not load medicines");
    }

    medicines = await response.json();
    displayMedicines();
  } catch (error) {
    console.error(error);
    medicineList.textContent =
      "Cannot connect to backend. Make sure the server is running.";
  }
}

async function saveMedicineToBackend(medicine) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(medicine)
  });

  if (!response.ok) {
    throw new Error("Could not save medicine");
  }

  return response.json();
}

async function updateMedicineOnBackend(medicine) {
  const response = await fetch(`${API_URL}/${medicine.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ taken: medicine.taken })
  });

  if (!response.ok) {
    throw new Error("Could not update medicine");
  }
}

async function deleteMedicineFromBackend(id) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error("Could not delete medicine");
  }
}

function enableAudio() {
  const AudioClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioClass) return;

  if (!audioContext) {
    audioContext = new AudioClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playAlarm() {
  if (!alarmEnabled) return;

  enableAudio();

  if (!audioContext || audioContext.state !== "running") return;

  const start = audioContext.currentTime;

  for (let i = 0; i < 5; i++) {
    const oscillator = audioContext.createOscillator();
    const volume = audioContext.createGain();
    const beepStart = start + i * 0.6;

    oscillator.type = "sine";
    oscillator.frequency.value = 880;

    volume.gain.setValueAtTime(0.001, beepStart);
    volume.gain.linearRampToValueAtTime(0.3, beepStart + 0.03);
    volume.gain.setValueAtTime(0.001, beepStart + 0.35);

    oscillator.connect(volume);
    volume.connect(audioContext.destination);

    oscillator.start(beepStart);
    oscillator.stop(beepStart + 0.4);
  }
}

enableAlarmButton.addEventListener("click", async () => {
  enableAudio();
  alarmEnabled = true;
  playAlarm();

  if ("Notification" in window) {
    try {
      const permission = await Notification.requestPermission();

      alarmStatus.textContent = permission === "granted"
        ? "✅ Notifications enabled. Keep the website open for sound reminders."
        : "Sound enabled. Browser notifications are not allowed.";
    } catch {
      alarmStatus.textContent = "Sound enabled, but notifications could not be enabled.";
    }
  }
});

function updateDashboard() {
  document.getElementById("totalMedicines").textContent = medicines.length;
  document.getElementById("takenMedicines").textContent =
    medicines.filter(m => m.taken).length;
  document.getElementById("pendingMedicines").textContent =
    medicines.filter(m => !m.taken).length;
}

function checkReminders() {
  const now = new Date();
  const currentTime =
    String(now.getHours()).padStart(2, "0") + ":" +
    String(now.getMinutes()).padStart(2, "0");

  medicines.forEach(medicine => {
    const key = `${now.toDateString()}-${medicine.id}-${medicine.time}`;

    if (
      medicine.time === currentTime &&
      !medicine.taken &&
      !alertedMedicines.has(key)
    ) {
      alertedMedicines.add(key);
      playAlarm();

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("💊 MediTrack Reminder", {
          body: `Time to take ${medicine.name} - ${medicine.dosage}`,
          tag: key
        });
      }
    }
  });
}

function displayMedicines() {
  const searchText = searchMedicine.value.toLowerCase();

  const filteredMedicines = medicines
    .filter(m => m.name.toLowerCase().includes(searchText))
    .sort((a, b) => a.time.localeCompare(b.time));

  medicineList.innerHTML = "";

  if (filteredMedicines.length === 0) {
    medicineList.textContent = "No medicines found. Add a medicine to get started.";
  }

  filteredMedicines.forEach(medicine => {
    const card = document.createElement("div");
    card.className = "medicine-card";

    const name = document.createElement("h3");
    name.textContent = medicine.name;

    const dosage = document.createElement("p");
    dosage.textContent = "Dosage: " + medicine.dosage;

    const time = document.createElement("p");
    time.textContent = "Time: " + medicine.time;

    const status = document.createElement("p");
    status.textContent = medicine.taken ? "✅ Medicine taken" : "⏳ Pending";

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const takenButton = document.createElement("button");
    takenButton.className = "taken-button";
    takenButton.textContent = medicine.taken ? "Mark as Pending" : "Mark as Taken";

    takenButton.addEventListener("click", async () => {
      const previousValue = medicine.taken;
      medicine.taken = !medicine.taken;

      try {
        await updateMedicineOnBackend(medicine);
        displayMedicines();
      } catch (error) {
        medicine.taken = previousValue;
        alert("Could not update medicine. Check that the backend is running.");
      }
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", async () => {
      if (!confirm("Are you sure you want to delete this medicine?")) return;

      try {
        await deleteMedicineFromBackend(medicine.id);
        medicines = medicines.filter(m => m.id !== medicine.id);
        displayMedicines();
      } catch (error) {
        alert("Could not delete medicine. Check that the backend is running.");
      }
    });

    actions.append(takenButton, deleteButton);
    card.append(name, dosage, time, status, actions);

    const now = new Date();
    const currentTime =
      String(now.getHours()).padStart(2, "0") + ":" +
      String(now.getMinutes()).padStart(2, "0");

    if (medicine.time === currentTime && !medicine.taken) {
      const reminder = document.createElement("p");
      reminder.className = "due-reminder";
      reminder.textContent = "🔔 Reminder time! Check your medicine schedule.";
      card.appendChild(reminder);
    }

    medicineList.appendChild(card);
  });

  updateDashboard();
}

medicineForm.addEventListener("submit", async event => {
  event.preventDefault();

  const name = document.getElementById("medicineName").value.trim();
  const dosage = document.getElementById("medicineDosage").value.trim();
  const time = document.getElementById("medicineTime").value;

  if (!name || !dosage || !time) {
    alert("Please fill in all medicine details.");
    return;
  }

  const newMedicine = { name, dosage, time };

  try {
    const result = await saveMedicineToBackend(newMedicine);

    medicines.push(result.medicine);
    medicineForm.reset();
    searchMedicine.value = "";
    displayMedicines();
  } catch (error) {
    alert("Could not save medicine. Make sure the backend is running.");
    console.error(error);
  }
});

searchMedicine.addEventListener("input", displayMedicines);

document.getElementById("todayDate").textContent =
  new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

loadMedicines();

setInterval(() => {
  checkReminders();
  displayMedicines();
}, 5000);
