
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const dataFile = path.join(__dirname, "medicines.json");

app.use(cors());
app.use(express.json());

function readMedicines() {
  try {
    if (!fs.existsSync(dataFile)) {
      return [];
    }

    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch (error) {
    console.error("Could not read medicines:", error);
    return [];
  }
}

function saveMedicines(medicines) {
  fs.writeFileSync(dataFile, JSON.stringify(medicines, null, 2));
}

app.get("/", (req, res) => {
  res.send("MediTrack Backend is Running! 💊");
});

app.get("/api/test", (req, res) => {
  res.json({
    message: "Frontend connected to MediTrack backend successfully!"
  });
});

app.get("/api/medicines", (req, res) => {
  res.json(readMedicines());
});

app.post("/api/medicines", (req, res) => {
  const { name, dosage, time } = req.body;

  if (!name || !dosage || !time) {
    return res.status(400).json({
      message: "Medicine name, dosage, and time are required."
    });
  }

  const medicines = readMedicines();

  const medicine = {
    id: Date.now().toString(),
    name,
    dosage,
    time,
    taken: false
  };

  medicines.push(medicine);
  saveMedicines(medicines);

  res.status(201).json({
    message: "Medicine saved successfully!",
    medicine
  });
});

app.patch("/api/medicines/:id", (req, res) => {
  const medicines = readMedicines();
  const medicine = medicines.find(m => m.id === req.params.id);

  if (!medicine) {
    return res.status(404).json({
      message: "Medicine not found."
    });
  }

  if (typeof req.body.taken === "boolean") {
    medicine.taken = req.body.taken;
  }

  saveMedicines(medicines);
  res.json(medicine);
});

app.delete("/api/medicines/:id", (req, res) => {
  const medicines = readMedicines();
  const updatedMedicines = medicines.filter(
    m => m.id !== req.params.id
  );

  if (updatedMedicines.length === medicines.length) {
    return res.status(404).json({
      message: "Medicine not found."
    });
  }

  saveMedicines(updatedMedicines);
  res.json({ message: "Medicine deleted successfully." });
});

app.listen(PORT, () => {
  console.log(`MediTrack server running at http://localhost:${PORT}`);
});
