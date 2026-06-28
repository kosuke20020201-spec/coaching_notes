const STORAGE_KEY = "lesson-session-os-v1";

const typeLabels = {
  gym: "ジム",
  vocal: "ボイトレ",
  cross: "横断",
};

const menuHeaders = {
  gym: ["種目", "重量", "回数", "感覚"],
  vocal: ["練習", "キー", "回数", "感覚"],
  cross: ["テーマ", "材料", "回数", "気づき"],
};

const emptyRows = {
  gym: { item: "", load: "", reps: "", feel: "" },
  vocal: { item: "", load: "", reps: "", feel: "" },
  cross: { item: "", load: "", reps: "", feel: "" },
};

const seedSessions = [
  {
    id: "seed-gym-20260628",
    type: "gym",
    title: "下半身と体幹",
    date: "2026-06-28",
    time: "16:00",
    coach: "Kato",
    location: "Ebisu",
    fatigue: 7,
    focus: 8,
    sleep: 6,
    menu: [
      { item: "Goblet squat", load: "18kg", reps: "10x3", feel: "安定" },
      { item: "Romanian deadlift", load: "32kg", reps: "8x3", feel: "張る" },
      { item: "Split squat", load: "BW", reps: "8x2", feel: "右弱" },
      { item: "Dead bug", load: "-", reps: "12x2", feel: "腹圧" },
    ],
    notes: {
      heard: "つま先よりも、足裏のどこに体重が乗っているかを見る。しゃがむ前に息を入れて体幹を固める。",
      feeling: "2セット目から右膝が内側に入りやすい。上半身を急いで起こすと腰で受けている。",
      next: "横向き動画を撮る。ウォームアップで股関節90/90、腹圧を入れたスクワットを5回。",
      link: "息を入れて支える感覚は発声の支えと近い。胸を固めすぎると声の抜けが悪くなる。",
    },
    cues: [
      "足裏は三点で押す / 親指の付け根、小指側、かかとの重さを残す。",
      "息を入れてから動く / 動作中に腹圧を抜かず、最後まで同じ硬さを保つ。",
      "動画で膝の軌道を見る / 正面より横。右脚の沈み込みが浅くならないか確認。",
      "声の支えに転用 / サビ前のブレスで同じ支点を作る。肩は上げない。",
    ],
    tags: ["腹圧", "スクワット", "動画", "姿勢"],
    attachments: ["squat-side-view.mp4"],
    updatedAt: "2026-06-28T16:52:00.000Z",
  },
  {
    id: "seed-vocal-20260626",
    type: "vocal",
    title: "高音前の息",
    date: "2026-06-26",
    time: "19:30",
    coach: "Mori",
    location: "Studio A",
    fatigue: 4,
    focus: 8,
    sleep: 7,
    menu: [
      { item: "リップロール", load: "C4-G4", reps: "5分", feel: "軽い" },
      { item: "母音連結", load: "A-E-I", reps: "BPM72", feel: "息止まる" },
      { item: "サビ前フレーズ", load: "原曲", reps: "6回", feel: "語尾弱い" },
    ],
    notes: {
      heard: "高音の直前だけで頑張らない。子音の前から息の道を作って、母音で止めない。",
      feeling: "録音で聴くと、出だしより語尾のほうが支えが抜けている。喉より首の横に力が入る。",
      next: "BPM72で「あえい」を録音。サビ前のブレス位置を譜面に書く。",
      link: "腹圧の感覚と似ているが、胸を固めすぎると響きが落ちる。",
    },
    cues: [
      "母音をつなぐ / 変わり目で息を止めない。",
      "語尾まで同じ支え / 最後だけ小さく逃がさない。",
      "肩を上げずに吸う / 首の横が固くなったらやり直す。",
    ],
    tags: ["母音", "ブレス", "録音", "ミックス"],
    attachments: ["vocal-20260626.m4a"],
    updatedAt: "2026-06-26T10:48:00.000Z",
  },
  {
    id: "seed-cross-20260616",
    type: "cross",
    title: "胸郭の動き",
    date: "2026-06-16",
    time: "21:00",
    coach: "Self review",
    location: "Home",
    fatigue: 5,
    focus: 7,
    sleep: 6,
    menu: [
      { item: "90/90呼吸", load: "床", reps: "5分", feel: "肋骨下がる" },
      { item: "発声前ブレス", load: "Aメロ", reps: "8回", feel: "肩注意" },
    ],
    notes: {
      heard: "ジムの腹圧と歌の支えは同じではないが、呼吸を先に準備する点は共通。",
      feeling: "胸を固めると腰は安定するが、声は細くなる。必要なのは固さより戻れる余白。",
      next: "発声前に90/90を1セット。スクワット前の呼吸と比べてメモする。",
      link: "身体の支えと言葉の支えを同じノートで見ると、癖が見つけやすい。",
    },
    cues: [
      "固めるより戻れること / 息を止めた安定は長く続かない。",
      "肩ではなく肋骨を見る / 吸う量より動く場所を確認。",
    ],
    tags: ["胸郭", "呼吸", "横断"],
    attachments: [],
    updatedAt: "2026-06-16T12:30:00.000Z",
  },
];

