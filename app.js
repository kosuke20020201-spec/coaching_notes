const STORAGE_KEY = "lesson-session-os-notes-v2";
const LEGACY_KEY = "lesson-session-os-v1";
const FOLDER_STORAGE_KEY = "lesson-session-os-tag-folders-v1";

const typeLabels = {
  gym: "ジム",
  vocal: "ボイトレ",
  cross: "横断",
};

const ALL_FOLDERS = "all";
const ALL_TAGS = "all";
const UNASSIGNED_FOLDER = "unassigned";
const UNASSIGNED_FOLDER_LABEL = "未分類";

const seedNotes = [];

const state = {
  notes: loadNotes(),
  folders: loadFolders(),
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
  addFolderButton: document.getElementById("addFolderButton"),
  folderEditor: document.getElementById("folderEditor"),
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

function loadFolders() {
  try {
    const raw = localStorage.getItem(FOLDER_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeFolder).filter(Boolean);
  } catch {
    localStorage.removeItem(FOLDER_STORAGE_KEY);
    return [];
  }
}

function normalizeFolder(item) {
  const name = String(item?.name ?? "").trim();
  const type = item?.type === "all" || typeLabels[item?.type] ? item.type : "all";
  if (!name) return null;
  return {
    id: String(item.id || uid()),
    type,
    name,
    matchTag: normalizeTag(item.matchTag || name),
  };
}

function persistFolders() {
  localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(state.folders));
}

function createTagFolder() {
  const base = "新規フォルダ";
  const names = new Set(state.folders.map((folder) => folder.name));
  let name = base;
  let index = 2;
  while (names.has(name)) {
    name = `${base} ${index}`;
    index += 1;
  }
  return {
    id: uid(),
    type: state.filter === "all" ? "all" : state.filter,
    name,
    matchTag: name,
  };
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
    .filter((note) => noteMatchesFolder(note))
    .filter((note) => state.tagFilter === ALL_TAGS || note.tags.includes(state.tagFilter))
    .filter((note) => {
      if (!query) return true;
      return [note.title, note.body, ...(note.tags ?? [])].join(" ").toLowerCase().includes(query);
    })
    .sort((a, b) => `${b.date} ${b.updatedAt}`.localeCompare(`${a.date} ${a.updatedAt}`));
}

