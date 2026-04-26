const storageKey = "chronic-care-medicines";

const defaultMedicines = [
  {
    time: "07:30",
    name: "二甲双胍缓释片",
    dose: "早餐后 1 片，服后记录空腹血糖",
    status: "taken",
  },
  {
    time: "08:00",
    name: "苯磺酸氨氯地平片",
    dose: "每日 1 次，每次 1 片，记录晨间血压",
    status: "taken",
  },
  {
    time: "19:30",
    name: "阿托伐他汀钙片",
    dose: "晚餐后 1 片，避免重复服用",
    status: "pending",
  },
  {
    time: "21:00",
    name: "二甲双胍缓释片",
    dose: "晚餐后 1 片，如漏服需标记原因",
    status: "late",
  },
];

const savedMedicines = JSON.parse(localStorage.getItem(storageKey) || "null");
const medicines = Array.isArray(savedMedicines) ? savedMedicines : defaultMedicines;

const list = document.querySelector("#medicineList");
const dialog = document.querySelector("#medicineDialog");
const addButton = document.querySelector("#addMedicineBtn");
const saveButton = document.querySelector("#saveMedicineBtn");

function saveMedicines() {
  localStorage.setItem(storageKey, JSON.stringify(medicines));
}

function statusLabel(status) {
  if (status === "taken") return "已服";
  if (status === "late") return "提醒";
  return "打卡";
}

function renderMedicines() {
  list.innerHTML = medicines
    .map(
      (medicine, index) => `
        <article class="medicine-item ${medicine.status}">
          <div class="time-pill">${medicine.time}</div>
          <div class="medicine-copy">
            <strong>${medicine.name}</strong>
            <p>${medicine.dose}</p>
          </div>
          <button class="status-button" type="button" data-index="${index}">
            ${statusLabel(medicine.status)}
          </button>
        </article>
      `,
    )
    .join("");
}

renderMedicines();

list.addEventListener("click", (event) => {
  const button = event.target.closest(".status-button");
  if (!button) return;

  const medicine = medicines[Number(button.dataset.index)];
  medicine.status = medicine.status === "taken" ? "pending" : "taken";
  saveMedicines();
  renderMedicines();
});

addButton.addEventListener("click", () => {
  dialog.showModal();
});

saveButton.addEventListener("click", () => {
  const name = document.querySelector("#medicineName").value.trim();
  const time = document.querySelector("#medicineTime").value.trim();
  const dose = document.querySelector("#medicineDose").value.trim();

  if (!name || !time || !dose) return;

  medicines.push({
    time,
    name,
    dose,
    status: "pending",
  });

  saveMedicines();
  renderMedicines();
  dialog.close();
});
