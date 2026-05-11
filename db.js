import Database from 'better-sqlite3';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH ?? join(__dirname, 'users.db');

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS passkeys (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id TEXT UNIQUE NOT NULL,
    public_key    TEXT NOT NULL,
    counter       INTEGER NOT NULL DEFAULT 0,
    device_type   TEXT NOT NULL,
    backed_up     INTEGER NOT NULL,
    transports    TEXT,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  )
`);

export function createUser(username, passwordHash) {
    return db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
}

export function findByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

export function findById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function listUsers() {
    return db.prepare('SELECT id, username FROM users ORDER BY id').all();
}

export function deleteUser(username) {
    return db.prepare('DELETE FROM users WHERE username = ?').run(username);
}

export function updatePassword(username, passwordHash) {
    return db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(passwordHash, username);
}

export function createPasskey(userId, { credentialId, publicKey, counter, deviceType, backedUp, transports }) {
    return db.prepare(
        'INSERT INTO passkeys (user_id, credential_id, public_key, counter, device_type, backed_up, transports) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, credentialId, publicKey, counter, deviceType, backedUp ? 1 : 0, transports ?? null);
}

export function findPasskeyByCredentialId(credentialId) {
    return db.prepare('SELECT * FROM passkeys WHERE credential_id = ?').get(credentialId);
}

export function listPasskeysByUserId(userId) {
    return db.prepare('SELECT * FROM passkeys WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

export function updatePasskeyCounter(credentialId, newCounter) {
    return db.prepare('UPDATE passkeys SET counter = ? WHERE credential_id = ?').run(newCounter, credentialId);
}

export function deletePasskey(credentialId, userId) {
    return db.prepare('DELETE FROM passkeys WHERE credential_id = ? AND user_id = ?').run(credentialId, userId);
}
