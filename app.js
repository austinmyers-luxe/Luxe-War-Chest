const $ = (id) => document.getElementById(id);
const fmt = (n) => Number(n).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});

function loadCfg() {
  const cfg = JSON.parse(localStorage.getItem("luxe_cfg") || "{}");
  if (cfg.goal!=null) $('goal').value = cfg.goal;
  if (cfg.reserve!=null) $('reserve').value = cfg.reserve;
  if (cfg.pctTaxes!=null) $('pctTaxes').value = cfg.pctTaxes;
  if (cfg.pctOwners!=null) $('pctOwners').value = cfg.pctOwners;
  if (cfg.pctOpEx!=null) $('pctOpEx').value = cfg.pctOpEx;
  if (cfg.pctProfit!=null) $('pctProfit').value = cfg.pctProfit;
}

function saveCfg() {
  const cfg = {
    goal: Number($('goal').value||0),
    reserve: Number($('reserve').value||0),
    pctTaxes: Number($('pctTaxes').value||0),
    pctOwners: Number($('pctOwners').value||0),
    pctOpEx: Number($('pctOpEx').value||0),
    pctProfit: Number($('pctProfit').value||0),
  };
  if (cfg.pctTaxes + cfg.pctOwners + cfg.pctOpEx + cfg.pctProfit !== 100) {
    alert("Your allocations must sum to 100%");
    return;
  }
  localStorage.setItem("luxe_cfg", JSON.stringify(cfg));
  updateProgress();
}

function loadLedger() { return JSON.parse(localStorage.getItem("luxe_ledger") || "[]"); }
function saveLedger(rows) { localStorage.setItem("luxe_ledger", JSON.stringify(rows)); }

function addRow(row) {
  const tb = document.querySelector("#ledger tbody");
  const tr = document.createElement("tr");
  ["date","job","deposit","taxes","owners","opex","profit","reserve"].forEach(k=>{
    const td = document.createElement("td");
    if (["deposit","taxes","owners","opex","profit","reserve"].includes(k)) td.className="right";
    td.textContent = (["deposit","taxes","owners","opex","profit","reserve"].includes(k)) ? "$"+fmt(row[k]) : row[k];
    tr.appendChild(td);
  });
  tb.prepend(tr);
}

function renderLedger() {
  const tb = document.querySelector("#ledger tbody");
  tb.innerHTML = "";
  const rows = loadLedger();
  rows.forEach(addRow);
}

function updateProgress() {
  const cfg = JSON.parse(localStorage.getItem("luxe_cfg") || "{}");
  const rows = loadLedger();
  let reserve = Number(cfg.reserve||0);
  if (rows.length) reserve = rows[rows.length-1].reserve;
  const goal = Number(cfg.goal||0) || 1;
  const pct = Math.min(1, reserve/goal);
  const p = document.getElementById('progress');
  const pl = document.getElementById('pctLabel');
  const rl = document.getElementById('reserveLabel');
  const gl = document.getElementById('goalLabel');
  const ms = document.getElementById('milestone');
  if (p) p.style.width = Math.round(pct*100) + "%";
  if (pl) pl.textContent = Math.round(pct*100) + "%";
  if (rl) rl.textContent = "$"+fmt(reserve);
  if (gl) gl.textContent = "$"+fmt(goal);
  let m = "Not yet";
  if (pct >= 1) m = "Level 4 (Goal Met)";
  else if (pct >= 0.75) m = "Level 3 (75%)";
  else if (pct >= 0.50) m = "Level 2 (50%)";
  else if (pct >= 0.25) m = "Level 1 (25%)";
  if (ms) ms.textContent = m;
}

