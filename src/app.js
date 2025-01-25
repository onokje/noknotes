const $notes = document.getElementById('notes');

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

socket.on('chat message', (msg) => {
    const item = document.createElement('li');
    item.textContent = msg;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});