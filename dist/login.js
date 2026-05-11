if (new URLSearchParams(location.search).get('error')) {
    document.getElementById('errorMsg').classList.add('visible');
}

document.getElementById('passkeyBtn').addEventListener('click', async () => {
    const btn = document.getElementById('passkeyBtn');
    const err = document.getElementById('errorMsg');
    btn.disabled = true;
    err.classList.remove('visible');
    try {
        const optRes = await fetch('/api/passkey/authentication/start', { method: 'POST' });
        const options = await optRes.json();
        const assertion = await SimpleWebAuthnBrowser.startAuthentication({ optionsJSON: options });
        const verRes = await fetch('/api/passkey/authentication/finish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(assertion),
        });
        if (verRes.ok) {
            location.href = '/';
        } else {
            err.textContent = 'Passkey sign-in failed. Try again or use your password.';
            err.classList.add('visible');
        }
    } catch (e) {
        if (e.name !== 'NotAllowedError') {
            err.textContent = 'Passkey sign-in failed. Try again or use your password.';
            err.classList.add('visible');
        }
    } finally {
        btn.disabled = false;
    }
});