function allocateDeposit() {
  const cfg = JSON.parse(localStorage.getItem("luxe_cfg") || "{}");
  const amt = Number($('depAmt').value||0);
  if (!amt || amt<=0) { alert("Enter a valid deposit amount"); return; }
  if ((cfg.pctTaxes + cfg.pctOwners + cfg.pctOpEx + cfg.pctProfit) !== 100) { alert("Your allocations must sum to 100%"); return; }
  const date = $('depDate').value || new Date().toISOString().slice(0,10);
  const job = $('depJob').value || "Job";
  const taxes = amt * cfg.pctTaxes/100;
  const owners = amt * cfg.pctOwners/100;
  const opex = amt * cfg.pctOpEx/100;
  const profit = amt * cfg.pctProfit/100;

  const rows = loadLedger();
  let lastReserve = Number(JSON.parse(localStorage.getItem("luxe_cfg")||"{}").reserve||0);
  if (rows.length) lastReserve = rows[rows.length-1].reserve;
  const newReserve = lastReserve + profit;

  const row = {date, job, deposit: amt, taxes, owners, opex, profit, reserve: newReserve};
  rows.push(row); saveLedger(rows); renderLedger(); updateProgress();

  const pct = newReserve / ((JSON.parse(localStorage.getItem("luxe_cfg")||"{}").goal)||1);
  if (pct >= 1) alert("🏆 Level 4 Unlocked! Goal Met – Reward time (without touching the $6k floor).");
  else if (pct >= 0.75) alert("🎉 Level 3 Unlocked – 75% milestone!");
  else if (pct >= 0.50) alert("🎉 Level 2 Unlocked – Halfway there!");
  else if (pct >= 0.25) alert("🎉 Level 1 Unlocked – First milestone!");
}

function resetLedger() { if (confirm("Reset ledger? This will clear all deposit history.")) { saveLedger([]); renderLedger(); updateProgress(); } }

// Backup / Restore / Export
function backupToFile() {
  const cfg = JSON.parse(localStorage.getItem("luxe_cfg") || "{}");
  const ledger = loadLedger();
  const payload = { timestamp: new Date().toISOString(), cfg, ledger, version: 2 };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0,10);
  a.href = url; a.download = `luxe_war_chest_backup_${date}.json`; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
function restoreFromFile(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data || !data.cfg || !Array.isArray(data.ledger)) throw new Error("Invalid file");
      localStorage.setItem("luxe_cfg", JSON.stringify(data.cfg));
      localStorage.setItem("luxe_ledger", JSON.stringify(data.ledger));
      loadCfg(); renderLedger(); updateProgress();
      alert("Restore complete ✔️");
    } catch (err) { alert("Restore failed: " + err.message); }
  };
  reader.readAsText(file);
}
function exportCsv() {
  const rows = loadLedger();
  const header = ["Date","Client/Job","Deposit","Taxes","Owners","OpEx","Profit","Reserve"];
  const csvRows = [header.join(",")];
  rows.forEach(r => { csvRows.push([r.date, r.job, r.deposit, r.taxes, r.owners, r.opex, r.profit, r.reserve].join(",")); });
  const blob = new Blob([csvRows.join("\n")], {type: "text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0,10);
  a.href = url; a.download = `luxe_war_chest_ledger_${date}.csv`; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function wireEvents() {
  const saveBtn = $('saveCfg'), allocBtn = $('allocBtn'), resetBtn = $('resetBtn');
  const backupBtn = $('backupBtn'), restoreBtn = $('restoreBtn'), exportBtn = $('exportCsvBtn'), restoreFile = $('restoreFile');
  if (saveBtn) saveBtn.addEventListener('click', saveCfg);
  if (allocBtn) allocBtn.addEventListener('click', allocateDeposit);
  if (resetBtn) resetBtn.addEventListener('click', resetLedger);
  if (backupBtn) backupBtn.addEventListener('click', backupToFile);
  if (restoreBtn) restoreBtn.addEventListener('click', () => restoreFile && restoreFile.click());
  if (restoreFile) restoreFile.addEventListener('change', (e) => { if (e.target.files && e.target.files[0]) restoreFromFile(e.target.files[0]); });
  if (exportBtn) exportBtn.addEventListener('click', exportCsv);
}

document.addEventListener("DOMContentLoaded", () => {
  wireEvents();
  loadCfg(); renderLedger(); updateProgress();
});
