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
  if (!name) return null;
  return {
    id: String(item.id || uid()),
    name,
    tags: normalizeTags(Array.isArray(item.tags) ? item.tags : []),
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
    name,
    tags: [],
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
  const noteTags = note.tags ?? [];
  if (state.folderFilter === UNASSIGNED_FOLDER) {
    return noteTags.some((tag) => isUnassignedTag(tag));
  }
  const folder = getFolderById(state.folderFilter);
  if (!folder) return false;
  return noteTags.some((tag) => folder.tags.includes(tag));
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
  return state.tagFilter === ALL_TAGS ? "" : state.tagFilter;
}

function render() {
  syncFoldersWithExistingTags();
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

function getTagOwner(tag) {
  return state.folders.find((folder) => folder.tags.includes(tag)) ?? null;
}

function isUnassignedTag(tag) {
  return !getTagOwner(tag);
}

function getUnassignedTags() {
  return getAllTagsFromNotes().filter((tag) => isUnassignedTag(tag));
}

function countNotesForTags(tags, notes = getFolderSourceNotes()) {
  const targetTags = new Set(tags);
  if (!targetTags.size) return 0;
  const noteIds = new Set();
  notes.forEach((note) => {
    if ((note.tags ?? []).some((tag) => targetTags.has(tag))) {
      noteIds.add(note.id);
    }
  });
  return noteIds.size;
}

function getTagsForFolder(folderId) {
  if (folderId === UNASSIGNED_FOLDER) return getUnassignedTags();
  const folder = getFolderById(folderId);
  if (!folder) return [];
  const existingTags = new Set(getAllTagsFromNotes());
  return folder.tags.filter((tag) => existingTags.has(tag));
}

function syncFoldersWithExistingTags() {
  const existingTags = new Set(getAllTagsFromNotes());
  let changed = false;
  state.folders.forEach((folder) => {
    const nextTags = normalizeTags(folder.tags).filter((tag) => existingTags.has(tag));
    if (nextTags.length !== folder.tags.length || nextTags.some((tag, index) => tag !== folder.tags[index])) {
      folder.tags = nextTags;
      changed = true;
    }
  });
  if (changed) persistFolders();
}

function getAvailableFolders() {
  const sourceNotes = getFolderSourceNotes();
  const folders = state.folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    count: countNotesForTags(folder.tags, sourceNotes),
  }));
  const unassignedTags = getUnassignedTags();
  if (unassignedTags.length) {
    folders.push({
      id: UNASSIGNED_FOLDER,
      name: UNASSIGNED_FOLDER_LABEL,
      count: countNotesForTags(unassignedTags, sourceNotes),
    });
  }
  return folders;
}

function getAvailableTagsInFolder() {
  if (state.folderFilter === ALL_FOLDERS) return [];
  const tags = getTagsForFolder(state.folderFilter);
  const counts = getTagCounts();
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
    empty.textContent = "＋でフォルダを作り、そこに入れるタグを選ぶと整理できます。";
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
    empty.textContent = "このフォルダに入っているタグはまだありません。";
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
  box.textContent = "どのフォルダにも入っていないタグです。新規フォルダを作ってタグを選ぶと移せます。";
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

  const assignTitle = document.createElement("div");
  assignTitle.className = "tag-assign-title";
  assignTitle.textContent = "フォルダに入れるタグ";
  box.append(assignTitle);

  const allTags = getAllTagsFromNotes();
  const list = document.createElement("div");
  list.className = "tag-assignment-list";

  if (!allTags.length) {
    const empty = document.createElement("div");
    empty.className = "folder-tag-empty";
    empty.textContent = "メモにタグを書くと、ここでフォルダに振り分けられます。";
    list.append(empty);
  }

  const counts = getTagCounts(state.notes);
  allTags.forEach((tag) => {
    const owner = getTagOwner(tag);
    const row = document.createElement("label");
    row.className = "tag-assignment-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = owner?.id === folder.id;
    checkbox.dataset.folderTag = tag;

    const name = document.createElement("span");
    name.className = "tag-assignment-name";
    name.textContent = tag;

    const meta = document.createElement("span");
    meta.className = "tag-assignment-meta";
    const ownerText = owner && owner.id !== folder.id ? ` / ${owner.name}` : "";
    meta.textContent = `${counts.get(tag) ?? 0}件${ownerText}`;

    row.append(checkbox, name, meta);
    list.append(row);
  });

  box.append(list);
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
  persistFolders();
  render();
  showToast("フォルダ名を変更しました");
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

function moveTagToFolder(tag, folderId) {
  const clean = normalizeTag(tag);
  if (!clean) return;
  state.folders.forEach((folder) => {
    folder.tags = folder.tags.filter((item) => item !== clean);
  });
  const folder = getFolderById(folderId);
  if (folder && !folder.tags.includes(clean)) {
    folder.tags.push(clean);
    const tagOrder = getAllTagsFromNotes();
    folder.tags.sort((a, b) => tagOrder.indexOf(a) - tagOrder.indexOf(b));
  }
}

function removeTagFromFolder(tag, folderId) {
  const folder = getFolderById(folderId);
  if (!folder) return;
  folder.tags = folder.tags.filter((item) => item !== tag);
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
    return;
  }

  if (event.target.matches("[data-folder-tag]")) {
    collectCurrentNote();
    const tag = event.target.dataset.folderTag;
    if (event.target.checked) {
      moveTagToFolder(tag, state.folderFilter);
    } else {
      removeTagFromFolder(tag, state.folderFilter);
    }
    state.tagFilter = ALL_TAGS;
    persistFolders();
    render();
    showToast("タグのフォルダを更新しました");
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
    render();
  });
});

window.addEventListener("beforeunload", () => {
  collectCurrentNote();
  persistNotes();
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js?v=20260705-folder-manager").then((registration) => {
      registration.update();
    }).catch(() => {});
  });
}

render();
