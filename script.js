
"use strict";

const RUNS_KEY = "runways_runs_v8";
const MEDALS_KEY = "runways_medals_v3";

const LEVELS = [
  { name: "Beginner", km: 0, description: "Every legend starts somewhere." },
  { name: "Amateur", km: 30, description: "You're building a running habit." },
  { name: "Advanced", km: 50, description: "Your consistency is taking shape." },
  { name: "Runner", km: 100, description: "You're becoming a committed runner." },
  { name: "Athlete", km: 150, description: "Strong habits create strong progress." },
  { name: "Pro Runner", km: 250, description: "You're putting in serious miles." },
  { name: "Elite Runner", km: 500, description: "Your dedication stands out." },
  { name: "Master Runner", km: 750, description: "A remarkable running journey." },
  { name: "Legend Runner", km: 1000, description: "You've reached legendary distance." },
  { name: "Ultra Legend", km: 2000, description: "Thousands of kilometers, one step at a time." },
  { name: "Running Icon", km: 5000, description: "An extraordinary long-term achievement." },
  { name: "Road Legend", km: 10000, description: "The road knows your dedication." }
];

const $ = id => document.getElementById(id);
let toastTimer;

function load(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.error("Could not read RUNWAYS data:", error);
    return [];
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Could not save RUNWAYS data:", error);
    toast("Could not save data. Check your browser storage settings.");
    return false;
  }
}

