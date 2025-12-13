import { setRefreshToken } from "../google-fit/token-store";

const tokenData = await tokenRes.json();

/* tokenData contient :
{
  access_token,
  refresh_token,
  expires_in
}
*/

// 🔐 stocker le refresh token
await setRefreshToken(firebaseUid, tokenData.refresh_token);

// 🍪 stocker l’access token (cookie)
res.setHeader("Set-Cookie", [
  `google_fit_token=${tokenData.access_token}; Path=/; HttpOnly; SameSite=Lax`,
]);
