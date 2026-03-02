let selectedNote = null;
let typingTimeout;
let easyMDE;

export const getSelectedNote = () => selectedNote;
export const setSelectedNote = (n) => { selectedNote = n; };
export const getTypingTimeout = () => typingTimeout;
export const setTypingTimeout = (t) => { typingTimeout = t; };
export const getEasyMDE = () => easyMDE;
export const setEasyMDE = (m) => { easyMDE = m; };
