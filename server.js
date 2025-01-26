import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'src/index.html'));
});
app.use('/assets', express.static('src/assets'))
app.get('/api/notes', (req, res) => {
    const notes = readdirSync(join(__dirname, 'notes')).filter(note => note.endsWith('.md')).map(note => note.slice(0, -3));

    res.send({notes});
})
app.get('/api/note/:note', (req, res) => {
    const noteFile = req.params.note;
    const noteContents = readFileSync(join(__dirname, 'notes/', `${noteFile}.md`));
    res.send(noteContents);
})

io.on('connection', (socket) => {
    // socket.on('disconnect', () => {
    //
    // });
    socket.on('saveNote', (msg) => {
        console.log('Incoming saveNote: ' + msg.noteName);
        if (existsSync(join(__dirname, 'notes/', `${msg.noteName}.md`))) {
            writeFileSync(join(__dirname, 'notes/', `${msg.noteName}.md`), msg.noteContents);
            io.emit('noteSaved', msg);
        }
    });
    socket.on('newNote', (msg) => {
        console.log('Incoming newNote: ' + msg.noteName);
        writeFileSync(join(__dirname, 'notes/', `${msg.noteName}.md`), msg.noteContents);
        io.emit('noteAdded', msg);
    });
});

server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});