const state = {
  sessions: loadSessions(),
  activeId: null,
  filter: "all",
  search: "",
};

state.activeId = state.sessions[0]?.id ?? null;

const refs = {
  searchInput: document.getElementById("searchInput"),
  newSessionButton: document.getElementById("newSessionButton"),
  historyList: document.getElementById("historyList"),
  historyCount: document.getElementById("historyCount"),
  todayNumber: document.getElementById("todayNumber"),
  todayMonth: document.getElementById("todayMonth"),
  titleInput: document.getElementById("titleInput"),
  dateInput: document.getElementById("dateInput"),
  timeInput: document.getElementById("timeInput"),
  coachInput: document.getElementById("coachInput"),
  locationInput: document.getElementById("locationInput"),
  attachButton: document.getElementById("attachButton"),
  attachmentInput: document.getElementById("attachmentInput"),
  duplicateButton: document.getElementById("duplicateButton"),
  saveButton: document.getElementById("saveButton"),
  addMenuRowButton: document.getElementById("addMenuRowButton"),
  menuTable: document.getElementById("menuTable"),
  heardInput: document.getElementById("heardInput"),
  feelingInput: document.getElementById("feelingInput"),
  nextInput: document.getElementById("nextInput"),
  linkInput: document.getElementById("linkInput"),
  fatigueInput: document.getElementById("fatigueInput"),
  focusInput: document.getElementById("focusInput"),
  sleepInput: document.getElementById("sleepInput"),
  fatigueValue: document.getElementById("fatigueValue"),
  focusValue: document.getElementById("focusValue"),
  sleepValue: document.getElementById("sleepValue"),
  fatiguePreview: document.getElementById("fatiguePreview"),
  focusPreview: document.getElementById("focusPreview"),
  sleepPreview: document.getElementById("sleepPreview"),
  cuesInput: document.getElementById("cuesInput"),
  cueList: document.getElementById("cueList"),
  tagsInput: document.getElementById("tagsInput"),
  tagList: document.getElementById("tagList"),
  attachmentList: document.getElementById("attachmentList"),
  toast: document.getElementById("toast"),
};

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return structuredClone(seedSessions);
}

function persistSessions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.sessions));
}

