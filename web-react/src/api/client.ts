import { SongService } from "../rpc/client.gen";

// Empty in development: requests then go to /rpc/... on Vite's own address, and
// Vite's proxy forwards them to the Go server on :8080. Set VITE_API_URL at
// deploy time to point the app at a real domain.
const baseUrl = import.meta.env.VITE_API_URL ?? "";

// One client for the whole app. Every backend call goes through this.
export const api = new SongService(baseUrl, fetch);
