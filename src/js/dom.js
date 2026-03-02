import {getNoteData, saveNote, sendDeleteNoteEvent, sendNewNoteEvent, sendRenameNoteEvent} from "./api.js";
import {getSelectedNote, setSelectedNote, getEasyMDE, setEasyMDE, getTypingTimeout, setTypingTimeout} from "./state.js";

function findNoteMenuElementByNoteName(noteName) {
    return document.querySelector('[data-note="'+noteName+'"]')
}

function findFirstNoteNameByFirstNoteElement() {
    const $notes = document.getElementById('notes');
    const $firstNote = $notes.getElementsByTagName('li')[0];
    return $firstNote.textContent;
}

function clearActiveClassFromNotes() {
    document.querySelectorAll("#notes li.active").forEach($node => {
        $node.classList.remove("active")
    });
}

function renderNotes(notes) {
    const $notes = document.getElementById('notes');
    $notes.innerHTML = '';
    if (Array.isArray(notes)) {
        notes.forEach((note) => {
            const $noteEl = document.createElement('li');
            $noteEl.textContent = note;
            $noteEl.setAttribute('data-note', note);
            $notes.appendChild($noteEl);
        })
    }
}

async function selectNote(noteName) {
    if (noteName === getSelectedNote()) {
        return;
    }
    if (!noteName || noteName === "") {
        // select first note in the list
        noteName = findFirstNoteNameByFirstNoteElement();
    }

    try {
        const noteDataMD =  await getNoteData(noteName);
        clearActiveClassFromNotes();
        showEditor();
        setSelectedNote(noteName);
        findNoteMenuElementByNoteName(noteName).classList.add("active");
        setupEditor();
        getEasyMDE().value(noteDataMD);
        setNoteNameOnTopBar(noteName);
        collapseSideBar();

    } catch (error) {
        console.error(error.message);
    }
}

function setNoteNameOnTopBar(noteName) {
    document.getElementById('noteName').textContent = noteName;
    document.getElementById('renameNoteBtn').classList.remove('hidden');
}

function enterRenameMode() {
    const input = document.getElementById('renameNoteInput');
    input.value = getSelectedNote();
    document.getElementById('noteName').classList.add('hidden');
    document.getElementById('renameNoteBtn').classList.add('hidden');
    input.classList.remove('hidden');
    document.getElementById('renameNoteSaveBtn').classList.remove('hidden');
    input.focus();
    input.select();
}

function exitRenameMode() {
    document.getElementById('noteName').classList.remove('hidden');
    document.getElementById('renameNoteBtn').classList.remove('hidden');
    document.getElementById('renameNoteInput').classList.add('hidden');
    document.getElementById('renameNoteSaveBtn').classList.add('hidden');
}

function doRename() {
    const newName = document.getElementById('renameNoteInput').value.trim();
    const nameRegex = /^[a-zA-Z0-9 _-]+$/;
    if (!newName || newName.length > 50 || !nameRegex.test(newName)) {
        alert('Invalid note name. Use only letters, numbers, spaces, hyphens, or underscores (max 50 characters).');
        return;
    }
    if (newName === getSelectedNote()) { exitRenameMode(); return; }
    sendRenameNoteEvent(getSelectedNote(), newName);
    exitRenameMode();
}

function setupEditor() {
    let $editor = document.getElementById('main_editor');
    if (!$editor) {
        $editor = document.createElement('textarea');
        $editor.setAttribute('id', 'main_editor');
        const $container = document.getElementById('main_editor_container');
        $container.innerHTML = '';
        $container.appendChild($editor);

        setEasyMDE(new EasyMDE({
            element: $editor,
            spellChecker: false
        }));
        getEasyMDE().codemirror.on("change", () => {
            clearTimeout(getTypingTimeout());
            setTypingTimeout(setTimeout(() => {
                saveNote(getSelectedNote(), getEasyMDE().value());
            }, 400));
        });
    }
}

function attachListeners() {
    const $notes = document.getElementById('notes');
    const $newNoteInput = document.getElementById('newNoteInput');
    const $newNoteSaveBtn = document.getElementById('newNoteSaveBtn');
    const $deleteNoteBtn = document.getElementById('deleteNoteBtn');
    const $showNoteListBtn = document.getElementById('showNoteListBtn');

    $notes.addEventListener('click', (e) => {
        e.preventDefault();
        if (e.target.nodeName === 'LI') {
            const targetNoteName = e.target.textContent;
            selectNote(targetNoteName);
        }
    });

    $deleteNoteBtn.addEventListener('click', (e) => {
        if (!getSelectedNote()) {
            return;
        }
        sendDeleteNoteEvent(getSelectedNote());
    });

    $newNoteSaveBtn.addEventListener('click', (e) => {
        const newNoteName = $newNoteInput.value.trim();
        const nameRegex = /^[a-zA-Z0-9 _-]+$/;
        if (!newNoteName || newNoteName.length > 50 || !nameRegex.test(newNoteName)) {
            alert('Invalid note name. Use only letters, numbers, spaces, hyphens, or underscores (max 50 characters).');
            return;
        }
        sendNewNoteEvent(newNoteName);
        $newNoteInput.value = '';
    });

    $showNoteListBtn.addEventListener('click', (e) => {
        showSideBar();
        hideEditor();
    });

    const $renameNoteBtn = document.getElementById('renameNoteBtn');
    const $renameNoteSaveBtn = document.getElementById('renameNoteSaveBtn');
    const $renameNoteInput = document.getElementById('renameNoteInput');

    $renameNoteBtn.addEventListener('click', () => {
        if (!getSelectedNote()) return;
        enterRenameMode();
    });

    $renameNoteSaveBtn.addEventListener('click', doRename);

    $renameNoteInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doRename();
        if (e.key === 'Escape') exitRenameMode();
    });
}

function collapseSideBar() {
    const $sidebar = document.getElementById("sidebar");
    $sidebar.classList.add('collapse');
}

function showSideBar() {
    const $sidebar = document.getElementById("sidebar");
    $sidebar.classList.remove('collapse');
}

function hideEditor() {
    const $main = document.getElementById("main");
    $main.classList.add('collapse');
}

function showEditor() {
    const $main = document.getElementById("main");
    $main.classList.remove('collapse');
}

export {
    findNoteMenuElementByNoteName,
    findFirstNoteNameByFirstNoteElement,
    clearActiveClassFromNotes,
    renderNotes,
    attachListeners,
    selectNote
}