function uid() {
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getActiveSession() {
  return state.sessions.find((session) => session.id === state.activeId) ?? state.sessions[0] ?? null;
}

function getVisibleSessions() {
  const query = state.search.trim().toLowerCase();
  return state.sessions
    .filter((session) => state.filter === "all" || session.type === state.filter)
    .filter((session) => {
      if (!query) return true;
      const body = [
        session.title,
        session.coach,
        session.location,
        session.notes?.heard,
        session.notes?.feeling,
        session.notes?.next,
        session.notes?.link,
        ...(session.tags ?? []),
        ...(session.cues ?? []),
      ].join(" ").toLowerCase();
      return body.includes(query);
    })
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
}

function createSession(type = "gym") {
  const now = new Date();
  const date = formatDateValue(now);
  const time = now.toTimeString().slice(0, 5);
  return {
    id: uid(),
    type,
    title: type === "vocal" ? "新しいボイトレ" : type === "cross" ? "新しい横断メモ" : "新しいジム記録",
    date,
    time,
    coach: "",
    location: "",
    fatigue: 5,
    focus: 5,
    sleep: 5,
    menu: [structuredClone(emptyRows[type])],
    notes: {
      heard: "",
      feeling: "",
      next: "",
      link: "",
    },
    cues: [],
    tags: [],
    attachments: [],
    updatedAt: new Date().toISOString(),
  };
}

function formatDateValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateValue, timeValue) {
  const [year, month, day] = (dateValue || "").split("-");
  const date = month && day ? `${Number(month)}/${Number(day)}` : "日付なし";
  return timeValue ? `${date} ${timeValue}` : date;
}

function render() {
  renderFilterTabs();
  renderHistory();
  renderEditor();
}

function renderFilterTabs() {
  document.querySelectorAll(".type-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === state.filter);
  });
}

function renderHistory() {
  const visible = getVisibleSessions();
  refs.historyCount.textContent = String(visible.length);
  refs.historyList.replaceChildren();

  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "該当する記録がありません。検索かフィルタを変えてみてください。";
    refs.historyList.append(empty);
    return;
  }

  if (!visible.some((session) => session.id === state.activeId)) {
    state.activeId = visible[0].id;
  }

  visible.forEach((session) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-item";
    button.classList.toggle("active", session.id === state.activeId);
    button.dataset.sessionId = session.id;

    const text = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = session.title || "無題の記録";
    const meta = document.createElement("span");
    meta.textContent = formatDisplayDate(session.date, session.time);
    text.append(title, meta);

    const badge = document.createElement("span");
    badge.className = `type-badge ${session.type}`;
    badge.textContent = typeLabels[session.type] ?? "記録";
    button.append(text, badge);
    refs.historyList.append(button);
  });
}

function renderEditor() {
  const session = getActiveSession();
  if (!session) return;

  refs.titleInput.value = session.title ?? "";
  refs.dateInput.value = session.date ?? "";
  refs.timeInput.value = session.time ?? "";
  refs.coachInput.value = session.coach ?? "";
  refs.locationInput.value = session.location ?? "";
  refs.heardInput.value = session.notes?.heard ?? "";
  refs.feelingInput.value = session.notes?.feeling ?? "";
  refs.nextInput.value = session.notes?.next ?? "";
  refs.linkInput.value = session.notes?.link ?? "";
  refs.fatigueInput.value = session.fatigue ?? 5;
  refs.focusInput.value = session.focus ?? 5;
  refs.sleepInput.value = session.sleep ?? 5;
  refs.cuesInput.value = (session.cues ?? []).join("\n");
  refs.tagsInput.value = (session.tags ?? []).join(", ");

  document.querySelectorAll(".session-type").forEach((button) => {
    button.classList.toggle("active", button.dataset.sessionType === session.type);
  });

  renderDatePanel(session);
  updateScoreLabels();
  renderMenuTable(session);
  renderSideLists(session);
}

function renderDatePanel(session) {
  const [year, month, day] = (session.date || "").split("-");
  refs.todayNumber.textContent = day ? String(Number(day)) : "--";
  refs.todayMonth.textContent = year && month ? `${year} / ${month}` : "日付なし";
  refs.fatiguePreview.textContent = session.fatigue ?? 5;
  refs.focusPreview.textContent = session.focus ?? 5;
  refs.sleepPreview.textContent = session.sleep ?? 5;
}

