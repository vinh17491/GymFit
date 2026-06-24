// Google OAuth Client ID — hardcoded fallback, override via GOOGLE_CLIENT_ID in .env
// Get from: Firebase Console > Project Settings > General > Your apps > Web apps > Web client ID
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "210524482098-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com";
export default GOOGLE_CLIENT_ID;