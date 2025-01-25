const $notes = document.getElementById('notes');
let selectedNote = null;

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
                $notes.appendChild($noteEl);
            })
        }

    } catch (error) {
        console.error(error.message);
    }
}

async function selectNote(noteName) {
    if (!noteName || noteName === '') {
        return;
    }
    try {
        const response = await fetch(`/api/note/${noteName}`);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const noteDataMD = await response.text();
        console.log(noteDataMD);

    } catch (error) {
        console.error(error.message);
    }

}


const socket = io();
getNotes();


//
// form.addEventListener('submit', (e) => {
//     e.preventDefault();
//     if (input.value) {
//         socket.emit('chat message', input.value);
//         input.value = '';
//     }
// });


$notes.addEventListener('click', (e) => {
    e.preventDefault();
    if (e.target.nodeName === 'LI') {
        const targetNoteName = e.target.innerHTML;
        selectNote(targetNoteName);
    }

});

socket.on('chat message', (msg) => {
    const item = document.createElement('li');
    item.textContent = msg;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});