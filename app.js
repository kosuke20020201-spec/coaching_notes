const STORAGE_KEY = "lesson-session-os-v1";

const typeLabels = {
  gym: "ジム",
  vocal: "ボイトレ",
  cross: "横断",
};

const seedNotes = [
  {
    id: "note-gym-20260628",
    type: "gym",
    title: "下半身と体幹",
    date: "2026-06-28",
    body: "スクワットはしゃがむ前に息を入れる。足裏三点で押す。右膝が内側に入りやすいから、次回は横から動画を撮る。",
    tags: ["腹圧", "スクワット", "動画"],
    updatedAt: "2026-06-28T07:52:00.000Z",
  },
  {
    id: "note-vocal-20260626",
    type: "vocal",
    title: "高音前の息",
    date: "2026-06-26",
    body: "高音の直前だけで頑張らない。子音の前から息を準備して、母音に変わる瞬間で止めない。語尾まで支える。",
    tags: ["母音", "ブレス", "録音"],
    updatedAt: "2026-06-26T10:48:00.000Z",
  },
  {
    id: "note-cross-20260616",
    type: "cross",
    title: "胸郭の動き",
    date: "2026-06-16",
    body: "ジムの腹圧と歌の支えは似ているけど、胸を固めすぎると声は抜けない。固めるより、戻れる余白を残す。",
    tags: ["胸郭", "呼吸", "支え"],
    updatedAt: "2026-06-16T12:30:00.000Z",
  },
];

const state = {
  notes: loadNotes(),
  activeId: null,
  filter: "all",
  search: "",
};

state.activeId = state.notes[0]?.id ?? null;

const refs = {
  searchInput: document.getElementById("searchInput"),
  newNoteButton: document.getElementById("newNoteButton"),
  noteCount: document.getElementById("noteCount"),
  noteList: document.getElementById("noteList"),
  dateInput: document.getElementById("dateInput"),
  titleInput: document.getElementById("titleInput"),
  bodyInput: document.getElementById("bodyInput"),
  tagsInput: document.getElementById("tagsInput"),
  saveButton: document.getElementById("saveButton"),
  updatedText: document.getElementById("updatedText"),
  toast: document.getElementById("toast"),
};

function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(normalizeNote);
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return structuredClone(seedNotes);
}

function normalizeNote(item) {
  const notes = item.notes ?? {};
  const body = item.body || [
    notes.heard,
    notes.feeling,
    notes.next,
    notes.link,
    ...(item.cues ?? []),
  ].filter(Boolean).join("\n");

  return {
    id: item.id || uid(),
    type: item.type && typeLabels[item.type] ? item.type : "gym",
    title: item.title || "無題のメモ",
    date: item.date || todayValue(),
    body,
    tags: Array.isArray(item.tags) ? item.tags : [],
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
}

function persistNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notes));
}

