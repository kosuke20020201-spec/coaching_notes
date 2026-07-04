const STORAGE_KEY = "lesson-session-os-notes-v2";
const LEGACY_KEY = "lesson-session-os-v1";

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
  tagFilter: "all",
  search: "",
};

state.activeId = state.notes[0]?.id ?? null;

const refs = {
  searchInput: document.getElementById("searchInput"),
  newNoteButton: document.getElementById("newNoteButton"),
  noteCount: document.getElementById("noteCount"),
  noteList: document.getElementById("noteList"),
  tagFilterList: document.getElementById("tagFilterList"),
  dateInput: document.getElementById("dateInput"),
  titleInput: document.getElementById("titleInput"),
  bodyInput: document.getElementById("bodyInput"),
  tagsInput: document.getElementById("tagsInput"),
  deleteButton: document.getElementById("deleteButton"),
  saveButton: document.getElementById("saveButton"),
  updatedText: document.getElementById("updatedText"),
  deleteDialog: document.getElementById("deleteDialog"),
  deleteDialogText: document.getElementById("deleteDialogText"),
  cancelDeleteButton: document.getElementById("cancelDeleteButton"),
  confirmDeleteButton: document.getElementById("confirmDeleteButton"),
  toast: document.getElementById("toast"),
};

function loadNotes() {
  const stored = readStoredNotes(STORAGE_KEY) ?? readStoredNotes(LEGACY_KEY);
  if (stored?.length) {
    return stored.map(normalizeNote);
  }
  return structuredClone(seedNotes);
}

function readStoredNotes(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
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
  return state.notes.find((note) => note.id === state.activeId) ?? null;
}

function getVisibleNotes() {
  const query = state.search.trim().toLowerCase();
  return state.notes
    .filter((note) => state.filter === "all" || note.type === state.filter)
    .filter((note) => state.tagFilter === "all" || note.tags.includes(state.tagFilter))
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
  renderTagFilters();
  renderList();
  renderEditor();
}

function renderFilters() {
  document.querySelectorAll(".type-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === state.filter);
  });
}

function getTagSourceNotes() {
  const query = state.search.trim().toLowerCase();
  return state.notes
    .filter((note) => state.filter === "all" || note.type === state.filter)
    .filter((note) => {
      if (!query) return true;
      return [note.title, note.body, ...(note.tags ?? [])].join(" ").toLowerCase().includes(query);
    });
}

function getAvailableTags() {
  const tags = new Set();
  getTagSourceNotes().forEach((note) => {
    note.tags.forEach((tag) => tags.add(tag));
  });
  return [...tags].sort((a, b) => a.localeCompare(b, "ja"));
}

function renderTagFilters() {
  const tags = getAvailableTags();
  if (state.tagFilter !== "all" && !tags.includes(state.tagFilter)) {
    state.tagFilter = "all";
  }

  refs.tagFilterList.replaceChildren();
  const allButton = createTagFilterButton("all", "すべてのメモ", getTagSourceNotes().length);
  refs.tagFilterList.append(allButton);

  tags.forEach((tag) => {
    const count = getTagSourceNotes().filter((note) => note.tags.includes(tag)).length;
    refs.tagFilterList.append(createTagFilterButton(tag, tag, count));
  });
}

function createTagFilterButton(value, label, count) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tag-folder-button";
  button.classList.toggle("active", state.tagFilter === value);
  button.dataset.tagFilter = value;

  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("class", "folder-icon");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z");
  icon.append(path);

  const name = document.createElement("span");
  name.className = "folder-name";
  name.textContent = label;

  const countLabel = document.createElement("span");
  countLabel.className = "folder-count";
  countLabel.textContent = String(count);

  button.append(icon, name, countLabel);
  return button;
}

function renderList() {
  const visible = getVisibleNotes();
  refs.noteCount.textContent = String(visible.length);
  refs.noteList.replaceChildren();

  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = state.notes.length
      ? "該当するメモがありません。検索かフィルタを変えてみてください。"
      : "メモがありません。新規メモから追加できます。";
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
  const hasNote = Boolean(note);
  setEditorDisabled(!hasNote);

  if (!note) {
    refs.dateInput.value = "";
    refs.titleInput.value = "";
    refs.bodyInput.value = "";
    refs.tagsInput.value = "";
    refs.updatedText.textContent = "メモがありません";
    document.querySelectorAll(".type-choice").forEach((button) => button.classList.remove("active"));
    return;
  }

  refs.dateInput.value = note.date ?? todayValue();
  refs.titleInput.value = note.title ?? "";
  refs.bodyInput.value = note.body ?? "";
  refs.tagsInput.value = (note.tags ?? []).join(", ");
  refs.updatedText.textContent = `最終更新: ${formatUpdated(note.updatedAt)}`;

  document.querySelectorAll(".type-choice").forEach((button) => {
    button.classList.toggle("active", button.dataset.noteType === note.type);
  });
}

function setEditorDisabled(disabled) {
  [
    refs.dateInput,
    refs.titleInput,
    refs.bodyInput,
    refs.tagsInput,
    refs.deleteButton,
    refs.saveButton,
    ...document.querySelectorAll(".type-choice"),
  ].forEach((element) => {
    element.disabled = disabled;
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

function openDeleteDialog() {
  const note = getActiveNote();
  if (!note) return;
  const label = note.title || "無題のメモ";
  refs.deleteDialogText.textContent = `「${label}」を削除します。この操作は元に戻せません。`;
  refs.deleteDialog.classList.add("show");
  refs.deleteDialog.setAttribute("aria-hidden", "false");
  refs.confirmDeleteButton.focus();
}

function closeDeleteDialog() {
  refs.deleteDialog.classList.remove("show");
  refs.deleteDialog.setAttribute("aria-hidden", "true");
  refs.deleteButton.focus();
}

function deleteActiveNote() {
  const note = getActiveNote();
  if (!note) return;
  state.notes = state.notes.filter((item) => item.id !== note.id);
  const nextVisible = getVisibleNotes()[0] ?? state.notes[0] ?? null;
  state.activeId = nextVisible?.id ?? null;
  persistNotes();
  closeDeleteDialog();
  render();
  showToast("削除しました");
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
    state.tagFilter = "all";
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
  renderTagFilters();
  renderList();
});

refs.tagFilterList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tag-filter]");
  if (!button) return;
  collectCurrentNote();
  state.tagFilter = button.dataset.tagFilter;
  render();
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
  if (state.tagFilter !== "all") {
    note.tags = [state.tagFilter];
  }
  state.notes.unshift(note);
  state.activeId = note.id;
  persistNotes();
  render();
  refs.titleInput.focus();
  showToast("新しいメモを作りました");
});

refs.saveButton.addEventListener("click", () => saveAndRender());
refs.deleteButton.addEventListener("click", openDeleteDialog);
refs.cancelDeleteButton.addEventListener("click", closeDeleteDialog);
refs.confirmDeleteButton.addEventListener("click", deleteActiveNote);
refs.deleteDialog.addEventListener("click", (event) => {
  if (event.target === refs.deleteDialog) closeDeleteDialog();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && refs.deleteDialog.classList.contains("show")) {
    closeDeleteDialog();
  }
});

[refs.dateInput, refs.titleInput, refs.bodyInput, refs.tagsInput].forEach((input) => {
  input.addEventListener("change", () => {
    collectCurrentNote();
    persistNotes();
    renderTagFilters();
    renderList();
  });
});

window.addEventListener("beforeunload", () => {
  collectCurrentNote();
  persistNotes();
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js?v=20260704-tag-filter").then((registration) => {
      registration.update();
    }).catch(() => {});
  });
}

render();
