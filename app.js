const STORAGE_KEY = "lesson-session-os-notes-v2";
const LEGACY_KEY = "lesson-session-os-v1";

const typeLabels = {
  gym: "ジム",
  vocal: "ボイトレ",
  cross: "横断",
};

const ALL_FOLDERS = "all";
const ALL_TAGS = "all";
const UNFILED_FOLDER = "未分類";

const seedNotes = [];

const state = {
  notes: loadNotes(),
  activeId: null,
  filter: "all",
  folderFilter: ALL_FOLDERS,
  tagFilter: ALL_TAGS,
  search: "",
};

state.activeId = state.notes[0]?.id ?? null;

const refs = {
  searchInput: document.getElementById("searchInput"),
  newNoteButton: document.getElementById("newNoteButton"),
  noteCount: document.getElementById("noteCount"),
  noteList: document.getElementById("noteList"),
  tagFolderList: document.getElementById("tagFolderList"),
  tagFilterList: document.getElementById("tagFilterList"),
  folderTagTitle: document.getElementById("folderTagTitle"),
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
    tags: normalizeTags(Array.isArray(item.tags) ? item.tags : []),
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
    .filter((note) => state.folderFilter === ALL_FOLDERS || note.tags.some((tag) => parseTag(tag).folder === state.folderFilter))
    .filter((note) => state.tagFilter === ALL_TAGS || note.tags.includes(state.tagFilter))
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

function getDefaultTagForCurrentFolder() {
  if (state.folderFilter === ALL_FOLDERS) return "";
  if (state.folderFilter === UNFILED_FOLDER) return "未整理";
  return `${state.folderFilter}/未整理`;
}

function render() {
  renderFilters();
  renderFolderFilters();
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

function parseTag(tag) {
  const clean = String(tag ?? "").trim();
  const slashIndex = clean.indexOf("/");
  if (slashIndex > 0 && slashIndex < clean.length - 1) {
    const folder = clean.slice(0, slashIndex).trim();
    const name = clean.slice(slashIndex + 1).trim();
    if (folder && name) {
      return { key: `${folder}/${name}`, folder, name };
    }
  }
  return { key: clean, folder: UNFILED_FOLDER, name: clean };
}

function normalizeTag(tag) {
  const parsed = parseTag(tag);
  return parsed.name ? parsed.key : "";
}

function normalizeTags(tags) {
  const normalized = tags
    .map(normalizeTag)
    .filter(Boolean);
  return [...new Set(normalized)];
}

function getFolderSourceNotes() {
  return getTagSourceNotes();
}

function getAvailableFolders() {
  const folders = new Map();
  getFolderSourceNotes().forEach((note) => {
    note.tags.forEach((tag) => {
      const parsed = parseTag(tag);
      if (!parsed.name) return;
      if (!folders.has(parsed.folder)) {
        folders.set(parsed.folder, new Set());
      }
      folders.get(parsed.folder).add(note.id);
    });
  });
  return [...folders.entries()]
    .map(([folder, ids]) => ({ folder, count: ids.size }))
    .sort((a, b) => a.folder.localeCompare(b.folder, "ja"));
}

function getAvailableTagsInFolder() {
  const tags = new Map();
  if (state.folderFilter === ALL_FOLDERS) return [];

  getTagSourceNotes().forEach((note) => {
    note.tags.forEach((tag) => {
      const parsed = parseTag(tag);
      if (parsed.folder !== state.folderFilter) return;
      if (!tags.has(parsed.key)) {
        tags.set(parsed.key, { key: parsed.key, name: parsed.name, noteIds: new Set() });
      }
      tags.get(parsed.key).noteIds.add(note.id);
    });
  });
  return [...tags.values()]
    .map((tag) => ({ key: tag.key, name: tag.name, count: tag.noteIds.size }))
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

function renderFolderFilters() {
  const folders = getAvailableFolders();
  if (state.folderFilter !== ALL_FOLDERS && !folders.some((item) => item.folder === state.folderFilter)) {
    state.folderFilter = ALL_FOLDERS;
    state.tagFilter = ALL_TAGS;
  }

  refs.tagFolderList.replaceChildren();
  refs.tagFolderList.append(createFolderButton(ALL_FOLDERS, "すべてのメモ", getFolderSourceNotes().length));

  folders.forEach(({ folder, count }) => {
    refs.tagFolderList.append(createFolderButton(folder, folder, count));
  });
}

function createFolderButton(value, label, count) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tag-folder-button";
  button.classList.toggle("active", state.folderFilter === value);
  button.dataset.folderFilter = value;

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

function renderTagFilters() {
  const tags = getAvailableTagsInFolder();
  if (state.tagFilter !== ALL_TAGS && !tags.some((tag) => tag.key === state.tagFilter)) {
    state.tagFilter = ALL_TAGS;
  }

  refs.tagFilterList.replaceChildren();
  if (state.folderFilter === ALL_FOLDERS) {
    refs.folderTagTitle.textContent = "フォルダを選ぶと中のタグが出ます";
    const empty = document.createElement("div");
    empty.className = "folder-tag-empty";
    empty.textContent = "タグを全部並べず、フォルダを開いた時だけ表示します。";
    refs.tagFilterList.append(empty);
    return;
  }

  refs.folderTagTitle.textContent = `${state.folderFilter} のタグ`;
  refs.tagFilterList.append(createTagButton(ALL_TAGS, "フォルダ全体", getVisibleNotesForFolderOnly().length));

  tags.forEach(({ key, name, count }) => {
    refs.tagFilterList.append(createTagButton(key, name, count));
  });
}

function getVisibleNotesForFolderOnly() {
  const currentTag = state.tagFilter;
  state.tagFilter = ALL_TAGS;
  const notes = getVisibleNotes();
  state.tagFilter = currentTag;
  return notes;
}

function createTagButton(value, label, count) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "folder-tag-button";
  button.classList.toggle("active", state.tagFilter === value);
  button.dataset.tagFilter = value;
  button.textContent = `${label} (${count})`;
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
    .map(normalizeTag)
    .filter(Boolean);
  note.tags = [...new Set(note.tags)];
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
    state.folderFilter = ALL_FOLDERS;
    state.tagFilter = ALL_TAGS;
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
  renderFolderFilters();
  renderTagFilters();
  renderList();
});

refs.tagFolderList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-folder-filter]");
  if (!button) return;
  collectCurrentNote();
  state.folderFilter = button.dataset.folderFilter;
  state.tagFilter = ALL_TAGS;
  render();
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
  if (state.tagFilter !== ALL_TAGS) {
    note.tags = [state.tagFilter];
  } else {
    const defaultTag = getDefaultTagForCurrentFolder();
    if (defaultTag) note.tags = [defaultTag];
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
    renderFolderFilters();
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
    navigator.serviceWorker.register("./sw.js?v=20260704-tag-groups").then((registration) => {
      registration.update();
    }).catch(() => {});
  });
}

render();
