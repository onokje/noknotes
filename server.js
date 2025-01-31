import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = dirname(fileURLToPath(import.meta.url));
const notesDir = process.env.NOTE_DIR ?? join(__dirname, 'notes');

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'dist/index.html'));
});
app.use('/dist', express.static('dist'))
app.get('/api/notes', (req, res) => {
    const notes = readdirSync(notesDir).filter(note => note.endsWith('.md')).map(note => note.slice(0, -3));

    res.send({notes});
})
app.get('/api/note/:note', (req, res) => {
    const noteFile = req.params.note;
    const noteContents = readFileSync(join(notesDir, `${noteFile}.md`));
    res.send(noteContents);
})

io.on('connection', (socket) => {
    // socket.on('disconnect', () => {
    //
    // });
    socket.on('saveNote', (msg) => {
        if (existsSync(join(notesDir, `${msg.noteName}.md`))) {
            writeFileSync(join(notesDir, `${msg.noteName}.md`), msg.noteContents);
            io.emit('noteSaved', msg);
        }
    });
    socket.on('newNote', (msg) => {
        writeFileSync(join(notesDir, `${msg.noteName}.md`), '');
        io.emit('notesUpdated', {action: 'noteAdded', noteName: msg.noteName});
    });
    socket.on('deleteNote', (msg) => {
        console.log('incomeing delete');
        unlinkSync(join(notesDir, `${msg.noteName}.md`));
        io.emit('notesUpdated', {action: 'noteDeleted'});
    });
});

const port = 3000;

try {
    server.listen(port, () => {
        console.log(`server running at on port ${port}`);
    });

    process.on('SIGTERM', () => {
        console.log('SIGTERM received. Executing shutdown sequence');
        process.exit(1);
    });
} catch (err) {
    console.error(err);
    process.exit(1);
}