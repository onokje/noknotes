const socket = io();
const $notes = document.getElementById('notes');
const $newNoteInput = document.getElementById('newNoteInput');
const $newNoteSaveBtn = document.getElementById('newNoteSaveBtn');
const $topbar = document.getElementById('topbar');
const $deleteNoteBtn = document.getElementById('deleteNoteBtn');

let selectedNote = null;
let typingTimeout;
let easyMDE;

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
                socket.emit('saveNote', {noteName: selectedNote, noteContents: easyMDE.value()});
            }, 400);
        });
    }
}

async function getNotes() {
    try {
        const response = await fetch("/api/notes");
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const data = await response.json();
        $notes.innerHTML = '';
        if (Array.isArray(data.notes)) {
            data.notes.forEach((note) => {
                const $noteEl = document.createElement('li');
                $noteEl.innerHTML = note;
                $noteEl.setAttribute('data-note', note);
                $notes.appendChild($noteEl);
            })
        }

    } catch (error) {
        console.error(error.message);
    }
}

function findNoteMenuElementByNoteName(noteName) {
    return document.querySelector('[data-note="'+noteName+'"]')
}

async function selectNote(noteName) {
    if (noteName === selectedNote) {
        return;
    }
    if (!noteName || noteName === "") {
        // select first note in the list
        const $firstNote = $notes.getElementsByTagName('li')[0];
        noteName = $firstNote.innerHTML;
    }

    try {
        const response = await fetch(`/api/note/${noteName}`);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const noteDataMD = await response.text();
        if (selectedNote) {
            const currentSelectedNoteElement = findNoteMenuElementByNoteName(selectedNote);
            if (currentSelectedNoteElement) {
                currentSelectedNoteElement.classList.remove("active");
            }
        }

        selectedNote = noteName;
        findNoteMenuElementByNoteName(noteName).classList.add("active");
        setupEditor();
        easyMDE.value(noteDataMD);
        $topbar.getElementsByTagName('span')[0].innerHTML = noteName;

    } catch (error) {
        console.error(error.message);
    }
}

socket.on('notesUpdated', (msg) => {
    getNotes().then(() => {
        if (msg.action === 'noteAdded') {
            selectNote(msg.noteName);
        }
        if (msg.action === 'noteDeleted') {
            selectNote();
        }
    });
})

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
    if (confirm(`Remove note named ${selectedNote}, are you sure?`)) {
        socket.emit('deleteNote', {noteName: selectedNote});
    }
});

$newNoteSaveBtn.addEventListener('click', (e) => {
    const newNoteName = $newNoteInput.value;
    if (!newNoteName || newNoteName === "") {
        return;
    }
    socket.emit('newNote', {noteName: newNoteName});
    $newNoteInput.value = '';
});

getNotes();