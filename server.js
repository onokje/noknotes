import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync, renameSync, mkdirSync } from 'node:fs';
import { Server } from 'socket.io';
import helmet from 'helmet';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { findByUsername, findById, createPasskey, findPasskeyByCredentialId, updatePasskeyCounter } from './db.js';

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", 'https://cdn.jsdelivr.net', "'wasm-unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://maxcdn.bootstrapcdn.com'],
            fontSrc: ["'self'", 'https://maxcdn.bootstrapcdn.com'],
            imgSrc: ["'self'", 'data:'],
        }
    }
}));

app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const __dirname = dirname(fileURLToPath(import.meta.url));
const notesDir = process.env.NOTE_DIR ?? join(__dirname, 'notes');
const port = process.env.SERVER_PORT ?? 3000;
const rpID   = process.env.RP_ID   ?? 'localhost';
const rpName = process.env.RP_NAME ?? 'NokNotes';
const origin = process.env.ORIGIN  ?? `http://localhost:${port}`;

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET ?? 'change-me-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax' },
});
app.use(sessionMiddleware);

const NAME_REGEX = /^[a-zA-Z0-9 _-]+$/;
function isValidName(name) {
    return typeof name === 'string' && name.length > 0 && name.length <= 50 && NAME_REGEX.test(name);
}

function getUserNotesDir(userId) {
    const dir = join(notesDir, String(userId));
    mkdirSync(dir, { recursive: true });
    return dir;
}

function requireAuth(req, res, next) {
    if (req.session?.userId) return next();
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
    res.redirect('/login');
}

app.get('/login', (req, res) => {
    if (req.session?.userId) return res.redirect('/');
    res.sendFile(join(__dirname, 'dist/login.html'));
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) return res.redirect('/login?error=1');

    const user = findByUsername(username);
    if (!user) return res.redirect('/login?error=1');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.redirect('/login?error=1');

    req.session.regenerate((err) => {
        if (err) return res.redirect('/login?error=1');
        req.session.userId = user.id;
        res.redirect('/');
    });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
});

app.post('/api/passkey/registration/start', requireAuth, async (req, res) => {
    const user = findById(req.session.userId);
    const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userName: user.username,
        userID: new TextEncoder().encode(String(user.id)),
        attestationType: 'none',
        authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
    });
    req.session.passkeyChallenge = options.challenge;
    req.session.save(() => res.json(options));
});

