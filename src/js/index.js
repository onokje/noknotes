import "../scss/app.scss";
import {getNotes, logout} from "./api.js";
import {attachListeners} from "./dom.js";
import {registerPasskey} from "./passkey.js";

attachListeners();
getNotes();

document.getElementById('logoutBtn').addEventListener('click', logout);

document.getElementById('addPasskeyBtn').addEventListener('click', async () => {
    const btn = document.getElementById('addPasskeyBtn');
    btn.disabled = true;
    try {
        await registerPasskey();
        alert('Passkey added successfully.');
    } catch (err) {
        if (err.name !== 'NotAllowedError') {
            alert(`Could not add passkey: ${err.message}`);
        }
    } finally {
        btn.disabled = false;
    }
});
