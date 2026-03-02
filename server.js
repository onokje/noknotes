import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync, renameSync } from 'node:fs';
import { Server } from 'socket.io';
import helmet from 'helmet';

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://maxcdn.bootstrapcdn.com'],
            fontSrc: ["'self'", 'https://maxcdn.bootstrapcdn.com'],
            imgSrc: ["'self'", 'data:'],
        }
    }
}));

const NAME_REGEX = /^[a-zA-Z0-9 _-]+$/;
function isValidName(name) {
    return typeof name === 'string' && name.length > 0 && name.length <= 50 && NAME_REGEX.test(name);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const notesDir = process.env.NOTE_DIR ?? join(__dirname, 'notes');
const port = process.env.SERVER_PORT ?? 3000;

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'dist/index.html'));
});
app.use('/dist', express.static('dist'))
app.get('/api/notes', (req, res) => {
    const notes = readdirSync(notesDir).filter(note => note.endsWith('.md')).map(note => note.slice(0, -3));

    res.send({notes});
})
app.get('/api/note/:note', (req, res) => {
    if (!isValidName(req.params.note)) return res.status(400).send('Invalid note name');
    try {
        const noteContents = readFileSync(join(notesDir, `${req.params.note}.md`));
        res.send(noteContents);
    } catch {
        res.status(404).send('Note not found');
    }
})

io.on('connection', (socket) => {
    // socket.on('disconnect', () => {
    //
    // });
    socket.on('saveNote', (msg) => {
        if (!isValidName(msg.noteName)) return;
        try {
            if (existsSync(join(notesDir, `${msg.noteName}.md`))) {
                writeFileSync(join(notesDir, `${msg.noteName}.md`), msg.noteContents);
                io.emit('noteSaved', msg);
            }
        } catch (err) {
            console.error('saveNote error:', err);
            socket.emit('operationError', { message: 'Failed to save note' });
        }
    });
    socket.on('newNote', (msg) => {
        if (!isValidName(msg.noteName)) return;
        try {
            writeFileSync(join(notesDir, `${msg.noteName}.md`), '');
            io.emit('notesUpdated', {action: 'noteAdded', noteName: msg.noteName});
        } catch (err) {
            console.error('newNote error:', err);
            socket.emit('operationError', { message: 'Failed to create note' });
        }
    });
    socket.on('deleteNote', (msg) => {
        if (!isValidName(msg.noteName)) return;
        try {
            unlinkSync(join(notesDir, `${msg.noteName}.md`));
            io.emit('notesUpdated', {action: 'noteDeleted'});
        } catch (err) {
            console.error('deleteNote error:', err);
            socket.emit('operationError', { message: 'Failed to delete note' });
        }
    });
    socket.on('renameNote', (msg) => {
        const { oldName, newName } = msg;
        if (!isValidName(oldName) || !isValidName(newName)) return;
        try {
            const oldPath = join(notesDir, `${oldName}.md`);
            const newPath = join(notesDir, `${newName}.md`);
            if (!existsSync(oldPath) || existsSync(newPath)) return;
            renameSync(oldPath, newPath);
            io.emit('notesUpdated', { action: 'noteRenamed', oldName, newName });
        } catch (err) {
            console.error('renameNote error:', err);
            socket.emit('operationError', { message: 'Failed to rename note' });
        }
    });
});


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