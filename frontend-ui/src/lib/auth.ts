// const TOKEN_KEY = "sessionJwt";

// export function saveToken(token: string): void {
//   localStorage.setItem(TOKEN_KEY, token);
// }

// export function getToken(): string | null {
//   return localStorage.getItem(TOKEN_KEY);
// }

// // Full logout — clears JWT AND identity so next login gets a fresh nullifier
// export function clearToken(): void {
//   localStorage.removeItem(TOKEN_KEY);
//   localStorage.removeItem("semaphoreIdentity");
// }



const TOKEN_KEY = "sessionJwt";

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// Logout — only clears the session JWT, keeps identity so same user can re-verify
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Full reset — wipes everything including identity (only for "Reset Identity" action)
export function clearIdentity(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("semaphoreIdentity");
}

