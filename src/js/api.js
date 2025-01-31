import {renderNotes, selectNote} from "./dom.js";

const socket = io();
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

function saveNote(noteName, noteContents) {
    socket.emit('saveNote', {noteName, noteContents});
}

function sendNewNoteEvent(newNoteName) {
    socket.emit('newNote', {noteName: newNoteName});
}

function sendDeleteNoteEvent(noteName) {
    if (confirm(`Remove note named ${noteName}, are you sure?`)) {
        socket.emit('deleteNote', {noteName: noteName});
    }
}

async function getNoteData(noteName) {
    try {
        const response = await fetch(`/api/note/${noteName}`);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error(error.message);
    }
}

async function getNotes() {
    const $notes = document.getElementById('notes');
    try {
        const response = await fetch("/api/notes");
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const data = await response.json();
        renderNotes(data.notes);

    } catch (error) {
        console.error(error.message);
    }
}

export {getNotes, getNoteData, sendNewNoteEvent, sendDeleteNoteEvent, saveNote};