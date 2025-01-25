import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'src/index.html'));
});
app.get('/app.js', (req, res) => {
    res.sendFile(join(__dirname, 'src/app.js'));
});
app.get('/api/notes', (req, res) => {
    const notes = readdirSync(join(__dirname, 'notes')).map(note => note.slice(0, -3));

    res.send({notes});
})
app.get('/api/note/:note', (req, res) => {
    const noteFile = req.params.note;
    const noteContents = readFileSync(join(__dirname, 'notes/', `${noteFile}.md`));
    res.send(noteContents);
})

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    socket.on('saveNote', (msg) => {
        io.emit('noteSaved', msg);
    });
});

server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});