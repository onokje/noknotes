import {getNoteData, saveNote, sendDeleteNoteEvent, sendNewNoteEvent} from "./api.js";
import {selectedNote, easyMDE, typingTimeout} from "./state.js";

function findNoteMenuElementByNoteName(noteName) {
    return document.querySelector('[data-note="'+noteName+'"]')
}

function findFirstNoteNameByFirstNoteElement() {
    const $notes = document.getElementById('notes');
    const $firstNote = $notes.getElementsByTagName('li')[0];
    return $firstNote.innerHTML;
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
            $noteEl.innerHTML = note;
            $noteEl.setAttribute('data-note', note);
            $notes.appendChild($noteEl);
        })
    }
}

async function selectNote(noteName) {
    if (noteName === selectedNote) {
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
        selectedNote = noteName;
        findNoteMenuElementByNoteName(noteName).classList.add("active");
        setupEditor();
        easyMDE.value(noteDataMD);
        setNoteNameOnTopBar(noteName);
        collapseSideBar();

    } catch (error) {
        console.error(error.message);
    }
}

function setNoteNameOnTopBar(noteName) {
    const $topbar = document.getElementById("topbar")
    $topbar.getElementsByTagName('span')[0].innerHTML = noteName;
}

function setupEditor() {
    let $editor = document.getElementById('main_editor');
    if (!$editor) {
        $editor = document.createElement('textarea');
        $editor.setAttribute('id', 'main_editor');
        const $container = document.getElementById('main_editor_container');
        $container.innerHTML = '';
        $container.appendChild($editor);

        easyMDE = new EasyMDE({
            element: $editor,
            spellChecker: false
        });
        easyMDE.codemirror.on("change", () => {
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                saveNote(selectedNote, easyMDE.value());
            }, 400);
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
            const targetNoteName = e.target.innerHTML;
            selectNote(targetNoteName);
        }
    });

    $deleteNoteBtn.addEventListener('click', (e) => {
        if (!selectedNote) {
            return;
        }
        sendDeleteNoteEvent(selectedNote);
    });

    $newNoteSaveBtn.addEventListener('click', (e) => {
        const newNoteName = $newNoteInput.value;
        if (!newNoteName || newNoteName === "") {
            return;
        }
        sendNewNoteEvent(newNoteName);
        $newNoteInput.value = '';
    });

    $showNoteListBtn.addEventListener('click', (e) => {
        showSideBar();
        hideEditor();
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