function uid() {
  return `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getActiveNote() {
  return state.notes.find((note) => note.id === state.activeId) ?? state.notes[0] ?? null;
}

function getVisibleNotes() {
  const query = state.search.trim().toLowerCase();
  return state.notes
    .filter((note) => state.filter === "all" || note.type === state.filter)
    .filter((note) => {
      if (!query) return true;
      return [note.title, note.body, ...(note.tags ?? [])].join(" ").toLowerCase().includes(query);
    })
    .sort((a, b) => `${b.date} ${b.updatedAt}`.localeCompare(`${a.date} ${a.updatedAt}`));
}

function createNote(type = "gym") {
  return {
    id: uid(),
    type,
    title: "",
    date: todayValue(),
    body: "",
    tags: [],
    updatedAt: new Date().toISOString(),
  };
}

function render() {
  renderFilters();
  renderList();
  renderEditor();
}

function renderFilters() {
  document.querySelectorAll(".type-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === state.filter);
  });
}

function renderList() {
  const visible = getVisibleNotes();
  refs.noteCount.textContent = String(visible.length);
  refs.noteList.replaceChildren();

  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "メモがありません。新規メモから追加できます。";
    refs.noteList.append(empty);
    return;
  }

  if (!visible.some((note) => note.id === state.activeId)) {
    state.activeId = visible[0].id;
  }

  visible.forEach((note) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "note-item";
    button.classList.toggle("active", note.id === state.activeId);
    button.dataset.noteId = note.id;

    const top = document.createElement("div");
    top.className = "note-item-top";
    const title = document.createElement("strong");
    title.textContent = note.title || "無題のメモ";
    const date = document.createElement("time");
    date.textContent = formatDate(note.date);
    top.append(title, date);

    const preview = document.createElement("p");
    preview.textContent = note.body || "まだ本文がありません。";

    const badgeRow = document.createElement("div");
    badgeRow.className = "badge-row";
    const badge = document.createElement("span");
    badge.className = `badge ${note.type}`;
    badge.textContent = typeLabels[note.type] ?? "メモ";
    badgeRow.append(badge);
    note.tags.slice(0, 2).forEach((tag) => {
      const tagBadge = document.createElement("span");
      tagBadge.className = "badge";
      tagBadge.textContent = tag;
      badgeRow.append(tagBadge);
    });

    button.append(top, preview, badgeRow);
    refs.noteList.append(button);
  });
}

function renderEditor() {
  const note = getActiveNote();
  if (!note) return;

  refs.dateInput.value = note.date ?? todayValue();
  refs.titleInput.value = note.title ?? "";
  refs.bodyInput.value = note.body ?? "";
  refs.tagsInput.value = (note.tags ?? []).join(", ");
  refs.updatedText.textContent = `最終更新: ${formatUpdated(note.updatedAt)}`;

  document.querySelectorAll(".type-choice").forEach((button) => {
    button.classList.toggle("active", button.dataset.noteType === note.type);
  });
}

function collectCurrentNote() {
  const note = getActiveNote();
  if (!note) return null;
  note.date = refs.dateInput.value || todayValue();
  note.title = refs.titleInput.value.trim();
  note.body = refs.bodyInput.value.trim();
  note.tags = refs.tagsInput.value
    .split(/[,、\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  note.updatedAt = new Date().toISOString();
  return note;
}

function formatDate(value) {
  const [year, month, day] = (value || "").split("-");
  if (!month || !day) return "日付なし";
  return `${Number(month)}/${Number(day)}`;
}

function formatUpdated(value) {
  if (!value) return "未保存";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未保存";
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function saveAndRender(message = "保存しました") {
  collectCurrentNote();
  persistNotes();
  render();
  showToast(message);
}

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => refs.toast.classList.remove("show"), 1500);
}

document.querySelectorAll(".type-tab").forEach((button) => {
  button.addEventListener("click", () => {
    collectCurrentNote();
    state.filter = button.dataset.filter;
    render();
  });
});

document.querySelectorAll(".type-choice").forEach((button) => {
  button.addEventListener("click", () => {
    const note = getActiveNote();
    if (!note) return;
    note.type = button.dataset.noteType;
    render();
  });
});

refs.searchInput.addEventListener("input", () => {
  collectCurrentNote();
  state.search = refs.searchInput.value;
  renderList();
});

refs.noteList.addEventListener("click", (event) => {
  const item = event.target.closest(".note-item");
  if (!item) return;
  collectCurrentNote();
  state.activeId = item.dataset.noteId;
  render();
});

refs.newNoteButton.addEventListener("click", () => {
  collectCurrentNote();
  const type = state.filter === "all" ? "gym" : state.filter;
  const note = createNote(type);
  state.notes.unshift(note);
  state.activeId = note.id;
  persistNotes();
  render();
  refs.titleInput.focus();
  showToast("新しいメモを作りました");
});

refs.saveButton.addEventListener("click", () => saveAndRender());

[refs.dateInput, refs.titleInput, refs.bodyInput, refs.tagsInput].forEach((input) => {
  input.addEventListener("change", () => {
    collectCurrentNote();
    persistNotes();
    renderList();
  });
});

window.addEventListener("beforeunload", () => {
  collectCurrentNote();
  persistNotes();
});

render();
