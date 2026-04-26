const SUPABASE_URL = "https://xpiqgjuqhlkaayqpozzk.supabase.co";
const SUPABASE_KEY = "sb_publishable_CYDmj69yeODQ_8ZD67DUjA_htwUoPkj";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let medicines = [];
let logs = [];
let toastTimer = null;

const authView = document.querySelector("#authView");
const dashboard = document.querySelector("#dashboard");
const authForm = document.querySelector("#authForm");
const authMessage = document.querySelector("#authMessage");
const emailInput = document.querySelector("#emailInput");
const passwordInput = document.querySelector("#passwordInput");
const signUpBtn = document.querySelector("#signUpBtn");
const signOutBtn = document.querySelector("#signOutBtn");
const syncStatus = document.querySelector("#syncStatus");
const userEmail = document.querySelector("#userEmail");
const dataState = document.querySelector("#dataState");
const todayPlanCount = document.querySelector("#todayPlanCount");
const takenCount = document.querySelector("#takenCount");
const missedCount = document.querySelector("#missedCount");
const activeCount = document.querySelector("#activeCount");
const list = document.querySelector("#medicineList");
const stockTable = document.querySelector("#stockTable");
const dialog = document.querySelector("#medicineDialog");
const addButton = document.querySelector("#addMedicineBtn");
const saveButton = document.querySelector("#saveMedicineBtn");
const refreshButton = document.querySelector("#refreshBtn");
const toast = document.querySelector("#toast");

function setMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("error", isError);
}

function showToast(message, type = "success") {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  toastTimer = setTimeout(() => {
    toast.className = "toast";
  }, 2400);
}

function switchView(user) {
  currentUser = user;
  authView.hidden = Boolean(user);
  dashboard.hidden = !user;
}

function formatDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getLogForMedicine(medicineId) {
  return logs.find((log) => log.medicine_id === medicineId);
}

function statusLabel(medicineId) {
  const log = getLogForMedicine(medicineId);
  if (log?.status === "taken") return "已服";
  if (log?.status === "missed") return "漏服";
  return "打卡";
}

function renderMedicines() {
  if (!currentUser) return;

  if (medicines.length === 0) {
    list.innerHTML = '<p class="empty-state">还没有用药计划，点击右上角“添加用药”开始。</p>';
    renderStockTable();
    return;
  }

  list.innerHTML = medicines
    .map((medicine) => {
      const log = getLogForMedicine(medicine.id);
      const status = log?.status === "taken" ? "taken" : "pending";
      return `
        <article class="medicine-item ${status}">
          <div class="time-pill">${escapeHtml(medicine.time_label)}</div>
          <div class="medicine-copy">
            <strong>${escapeHtml(medicine.name)}</strong>
            <p>${escapeHtml(medicine.dose)}</p>
          </div>
          <button class="status-button" type="button" data-id="${medicine.id}">
            ${statusLabel(medicine.id)}
          </button>
        </article>
      `;
    })
    .join("");

  renderStockTable();
}

function renderStockTable() {
  const rows = medicines
    .map((medicine) => {
      const stock = Number(medicine.stock_count ?? 0);
      const warning = stock <= 14 ? " warning" : "";
      const suggestion = medicine.refill_before
        ? `${medicine.refill_before} 前补药`
        : stock <= 14
          ? "建议尽快补药"
          : "暂不需要";

      return `
        <div class="table-row${warning}">
          <span>${escapeHtml(medicine.name)}</span>
          <span>${stock} 片</span>
          <span>${escapeHtml(suggestion)}</span>
        </div>
      `;
    })
    .join("");

  stockTable.innerHTML = `
    <div class="table-row table-head">
      <span>药品</span>
      <span>库存</span>
      <span>续购建议</span>
    </div>
    ${rows || '<div class="table-row"><span>暂无数据</span><span>-</span><span>添加用药后自动生成</span></div>'}
  `;
}

function renderSummary() {
  const taken = logs.filter((log) => log.status === "taken").length;
  const missed = logs.filter((log) => log.status === "missed").length;
  userEmail.textContent = currentUser?.email ?? "未登录";
  todayPlanCount.textContent = `${medicines.length} 项`;
  takenCount.textContent = `${taken} 次`;
  missedCount.textContent = `${missed} 次`;
  activeCount.textContent = `${medicines.filter((medicine) => medicine.is_active).length} 项`;
  dataState.textContent = currentUser ? "已同步" : "未同步";
  syncStatus.textContent = currentUser ? "Supabase 已连接" : "等待登录";
}