function noteMatchesFolder(note) {
  if (state.folderFilter === ALL_FOLDERS) return true;
  if (state.folderFilter === UNASSIGNED_FOLDER) {
    return !noteMatchesAnyFolder(note);
  }
  const folder = getFolderById(state.folderFilter);
  if (!folder) return false;
  return noteHasTag(note, getFolderMatchTag(folder));
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

function getDefaultTagsForCurrentFolder() {
  const tags = [];
  const folder = getFolderById(state.folderFilter);
  const folderTag = getFolderMatchTag(folder);
  if (folderTag) tags.push(folderTag);
  if (state.tagFilter !== ALL_TAGS && !tags.includes(state.tagFilter)) {
    tags.push(state.tagFilter);
  }
  return tags;
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

function normalizeTag(tag) {
  return String(tag ?? "").trim().replace(/\s+/g, " ");
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

function getFolderById(id) {
  return state.folders.find((folder) => folder.id === id) ?? null;
}

function getFolderMatchTag(folder) {
  return normalizeTag(folder?.matchTag || folder?.name || "");
}

function getFolderType(folder) {
  return folder?.type === "all" || typeLabels[folder?.type] ? folder.type : "all";
}

function getFolderTypeLabel(folder) {
  const type = getFolderType(folder);
  return type === "all" ? "全体" : typeLabels[type];
}

function folderAppliesToCurrentType(folder) {
  if (state.filter === "all") return true;
  const type = getFolderType(folder);
  return type === "all" || type === state.filter;
}

function noteHasTag(note, tag) {
  return Boolean(tag) && (note.tags ?? []).includes(tag);
}

function noteMatchesAnyFolder(note) {
  return state.folders
    .filter((folder) => folderAppliesToCurrentType(folder))
    .some((folder) => noteHasTag(note, getFolderMatchTag(folder)));
}

function getAllTagsFromNotes(notes = state.notes) {
  const tags = new Set();
  notes.forEach((note) => {
    (note.tags ?? []).forEach((tag) => {
      const clean = normalizeTag(tag);
      if (clean) tags.add(clean);
    });
  });
  return [...tags].sort((a, b) => a.localeCompare(b, "ja"));
}

function getTagCounts(notes = getTagSourceNotes()) {
  const counts = new Map();
  notes.forEach((note) => {
    (note.tags ?? []).forEach((tag) => {
      const clean = normalizeTag(tag);
      if (!clean) return;
      if (!counts.has(clean)) counts.set(clean, new Set());
      counts.get(clean).add(note.id);
    });
  });
  return new Map([...counts.entries()].map(([tag, ids]) => [tag, ids.size]));
}

function getNotesForFolder(folderId, notes = getFolderSourceNotes()) {
  if (folderId === ALL_FOLDERS) return notes;
  if (folderId === UNASSIGNED_FOLDER) {
    return notes.filter((note) => !noteMatchesAnyFolder(note));
  }
  const folder = getFolderById(folderId);
  const matchTag = getFolderMatchTag(folder);
  return notes.filter((note) => noteHasTag(note, matchTag));
}

function getAvailableFolders() {
  const sourceNotes = getFolderSourceNotes();
  const folders = state.folders
    .map((folder) => ({
      id: folder.id,
      name: folder.name,
      type: getFolderType(folder),
      count: getNotesForFolder(folder.id, sourceNotes).length,
    }))
    .filter((folder) => {
      if (state.filter === "all") return true;
      if (folder.type === state.filter) return true;
      return folder.type === "all" && folder.count > 0;
    });
  const unassignedNotes = getNotesForFolder(UNASSIGNED_FOLDER, sourceNotes);
  if (unassignedNotes.length) {
    folders.push({
      id: UNASSIGNED_FOLDER,
      name: UNASSIGNED_FOLDER_LABEL,
      count: unassignedNotes.length,
    });
  }
  return folders;
}

function getAvailableTagsInFolder() {
  if (state.folderFilter === ALL_FOLDERS) return [];
  const folderNotes = getNotesForFolder(state.folderFilter, getTagSourceNotes());
  const folder = getFolderById(state.folderFilter);
  const matchTag = getFolderMatchTag(folder);
  const counts = getTagCounts(folderNotes);
  const tags = getAllTagsFromNotes(folderNotes).filter((tag) => tag !== matchTag);
  return tags.map((tag) => ({
    key: tag,
    name: tag,
    count: counts.get(tag) ?? 0,
  }));
}

function renderFolderFilters() {
  const folders = getAvailableFolders();
  if (state.folderFilter !== ALL_FOLDERS && !folders.some((item) => item.id === state.folderFilter)) {
    state.folderFilter = ALL_FOLDERS;
    state.tagFilter = ALL_TAGS;
  }

  refs.tagFolderList.replaceChildren();
  refs.tagFolderList.append(createFolderButton(ALL_FOLDERS, "すべてのメモ", getFolderSourceNotes().length));

  folders.forEach(({ id, name, count }) => {
    refs.tagFolderList.append(createFolderButton(id, name, count));
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
  refs.folderEditor.replaceChildren();
  if (state.folderFilter === ALL_FOLDERS) {
    refs.folderTagTitle.textContent = "フォルダを選ぶと中のタグが出ます";
    const empty = document.createElement("div");
    empty.className = "folder-tag-empty";
    empty.textContent = "＋でフォルダを作ると、その名前と同じタグの記録が自動で集まります。";
    refs.tagFilterList.append(empty);
    return;
  }

  if (state.folderFilter === UNASSIGNED_FOLDER) {
    refs.folderTagTitle.textContent = `${UNASSIGNED_FOLDER_LABEL} のタグ`;
    renderUnassignedFolderEditor();
  } else {
    const folder = getFolderById(state.folderFilter);
    if (!folder) return;
    refs.folderTagTitle.textContent = `${folder.name} のタグ`;
    renderFolderEditor(folder);
  }

  if (!tags.length) {
    const empty = document.createElement("div");
    empty.className = "folder-tag-empty";
    empty.textContent = "一緒に付いているタグはまだありません。";
    refs.tagFilterList.append(empty);
    return;
  }

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

function renderUnassignedFolderEditor() {
  const box = document.createElement("div");
  box.className = "folder-editor-note";
  box.textContent = "どのフォルダ名にも一致しない記録です。";
  refs.folderEditor.append(box);
}

function renderFolderEditor(folder) {
  const box = document.createElement("div");
  box.className = "folder-editor";

  const nameRow = document.createElement("div");
  nameRow.className = "folder-editor-row";

  const nameLabel = document.createElement("label");
  nameLabel.className = "folder-name-edit";
  const nameText = document.createElement("span");
  nameText.textContent = "フォルダ名";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = folder.name;
  nameInput.dataset.folderNameInput = "true";
  nameLabel.append(nameText, nameInput);

  const renameButton = document.createElement("button");
  renameButton.type = "button";
  renameButton.className = "mini-button";
  renameButton.dataset.folderAction = "rename";
  renameButton.textContent = "名前変更";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "mini-button danger";
  deleteButton.dataset.folderAction = "delete";
  deleteButton.textContent = "削除";

  nameRow.append(nameLabel, renameButton, deleteButton);
  box.append(nameRow);

  const typeLabel = document.createElement("label");
  typeLabel.className = "folder-type-edit";
  const typeText = document.createElement("span");
  typeText.textContent = "項目";
  const typeSelect = document.createElement("select");
  typeSelect.dataset.folderTypeInput = "true";
  [
    ["all", "全体"],
    ["gym", typeLabels.gym],
    ["vocal", typeLabels.vocal],
    ["cross", typeLabels.cross],
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = getFolderType(folder) === value;
    typeSelect.append(option);
  });
  typeLabel.append(typeText, typeSelect);
  box.append(typeLabel);

  const rule = document.createElement("div");
  rule.className = "folder-rule-text";
  rule.textContent = `${getFolderTypeLabel(folder)}の中で「${getFolderMatchTag(folder)}」タグが付いた記録を自動で集めます。`;
  box.append(rule);
  refs.folderEditor.append(box);
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

function addFolder() {
  collectCurrentNote();
  const folder = createTagFolder();
  state.folders.push(folder);
  state.folderFilter = folder.id;
  state.tagFilter = ALL_TAGS;
  persistFolders();
  render();
  const input = refs.folderEditor.querySelector("[data-folder-name-input]");
  input?.focus();
  input?.select();
  showToast("フォルダを作りました");
}

function renameSelectedFolder() {
  const folder = getFolderById(state.folderFilter);
  const input = refs.folderEditor.querySelector("[data-folder-name-input]");
  if (!folder || !input) return;
  const nextName = input.value.trim();
  if (!nextName) {
    input.value = folder.name;
    showToast("フォルダ名を入力してください");
    return;
  }
  if (state.folders.some((item) => item.id !== folder.id && item.name === nextName)) {
    input.value = folder.name;
    showToast("同じ名前のフォルダがあります");
    return;
  }
  folder.name = nextName;
  folder.matchTag = nextName;
  persistFolders();
  render();
  showToast("フォルダ名を変更しました");
}

function updateSelectedFolderType(value) {
  const folder = getFolderById(state.folderFilter);
  if (!folder) return;
  if (value !== "all" && !typeLabels[value]) return;
  folder.type = value;
  persistFolders();
  render();
  showToast("項目を変更しました");
}

function deleteSelectedFolder() {
  const folder = getFolderById(state.folderFilter);
  if (!folder) return;
  const ok = window.confirm(`「${folder.name}」を削除します。メモとタグ自体は残ります。`);
  if (!ok) return;
  state.folders = state.folders.filter((item) => item.id !== folder.id);
  state.folderFilter = ALL_FOLDERS;
  state.tagFilter = ALL_TAGS;
  persistFolders();
  render();
  showToast("フォルダを削除しました");
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

refs.addFolderButton.addEventListener("click", addFolder);

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

refs.folderEditor.addEventListener("click", (event) => {
  const button = event.target.closest("[data-folder-action]");
  if (!button) return;
  collectCurrentNote();
  if (button.dataset.folderAction === "rename") {
    renameSelectedFolder();
  }
  if (button.dataset.folderAction === "delete") {
    deleteSelectedFolder();
  }
});

refs.folderEditor.addEventListener("change", (event) => {
  if (event.target.matches("[data-folder-name-input]")) {
    renameSelectedFolder();
  }
  if (event.target.matches("[data-folder-type-input]")) {
    updateSelectedFolderType(event.target.value);
  }
});

refs.folderEditor.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || !event.target.matches("[data-folder-name-input]")) return;
  event.preventDefault();
  renameSelectedFolder();
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
  note.tags = getDefaultTagsForCurrentFolder();
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
    render();
  });
});

window.addEventListener("beforeunload", () => {
  collectCurrentNote();
  persistNotes();
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js?v=20260706-type-scoped-folders").then((registration) => {
      registration.update();
    }).catch(() => {});
  });
}

render();
