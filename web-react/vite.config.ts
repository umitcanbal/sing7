import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
	// tanstackRouter must come before react() (even though tanstackRouter has `enforce: "pre"` to place itself front regardless of the order): it watches src/routes/ and writes
	// src/routeTree.gen.ts, also splits component files into two; one being the route (fetched eagerly) and one being the actual component (fetched lazily) which then are compiled by react() like any other file.
	plugins: [
		tanstackRouter({ autoCodeSplitting: true }),
		react(),
		tailwindcss(),
	],
	server: {
		proxy: {
			"/rpc": "http://localhost:8080",
		},
	},
	test: {
		// Component tests need a document to render into. jsdom is a fake browser
		// running in Node — enough DOM to mount React and read the markup back.
		environment: "jsdom",
		// Unmounts whatever each test rendered. Without it, listeners from earlier
		// tests are still live and answer events meant for the current one.
		setupFiles: ["./src/test-setup.ts"],
	},
});
