# NokNotes

NokNotes is a self-hosted note-keeping app that saves notes as markdown files on disk. Features the [EasyMDE](https://github.com/Ionaru/easy-markdown-editor) markdown editor with real-time sync across browser tabs via WebSockets.

## Installation & Setup

**Requirements:** Node.js 24+

```bash
git clone <repo>
cd noknotes
npm install
```

Create your first user before starting the server:

```bash
node cli.js create <username> <password>
```

Then start the server:

```bash
node server.js
```

The app is now available at `http://localhost:3000`.

### Environment Variables

| Variable         | Default                 | Description                                                          |
|------------------|-------------------------|----------------------------------------------------------------------|
| `SERVER_PORT`    | `3000`                  | HTTP server port                                                     |
| `NOTE_DIR`       | `./notes`               | Directory where notes are stored                                     |
| `DB_PATH`        | `./users.db`            | Path to the SQLite user database                                     |
| `SESSION_SECRET` | *(insecure)*            | Secret for signing session cookies — **set this in production**      |
| `RP_ID`          | `localhost`             | WebAuthn Relying Party ID — must match the hostname users visit      |
| `RP_NAME`        | `NokNotes`              | App name shown in passkey dialogs                                    |
| `ORIGIN`         | `http://localhost:3000` | Full origin used to verify passkey responses — set to your public URL |

### Docker

```bash
docker build -t noknotes .
docker run -p 3000:3000 \
  -v ./notes:/notes \
  -v ./users.db:/app/users.db \
  -e SESSION_SECRET=changeme \
  -e RP_ID=notes.example.com \
  -e ORIGIN=https://notes.example.com \
  noknotes
```

## User Management (CLI)

Registration is not available through the web UI. Users are managed exclusively via the CLI.

**Create a user:**
```bash
node cli.js create <username> <password>
```

**List all users:**
```bash
node cli.js list
```

**Change a user's password:**
```bash
node cli.js passwd <username> <newpassword>
```

**Delete a user:**
```bash
node cli.js delete <username>
```

Deleting a user does not remove their notes from disk.

## Passkeys

Logged-in users can add a passkey to their account via the **Add passkey** button in the sidebar. Once registered, future logins can use **Sign in with passkey** on the login page instead of a password.

Multiple passkeys per user are supported (useful for adding different devices).

> **Production note:** Set `RP_ID` to your domain (e.g. `notes.example.com`) and `ORIGIN` to your full URL (e.g. `https://notes.example.com`). Passkeys are bound to the RP ID — they will not work if these values do not match what the browser sees.

## Notes Storage

Notes are stored as `.md` files under `NOTE_DIR/<userId>/`. Each user's notes are kept in their own subdirectory, isolated from other users.

## Development

```bash
npm run watch   # Webpack watch mode (rebuilds on changes)
npm run build   # One-time build
```
