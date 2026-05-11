#!/usr/bin/env node
import bcrypt from 'bcryptjs';
import { createUser, findByUsername, listUsers, deleteUser, updatePassword } from './db.js';

const [,, command, ...args] = process.argv;

const USAGE = `
NokNotes user management

  node cli.js create <username> <password>   Create a new user
  node cli.js list                           List all users
  node cli.js delete <username>              Delete a user (notes are kept on disk)
  node cli.js passwd <username> <password>   Update a user's password
`;

async function main() {
    switch (command) {
        case 'create': {
            const [username, password] = args;
            if (!username || !password) {
                console.error('Usage: node cli.js create <username> <password>');
                process.exit(1);
            }
            if (findByUsername(username)) {
                console.error(`User "${username}" already exists.`);
                process.exit(1);
            }
            const hash = await bcrypt.hash(password, 12);
            const result = createUser(username, hash);
            console.log(`Created user "${username}" with id ${result.lastInsertRowid}.`);
            break;
        }
        case 'list': {
            const users = listUsers();
            if (users.length === 0) {
                console.log('No users found.');
            } else {
                console.log('ID  Username');
                console.log('--  --------');
                users.forEach(u => console.log(`${String(u.id).padEnd(4)}${u.username}`));
            }
            break;
        }
        case 'delete': {
            const [username] = args;
            if (!username) {
                console.error('Usage: node cli.js delete <username>');
                process.exit(1);
            }
            if (!findByUsername(username)) {
                console.error(`User "${username}" not found.`);
                process.exit(1);
            }
            deleteUser(username);
            console.log(`Deleted user "${username}". Their notes directory is preserved on disk.`);
            break;
        }
        case 'passwd': {
            const [username, password] = args;
            if (!username || !password) {
                console.error('Usage: node cli.js passwd <username> <password>');
                process.exit(1);
            }
            if (!findByUsername(username)) {
                console.error(`User "${username}" not found.`);
                process.exit(1);
            }
            const hash = await bcrypt.hash(password, 12);
            updatePassword(username, hash);
            console.log(`Password updated for "${username}".`);
            break;
        }
        default:
            console.log(USAGE);
            if (command) process.exit(1);
    }
}

main().catch(err => { console.error(err.message); process.exit(1); });