async function ensureProfile() {
  const { error } = await supabaseClient.from("profiles").upsert({
    id: currentUser.id,
    display_name: currentUser.email?.split("@")[0] ?? "新用户",
  });

  if (error) throw error;
}

async function loadData() {
  if (!currentUser) return;

  dataState.textContent = "同步中";

  const today = formatDate();
  const [{ data: medicineData, error: medicineError }, { data: logData, error: logError }] =
    await Promise.all([
      supabaseClient
        .from("medicines")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
      supabaseClient.from("medication_logs").select("*").eq("scheduled_for", today),
    ]);

  if (medicineError) throw medicineError;
  if (logError) throw logError;

  medicines = medicineData ?? [];
  logs = logData ?? [];
  renderMedicines();
  renderSummary();
}

async function enterDashboard(user, message) {
  showToast(message);
  await new Promise((resolve) => setTimeout(resolve, 650));
  switchView(user);
  renderSummary();
  await ensureProfile();
  await loadData();
}

async function handleSignIn(event) {
  event.preventDefault();
  setMessage("正在登录...");

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: emailInput.value.trim(),
    password: passwordInput.value,
  });

  if (error) {
    setMessage(error.message, true);
    showToast("登录失败，请检查邮箱和密码", "error");
    return;
  }

  setMessage("");
  await enterDashboard(data.user, "登录成功，正在进入控制台");
}

async function handleSignUp() {
  if (!authForm.reportValidity()) return;

  setMessage("正在注册...");

  const { data, error } = await supabaseClient.auth.signUp({
    email: emailInput.value.trim(),
    password: passwordInput.value,
  });

  if (error) {
    setMessage(error.message, true);
    showToast("注册失败，请检查填写信息", "error");
    return;
  }

  if (!data.session) {
    setMessage("注册成功，请先到邮箱完成确认后再登录。");
    showToast("注册成功，请查收确认邮件");
    return;
  }

  setMessage("");
  await enterDashboard(data.user, "注册成功，正在进入控制台");
}

async function handleSignOut() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  medicines = [];
  logs = [];
  switchView(null);
  setMessage("");
  showToast("已退出登录");
}

async function handleSaveMedicine() {
  if (!currentUser) return;

  const name = document.querySelector("#medicineName").value.trim();
  const time = document.querySelector("#medicineTime").value.trim();
  const dose = document.querySelector("#medicineDose").value.trim();
  const stock = Number(document.querySelector("#medicineStock").value || 0);
  const refillBefore = document.querySelector("#medicineRefillBefore").value || null;

  if (!name || !time || !dose) return;

  const { error } = await supabaseClient.from("medicines").insert({
    user_id: currentUser.id,
    name,
    dose,
    time_label: time,
    stock_count: stock,
    refill_before: refillBefore,
    is_active: true,
  });

  if (error) {
    showToast(error.message, "error");
    return;
  }

  dialog.close();
  showToast("用药计划已保存");
  await loadData();
}

async function handleMedicineClick(event) {
  const button = event.target.closest(".status-button");
  if (!button || !currentUser) return;

  const medicineId = button.dataset.id;
  const existingLog = getLogForMedicine(medicineId);
  const today = formatDate();

  button.disabled = true;

  if (existingLog?.status === "taken") {
    const { error } = await supabaseClient.from("medication_logs").delete().eq("id", existingLog.id);
    if (error) {
      showToast(error.message, "error");
      button.disabled = false;
      return;
    }
    showToast("已取消本次打卡");
  } else {
    const payload = {
      user_id: currentUser.id,
      medicine_id: medicineId,
      scheduled_for: today,
      taken_at: new Date().toISOString(),
      status: "taken",
    };

    const { error } = existingLog
      ? await supabaseClient.from("medication_logs").update(payload).eq("id", existingLog.id)
      : await supabaseClient.from("medication_logs").insert(payload);

    if (error) {
      showToast(error.message, "error");
      button.disabled = false;
      return;
    }
    showToast("服药打卡成功");
  }

  await loadData();
}

authForm.addEventListener("submit", handleSignIn);
signUpBtn.addEventListener("click", handleSignUp);
signOutBtn.addEventListener("click", handleSignOut);
refreshButton.addEventListener("click", loadData);
list.addEventListener("click", handleMedicineClick);
addButton.addEventListener("click", () => dialog.showModal());
saveButton.addEventListener("click", handleSaveMedicine);

async function init() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    setMessage(error.message, true);
    return;
  }

  const user = data.session?.user ?? null;
  switchView(user);

  if (user) {
    renderSummary();
    await ensureProfile();
    await loadData();
  }
}

init().catch((error) => {
  showToast(error.message, "error");
  if (dataState) dataState.textContent = "同步失败";
});