function toast(message) {
  const element = $("toast");
  if (!element) return;

  element.textContent = message;
  element.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("show"), 2600);
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function today() {
  const date = new Date();

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDistance(value) {
  return (Math.round((Number(value) + Number.EPSILON) * 100) / 100).toFixed(2);
}

function formatDate(value) {
  if (!value) return "No date";

  const date = new Date(`${value}T12:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
}

function formatDuration(seconds) {
  seconds = Math.round(Number(seconds) || 0);

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;

  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
    : `${minutes}:${String(remaining).padStart(2, "0")}`;
}

// Accepts minutes, MM:SS, or HH:MM:SS.
function parseDuration(raw) {
  const value = String(raw || "").trim();

  if (/^\d+(\.\d+)?$/.test(value)) {
    const seconds = Math.round(Number(value) * 60);
    return seconds > 0 && Number.isFinite(seconds) ? seconds : null;
  }

  const parts = value.split(":");

  if (parts.length !== 2 && parts.length !== 3) return null;
  if (!parts.every(part => /^\d+$/.test(part))) return null;

  const nums = parts.map(Number);

  if (parts.length === 2) {
    if (nums[1] > 59) return null;

    const seconds = nums[0] * 60 + nums[1];
    return seconds > 0 ? seconds : null;
  }

  if (nums[1] > 59 || nums[2] > 59) return null;

  const seconds = nums[0] * 3600 + nums[1] * 60 + nums[2];
  return seconds > 0 ? seconds : null;
}

function formatPace(secondsPerKm) {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return "—";

  const total = Math.round(secondsPerKm);

  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function getRuns() {
  return load(RUNS_KEY).filter(run =>
    run &&
    typeof run.id === "string" &&
    Number.isFinite(Number(run.distance)) &&
    Number(run.distance) > 0 &&
    Number.isFinite(Number(run.durationSeconds)) &&
    Number(run.durationSeconds) > 0
  );
}

function getMedals() {
  return load(MEDALS_KEY).filter(medal =>
    medal && typeof medal.id === "string"
  );
}

// RUNNER LEVELS
function renderLevel(totalDistance) {
  let currentIndex = 0;

  LEVELS.forEach((level, index) => {
    if (totalDistance >= level.km) currentIndex = index;
  });

  const current = LEVELS[currentIndex];
  const next = LEVELS[currentIndex + 1];

  const progress = next
    ? Math.max(0, Math.min(100,
        ((totalDistance - current.km) / (next.km - current.km)) * 100
      ))
    : 100;

  if ($("currentLevel")) $("currentLevel").textContent = current.name;

  if ($("levelNumber")) {
    $("levelNumber").textContent =
      `LEVEL ${String(currentIndex + 1).padStart(2, "0")}`;
  }

  if ($("levelDescription")) {
    $("levelDescription").textContent = current.description;
  }

  if ($("levelTotalDistance")) {
    $("levelTotalDistance").textContent =
      `${formatDistance(totalDistance)} km`;
  }

  if ($("nextLevelName")) {
    $("nextLevelName").textContent = next ? next.name : "Max level";
  }

  if ($("levelProgressBar")) {
    $("levelProgressBar").style.width = `${progress}%`;
  }

  const progressContainer =
    document.querySelector('[aria-label="Progress to next level"]');

  if (progressContainer) {
    progressContainer.setAttribute(
      "aria-valuenow",
      String(Math.round(progress))
    );
  }

  if ($("levelProgressText")) {
    $("levelProgressText").textContent = next
      ? `${Math.floor(progress)}% to next level`
      : "Highest listed level reached";
  }

  if ($("levelRemaining")) {
    $("levelRemaining").textContent = next
      ? `${formatDistance(next.km - totalDistance)} km to go`
      : "Top level reached";
  }

  if ($("levelMilestoneText")) {
    $("levelMilestoneText").textContent = next
      ? `${next.km.toLocaleString("en-US")} km total unlocks ${next.name}.`
      : "You've reached the highest listed level!";
  }
}

// RUN DASHBOARD
function renderRuns() {
  const runs = getRuns();

  const totalDistance = runs.reduce(
    (sum, run) => sum + Number(run.distance), 0
  );

  const totalSeconds = runs.reduce(
    (sum, run) => sum + Number(run.durationSeconds), 0
  );

  const longest = runs.reduce(
    (best, run) =>
      !best || Number(run.distance) > Number(best.distance) ? run : best,
    null
  );

  if ($("heroDistance")) {
    $("heroDistance").textContent = formatDistance(totalDistance);
  }

  if ($("totalDistance")) {
    $("totalDistance").textContent = formatDistance(totalDistance);
  }

  if ($("totalRuns")) {
    $("totalRuns").textContent = String(runs.length);
  }

  if ($("averagePace")) {
    $("averagePace").textContent = totalDistance
      ? formatPace(totalSeconds / totalDistance)
      : "—";
  }

  if ($("bestDistance")) {
    $("bestDistance").textContent = longest
      ? formatDistance(longest.distance)
      : "0.00";
  }

  renderLevel(totalDistance);
  renderRunHistory(runs);
}

function renderRunHistory(runs) {
  const list = $("runHistory");
  if (!list) return;

  const sorted = [...runs].sort((a, b) =>
    String(b.date).localeCompare(String(a.date)) ||
    Number(b.createdAt || 0) - Number(a.createdAt || 0)
  );

  $("historyCount").textContent =
    `${sorted.length} ${sorted.length === 1 ? "ACTIVITY" : "ACTIVITIES"}`;

  if (!sorted.length) {
    list.innerHTML =
      '<div class="empty">No runs yet. Log your first activity to get started.</div>';
    return;
  }

  list.innerHTML = sorted.map(run => `
    <article class="history-item">
      <div class="item-mark" aria-hidden="true">↗</div>
      <div class="item-main">
        <strong>${safe(run.notes || "Running session")}</strong>
        <span>${formatDate(run.date)} · ${formatDuration(run.durationSeconds)} · ${formatPace(run.durationSeconds / run.distance)} /km</span>
      </div>
      <div class="item-right">
        <strong>${formatDistance(run.distance)} km</strong>
        <div class="item-actions">
          <button class="small-button" data-edit-run="${safe(run.id)}" type="button">Edit</button>
          <button class="small-button danger" data-delete-run="${safe(run.id)}" type="button">Delete</button>
        </div>
      </div>
    </article>
  `).join("");
}

function resetRunForm() {
  if (!$("runForm")) return;

  $("runForm").reset();
  $("runId").value = "";
  $("runDate").value = today();
  $("runTitle").innerHTML = 'Log a run<span class="accent">.</span>';
  $("saveRun").innerHTML = 'Save activity <span aria-hidden="true">+</span>';
  $("cancelRun").classList.add("hidden");
  $("runMessage").textContent = "";
}

function initRuns() {
  if (!$("runForm")) return;

  $("runDate").value = today();

  $("runForm").addEventListener("submit", event => {
    event.preventDefault();

    const distance = Number($("runDistance").value);
    const durationSeconds = parseDuration($("runDuration").value);
    const date = $("runDate").value;
    const notes = $("runNotes").value.trim();
    const editingId = $("runId").value;
    const message = $("runMessage");

    if (!Number.isFinite(distance) || distance <= 0 || distance > 1000) {
      message.textContent =
        "Distance must be greater than 0 and no more than 1,000 km.";
      return;
    }

    if (!durationSeconds) {
      message.textContent =
        "Invalid duration. Try 32.5, 32:15, or 1:02:15.";
      return;
    }

    if (!date || date > today()) {
      message.textContent =
        "Choose a valid date that is not in the future.";
      return;
    }

    const runs = getRuns();

    if (editingId) {
      const index = runs.findIndex(run => run.id === editingId);

      if (index < 0) {
        message.textContent =
          "That activity could not be found. Refresh and try again.";
        return;
      }

      runs[index] = {
        ...runs[index],
        distance,
        durationSeconds,
        date,
        notes
      };
    } else {
      runs.push({
        id: makeId(),
        distance,
        durationSeconds,
        date,
        notes,
        createdAt: Date.now()
      });
    }

    if (!save(RUNS_KEY, runs)) return;

    resetRunForm();
    renderRuns();
    toast(editingId ? "Activity updated." : "Activity saved.");
  });

  $("cancelRun").addEventListener("click", resetRunForm);

  $("runHistory").addEventListener("click", event => {
    const editButton = event.target.closest("[data-edit-run]");
    const deleteButton = event.target.closest("[data-delete-run]");

    if (editButton) {
      const run = getRuns().find(
        item => item.id === editButton.dataset.editRun
      );

      if (!run) return toast("Activity not found.");

      $("runId").value = run.id;
      $("runDistance").value = run.distance;
      $("runDuration").value = formatDuration(run.durationSeconds);
      $("runDate").value = run.date;
      $("runNotes").value = run.notes || "";

      $("runTitle").innerHTML = 'Edit a run<span class="accent">.</span>';
      $("saveRun").innerHTML =
        'Update activity <span aria-hidden="true">✓</span>';

      $("cancelRun").classList.remove("hidden");
      $("runMessage").textContent =
        "Edit the details and select Update activity.";

      $("runForm").scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      $("runDistance").focus();
    }

    if (deleteButton) {
      const run = getRuns().find(
        item => item.id === deleteButton.dataset.deleteRun
      );

      if (!run) return toast("Activity not found.");

      if (!confirm(`Delete this ${formatDistance(run.distance)} km activity?`)) {
        return;
      }

      if (save(RUNS_KEY, getRuns().filter(item => item.id !== run.id))) {
        renderRuns();
        toast("Activity deleted.");
      }
    }
  });

  $("clearRuns").addEventListener("click", () => {
    const runs = getRuns();

    if (!runs.length) {
      return toast("There are no activities to clear.");
    }

    if (!confirm(`Delete all ${runs.length} activities? This cannot be undone.`)) {
      return;
    }

    if (save(RUNS_KEY, [])) {
      resetRunForm();
      renderRuns();
      toast("All activities cleared.");
    }
  });

  renderRuns();
}

// MEDAL TRACKER
function renderMedals() {
  const list = $("medalList");
  if (!list) return;

  const medals = getMedals().sort((a, b) =>
    String(b.date).localeCompare(String(a.date)) ||
    Number(b.createdAt || 0) - Number(a.createdAt || 0)
  );

  const received = medals.filter(medal => medal.received).length;
  const progress = Math.min(100, received / 10 * 100);

  $("receivedMedalCount").textContent = String(received);
  $("medalProgressBar").style.width = `${progress}%`;

  const progressContainer =
    document.querySelector('[aria-label="Medals received"]');

  if (progressContainer) {
    progressContainer.setAttribute("aria-valuenow", String(received));
  }

  $("medalProgressText").textContent = `${progress}% completed`;

  $("medalRemaining").textContent = received >= 10
    ? "Goal achieved — 10 medals received!"
    : `${10 - received} more to reach your goal`;

  $("medalListCount").textContent =
    `${medals.length} ${medals.length === 1 ? "ITEM" : "ITEMS"}`;

  $("rewardStatus").textContent = `${received} / 10 medals received`;

  if (!medals.length) {
    list.innerHTML =
      '<div class="empty">No medals added yet. Add your first medal to begin your collection.</div>';
    return;
  }

  list.innerHTML = medals.map(medal => `
    <article class="history-item">
      <div class="item-mark" aria-hidden="true">${medal.received ? "✓" : "M"}</div>
      <div class="item-main">
        <strong>${safe(medal.name)}</strong>
        <span>${safe(medal.distance)} · ${formatDate(medal.date)}</span>
        <span>${medal.received ? "✓ RECEIVED" : "NOT RECEIVED YET"}</span>
      </div>
      <div class="item-actions">
        <button class="small-button" data-toggle-medal="${safe(medal.id)}" type="button">${medal.received ? "Undo" : "Received"}</button>
        <button class="small-button" data-edit-medal="${safe(medal.id)}" type="button">Edit</button>
        <button class="small-button danger" data-delete-medal="${safe(medal.id)}" type="button">Delete</button>
      </div>
    </article>
  `).join("");
}

function resetMedalForm() {
  $("medalForm").reset();
  $("medalId").value = "";
  $("medalDate").value = today();
  $("medalFormTitle").innerHTML = 'Add a medal<span class="accent">.</span>';
  $("saveMedal").innerHTML = 'Save medal <span aria-hidden="true">+</span>';
  $("cancelMedal").classList.add("hidden");
  $("medalMessage").textContent = "";
}

function initMedals() {
  if (!$("medalForm")) return;

  $("medalDate").value = today();

  $("medalForm").addEventListener("submit", event => {
    event.preventDefault();

    const name = $("medalName").value.trim();
    const distance = $("medalDistance").value;
    const date = $("medalDate").value;
    const received = $("medalReceived").checked;
    const editingId = $("medalId").value;
    const message = $("medalMessage");

    if (!name || !distance || !date) {
      message.textContent = "Please complete all medal fields.";
      return;
    }

    if (date > today()) {
      message.textContent = "The event date cannot be in the future.";
      return;
    }

    const medals = getMedals();

    if (editingId) {
      const index = medals.findIndex(medal => medal.id === editingId);

      if (index < 0) {
        message.textContent =
          "That medal could not be found. Refresh and try again.";
        return;
      }

      medals[index] = {
        ...medals[index],
        name,
        distance,
        date,
        received
      };
    } else {
      medals.push({
        id: makeId(),
        name,
        distance,
        date,
        received,
        createdAt: Date.now()
      });
    }

    if (!save(MEDALS_KEY, medals)) return;

    resetMedalForm();
    renderMedals();
    toast(editingId ? "Medal updated." : "Medal added.");
  });

  $("cancelMedal").addEventListener("click", resetMedalForm);

  $("medalList").addEventListener("click", event => {
    const toggle = event.target.closest("[data-toggle-medal]");
    const edit = event.target.closest("[data-edit-medal]");
    const del = event.target.closest("[data-delete-medal]");
    const medals = getMedals();

    if (toggle) {
      const medal = medals.find(
        item => item.id === toggle.dataset.toggleMedal
      );

      if (!medal) return toast("Medal not found.");

      medal.received = !medal.received;

      if (save(MEDALS_KEY, medals)) {
        renderMedals();
        toast(
          medal.received
            ? "Medal marked as received."
            : "Medal status changed to not received."
        );
      }
    }

    if (edit) {
      const medal = medals.find(
        item => item.id === edit.dataset.editMedal
      );

      if (!medal) return toast("Medal not found.");

      $("medalId").value = medal.id;
      $("medalName").value = medal.name;
      $("medalDistance").value = medal.distance;
      $("medalDate").value = medal.date;
      $("medalReceived").checked = Boolean(medal.received);

      $("medalFormTitle").innerHTML =
        'Edit medal<span class="accent">.</span>';

      $("saveMedal").innerHTML =
        'Update medal <span aria-hidden="true">✓</span>';

      $("cancelMedal").classList.remove("hidden");
      $("medalMessage").textContent =
        "Edit the details and select Update medal.";

      $("medalForm").scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      $("medalName").focus();
    }

    if (del) {
      const medal = medals.find(
        item => item.id === del.dataset.deleteMedal
      );

      if (!medal) return toast("Medal not found.");

      if (!confirm(`Delete the medal "${medal.name}"?`)) return;

      if (save(MEDALS_KEY, medals.filter(item => item.id !== medal.id))) {
        if ($("medalId").value === medal.id) resetMedalForm();

        renderMedals();
        toast("Medal deleted.");
      }
    }
  });

  $("unlockReward").addEventListener("click", () => {
    const received = getMedals().filter(medal => medal.received).length;

    toast(
      received >= 10
        ? "Goal reached! Your PUMA shoes remain a personal reward goal."
        : `Reward progress: ${received}/10 medals. ${10 - received} more to go!`
    );
  });

  renderMedals();
}

function init() {
  initRuns();
  initMedals();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
