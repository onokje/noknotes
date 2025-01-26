const socket = io();
const $notes = document.getElementById('notes');
const $newNoteInput = document.getElementById('newNoteInput');
const $newNoteSaveBtn = document.getElementById('newNoteSaveBtn');
let selectedNote = null;
let typingTimeout;
let easyMDE;

function setupEditor() {
    let $editor = document.getElementById('main_editor');
    if (!$editor) {
        $editor = document.createElement('textarea');
        $editor.setAttribute('id', 'main_editor');
        document.getElementById('main_editor_container').appendChild($editor);

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

async function selectNote(noteName, targetElement) {
    if (!noteName || noteName === '' || noteName === selectedNote) {
        return;
    }


    try {
        const response = await fetch(`/api/note/${noteName}`);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const noteDataMD = await response.text();


        if (selectedNote) {
            const currentSelectedNoteElement = document.querySelector('[data-note='+selectedNote+']');
            if (currentSelectedNoteElement) {
                currentSelectedNoteElement.classList.remove("active");
            }
        }

        selectedNote = noteName;
        targetElement.classList.add("active");
        setupEditor();
        easyMDE.value(noteDataMD);

    } catch (error) {
        console.error(error.message);
    }
}

socket.on('noteAdded', (msg) => {
    const $noteEl = document.createElement('li');
    $noteEl.innerHTML = msg.noteName;
    $noteEl.setAttribute('data-note', msg.noteName);
    $notes.appendChild($noteEl);
    selectNote(msg.noteName, $noteEl);
})

$notes.addEventListener('click', (e) => {
    e.preventDefault();
    if (e.target.nodeName === 'LI') {
        const targetNoteName = e.target.innerHTML;
        selectNote(targetNoteName, e.target);
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