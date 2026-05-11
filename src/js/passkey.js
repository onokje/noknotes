export async function registerPasskey() {
    const optRes = await fetch('/api/passkey/registration/start', { method: 'POST' });
    if (optRes.status === 401) { location.href = '/login'; return; }
    if (!optRes.ok) throw new Error('Failed to start passkey registration');

    const options = await optRes.json();
    const attResp = await SimpleWebAuthnBrowser.startRegistration({ optionsJSON: options });

    const verRes = await fetch('/api/passkey/registration/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attResp),
    });
    if (!verRes.ok) {
        const body = await verRes.json().catch(() => ({}));
        throw new Error(body.error ?? 'Passkey registration failed');
    }
}
