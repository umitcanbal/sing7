import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

// staleTime: Infinity — the Go server parses the song files once at boot and
// serves them from memory, so a song cannot change while the app is open.
// Fetch once, then always answer from the cache.
const queryClient = new QueryClient({
	defaultOptions: { queries: { staleTime: Number.POSITIVE_INFINITY } },
});

// routeTree is written by the router plugin from whatever is in src/routes/.
const router = createRouter({ routeTree });

// Teaches TypeScript this app's exact routes, so a typo in a <Link to="...">
// is a compile error rather than a dead link found by clicking.
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

// biome-ignore lint/style/noNonNullAssertion: index.html always has #root
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	</StrictMode>,
);
