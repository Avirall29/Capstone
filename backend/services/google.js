// Verifies Google ID tokens (from Google Sign-In on Android/iOS/web) with Google's official library.
import { OAuth2Client } from 'google-auth-library';

const clientIds = () => [
  process.env.GOOGLE_WEB_CLIENT_ID,
  process.env.GOOGLE_ANDROID_CLIENT_ID,
  process.env.GOOGLE_IOS_CLIENT_ID
].filter(Boolean);

const client = new OAuth2Client();

let verifier = async (idToken) => {
  const ticket = await client.verifyIdToken({ idToken, audience: clientIds() });
  return ticket.getPayload(); // { sub, email, email_verified, name, picture, ... }
};
let overridden = false;

export const isGoogleConfigured = () => overridden || clientIds().length > 0;
export const verifyGoogleIdToken = (idToken) => verifier(idToken);

/** Test hook: replace the verifier (tests have no real Google tokens). */
export const setGoogleVerifierForTests = (fn) => {
  verifier = fn;
  overridden = true;
};