function updateScoreLabels() {
  refs.fatigueValue.textContent = refs.fatigueInput.value;
  refs.focusValue.textContent = refs.focusInput.value;
  refs.sleepValue.textContent = refs.sleepInput.value;
  refs.fatiguePreview.textContent = refs.fatigueInput.value;
  refs.focusPreview.textContent = refs.focusInput.value;
  refs.sleepPreview.textContent = refs.sleepInput.value;
}

function renderMenuTable(session) {
  const headers = menuHeaders[session.type] ?? menuHeaders.gym;
  const rows = session.menu?.length ? session.menu : [structuredClone(emptyRows[session.type])];
  session.menu = rows;
  refs.menuTable.replaceChildren();

  const headerRow = document.createElement("div");
  headerRow.className = "menu-row header";
  [...headers, ""].forEach((label) => {
    const span = document.createElement("span");
    span.textContent = label;
    headerRow.append(span);
  });
  refs.menuTable.append(headerRow);

  rows.forEach((row, index) => {
    const line = document.createElement("div");
    line.className = "menu-row";
    ["item", "load", "reps", "feel"].forEach((field, fieldIndex) => {
      const input = document.createElement("input");
      input.className = "menu-input";
      input.type = "text";
      input.value = row[field] ?? "";
      input.placeholder = headers[fieldIndex];
      input.dataset.menuIndex = String(index);
      input.dataset.menuField = field;
      line.append(input);
    });

    const remove = document.createElement("button");
    remove.className = "remove-row";
    remove.type = "button";
    remove.dataset.removeIndex = String(index);
    remove.setAttribute("aria-label", "メニュー行を削除");
    remove.innerHTML = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"></path></svg>`;
    line.append(remove);
    refs.menuTable.append(line);
  });
}

function renderSideLists(session) {
  refs.cueList.replaceChildren();
  refs.tagList.replaceChildren();
  refs.attachmentList.replaceChildren();

  const cues = getCuesFromInput();
  if (!cues.length) {
    refs.cueList.append(emptyLine("キューは1行ずつ追加できます。"));
  } else {
    cues.forEach((cue) => {
      const [title, ...rest] = cue.split("/");
      const card = document.createElement("div");
      card.className = "cue-card";
      const strong = document.createElement("strong");
      strong.textContent = title.trim();
      const span = document.createElement("span");
      span.textContent = rest.join("/").trim() || "短い合図として保存";
      card.append(strong, span);
      refs.cueList.append(card);
    });
  }

  const tags = getTagsFromInput();
  if (!tags.length) {
    refs.tagList.append(emptyLine("タグなし"));
  } else {
    tags.forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "tag-chip";
      chip.textContent = tag;
      refs.tagList.append(chip);
    });
  }

  if (!session.attachments?.length) {
    refs.attachmentList.append(emptyLine("添付なし"));
  } else {
    session.attachments.forEach((name) => {
      const item = document.createElement("span");
      item.className = "attachment-item";
      item.textContent = name;
      refs.attachmentList.append(item);
    });
  }
}

function emptyLine(text) {
  const element = document.createElement("div");
  element.className = "empty-state";
  element.textContent = text;
  return element;
}

function collectCurrentSession() {
  const session = getActiveSession();
  if (!session) return null;
  session.title = refs.titleInput.value.trim() || "無題の記録";
  session.date = refs.dateInput.value;
  session.time = refs.timeInput.value;
  session.coach = refs.coachInput.value.trim();
  session.location = refs.locationInput.value.trim();
  session.fatigue = Number(refs.fatigueInput.value);
  session.focus = Number(refs.focusInput.value);
  session.sleep = Number(refs.sleepInput.value);
  session.notes = {
    heard: refs.heardInput.value.trim(),
    feeling: refs.feelingInput.value.trim(),
    next: refs.nextInput.value.trim(),
    link: refs.linkInput.value.trim(),
  };
  session.cues = getCuesFromInput();
  session.tags = getTagsFromInput();
  session.updatedAt = new Date().toISOString();
  return session;
}