app.post('/api/passkey/registration/finish', requireAuth, async (req, res) => {
    const expectedChallenge = req.session.passkeyChallenge;
    req.session.passkeyChallenge = null;
    if (!expectedChallenge) return res.status(400).json({ error: 'No challenge found' });
    try {
        const verification = await verifyRegistrationResponse({
            response: req.body,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
        });
        if (!verification.verified) return res.status(400).json({ error: 'Verification failed' });
        const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
        createPasskey(req.session.userId, {
            credentialId: credential.id,
            publicKey: Buffer.from(credential.publicKey).toString('base64url'),
            counter: credential.counter,
            deviceType: credentialDeviceType,
            backedUp: credentialBackedUp,
            transports: JSON.stringify(req.body.response?.transports ?? []),
        });
        res.json({ ok: true });
    } catch (err) {
        console.error('passkey registration error:', err);
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/passkey/authentication/start', async (req, res) => {
    const options = await generateAuthenticationOptions({ rpID, userVerification: 'preferred' });
    req.session.passkeyChallenge = options.challenge;
    req.session.save(() => res.json(options));
});

app.post('/api/passkey/authentication/finish', async (req, res) => {
    const expectedChallenge = req.session.passkeyChallenge;
    req.session.passkeyChallenge = null;
    if (!expectedChallenge) return res.status(400).json({ error: 'No challenge found' });
    const passkey = findPasskeyByCredentialId(req.body.id);
    if (!passkey) return res.status(400).json({ error: 'Passkey not found' });
    try {
        const verification = await verifyAuthenticationResponse({
            response: req.body,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            credential: {
                id: passkey.credential_id,
                publicKey: Uint8Array.from(Buffer.from(passkey.public_key, 'base64url')),
                counter: passkey.counter,
                transports: JSON.parse(passkey.transports ?? '[]'),
            },
        });
        if (!verification.verified) return res.status(400).json({ error: 'Verification failed' });
        updatePasskeyCounter(passkey.credential_id, verification.authenticationInfo.newCounter);
        req.session.regenerate((err) => {
            if (err) return res.status(500).json({ error: 'Session error' });
            req.session.userId = passkey.user_id;
            res.json({ ok: true });
        });
    } catch (err) {
        console.error('passkey authentication error:', err);
        res.status(400).json({ error: err.message });
    }
});

app.get('/', requireAuth, (req, res) => {
    res.sendFile(join(__dirname, 'dist/index.html'));
});

app.use('/dist', express.static('dist'));

app.get('/api/notes', requireAuth, (req, res) => {
    const dir = getUserNotesDir(req.session.userId);
    const notes = readdirSync(dir).filter(note => note.endsWith('.md')).map(note => note.slice(0, -3));
    res.send({ notes });
});

app.get('/api/note/:note', requireAuth, (req, res) => {
    if (!isValidName(req.params.note)) return res.status(400).send('Invalid note name');
    try {
        const dir = getUserNotesDir(req.session.userId);
        const noteContents = readFileSync(join(dir, `${req.params.note}.md`));
        res.send(noteContents);
    } catch {
        res.status(404).send('Note not found');
    }
});

io.use((socket, next) => sessionMiddleware(socket.request, {}, next));
io.use((socket, next) => {
    const userId = socket.request.session?.userId;
    if (!userId) return next(new Error('Unauthorized'));
    socket.data.userId = userId;
    next();
});

io.on('connection', (socket) => {
    const userId = socket.data.userId;
    socket.join(String(userId));

    socket.on('saveNote', (msg) => {
        if (!isValidName(msg.noteName)) return;
        try {
            const dir = getUserNotesDir(userId);
            const path = join(dir, `${msg.noteName}.md`);
            if (existsSync(path)) {
                writeFileSync(path, msg.noteContents);
                io.to(String(userId)).emit('noteSaved', msg);
            }
        } catch (err) {
            console.error('saveNote error:', err);
            socket.emit('operationError', { message: 'Failed to save note' });
        }
    });

    socket.on('newNote', (msg) => {
        if (!isValidName(msg.noteName)) return;
        try {
            const dir = getUserNotesDir(userId);
            writeFileSync(join(dir, `${msg.noteName}.md`), '');
            io.to(String(userId)).emit('notesUpdated', { action: 'noteAdded', noteName: msg.noteName });
        } catch (err) {
            console.error('newNote error:', err);
            socket.emit('operationError', { message: 'Failed to create note' });
        }
    });

    socket.on('deleteNote', (msg) => {
        if (!isValidName(msg.noteName)) return;
        try {
            const dir = getUserNotesDir(userId);
            unlinkSync(join(dir, `${msg.noteName}.md`));
            io.to(String(userId)).emit('notesUpdated', { action: 'noteDeleted' });
        } catch (err) {
            console.error('deleteNote error:', err);
            socket.emit('operationError', { message: 'Failed to delete note' });
        }
    });

    socket.on('renameNote', (msg) => {
        const { oldName, newName } = msg;
        if (!isValidName(oldName) || !isValidName(newName)) return;
        try {
            const dir = getUserNotesDir(userId);
            const oldPath = join(dir, `${oldName}.md`);
            const newPath = join(dir, `${newName}.md`);
            if (!existsSync(oldPath) || existsSync(newPath)) return;
            renameSync(oldPath, newPath);
            io.to(String(userId)).emit('notesUpdated', { action: 'noteRenamed', oldName, newName });
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