function getCuesFromInput() {
  return refs.cuesInput.value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function getTagsFromInput() {
  return refs.tagsInput.value
    .split(/[,、\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => refs.toast.classList.remove("show"), 1800);
}

document.querySelectorAll(".type-tab").forEach((button) => {
  button.addEventListener("click", () => {
    collectCurrentSession();
    state.filter = button.dataset.filter;
    render();
  });
});

document.querySelectorAll(".session-type").forEach((button) => {
  button.addEventListener("click", () => {
    const session = getActiveSession();
    if (!session) return;
    session.type = button.dataset.sessionType;
    if (!session.menu?.length) {
      session.menu = [structuredClone(emptyRows[session.type])];
    }
    renderEditor();
  });
});

refs.searchInput.addEventListener("input", () => {
  collectCurrentSession();
  state.search = refs.searchInput.value;
  renderHistory();
});

refs.historyList.addEventListener("click", (event) => {
  const item = event.target.closest(".history-item");
  if (!item) return;
  collectCurrentSession();
  state.activeId = item.dataset.sessionId;
  render();
});

refs.newSessionButton.addEventListener("click", () => {
  collectCurrentSession();
  const type = state.filter === "all" ? "gym" : state.filter;
  const session = createSession(type);
  state.sessions.unshift(session);
  state.activeId = session.id;
  persistSessions();
  render();
  showToast("新しい記録を作りました");
});

refs.saveButton.addEventListener("click", () => {
  collectCurrentSession();
  persistSessions();
  render();
  showToast("保存しました");
});

refs.duplicateButton.addEventListener("click", () => {
  const source = collectCurrentSession();
  if (!source) return;
  const duplicate = structuredClone(source);
  duplicate.id = uid();
  duplicate.title = `${source.title} コピー`;
  duplicate.updatedAt = new Date().toISOString();
  state.sessions.unshift(duplicate);
  state.activeId = duplicate.id;
  persistSessions();
  render();
  showToast("複製しました");
});

refs.attachButton.addEventListener("click", () => {
  refs.attachmentInput.click();
});

refs.attachmentInput.addEventListener("change", () => {
  const session = getActiveSession();
  if (!session) return;
  const names = [...refs.attachmentInput.files].map((file) => file.name);
  session.attachments = [...new Set([...(session.attachments ?? []), ...names])];
  refs.attachmentInput.value = "";
  persistSessions();
  renderSideLists(session);
  showToast("添付名を追加しました");
});

refs.addMenuRowButton.addEventListener("click", () => {
  const session = collectCurrentSession();
  if (!session) return;
  session.menu.push(structuredClone(emptyRows[session.type]));
  renderMenuTable(session);
});

refs.menuTable.addEventListener("input", (event) => {
  const input = event.target.closest(".menu-input");
  if (!input) return;
  const session = getActiveSession();
  const row = session?.menu?.[Number(input.dataset.menuIndex)];
  if (!row) return;
  row[input.dataset.menuField] = input.value;
});

refs.menuTable.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-index]");
  if (!button) return;
  const session = getActiveSession();
  if (!session) return;
  const index = Number(button.dataset.removeIndex);
  session.menu.splice(index, 1);
  if (!session.menu.length) {
    session.menu.push(structuredClone(emptyRows[session.type]));
  }
  renderMenuTable(session);
});

[refs.fatigueInput, refs.focusInput, refs.sleepInput].forEach((input) => {
  input.addEventListener("input", updateScoreLabels);
});

[refs.cuesInput, refs.tagsInput].forEach((input) => {
  input.addEventListener("input", () => {
    const session = getActiveSession();
    if (session) renderSideLists(session);
  });
});

window.addEventListener("beforeunload", () => {
  collectCurrentSession();
  persistSessions();
});

render();
