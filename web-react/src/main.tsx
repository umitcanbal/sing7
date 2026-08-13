import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { routeTree } from "./routeTree.gen";
import { WebrpcError, WebrpcRequestFailedError } from "./rpc/client.gen";
import "./styles.css";

// staleTime: Infinity — the Go server parses the song files once at boot and
// serves them from memory, so a song cannot change while the app is open.
// Fetch once, then always answer from the cache.
//
// retry: the default is 3 extra tries with a growing wait, which is right for a
// dropped connection and wrong for a bad slug — a 404 stays a 404, and retrying
// it only holds the loading skeleton on screen for about seven seconds.
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: Number.POSITIVE_INFINITY,
			retry: (failureCount, error) => {
				if (failureCount >= 3) return false;

				// fetch() got no answer at all: server down, no network, timeout.
				// Nothing is wrong with the request, so it is worth sending again.
				// This class carries status 400 like a real bad request does, so it
				// must be matched by class, before any status check below.
				if (error instanceof WebrpcRequestFailedError) return true;

				// The server did answer. Only its own faults are worth repeating.
				if (error instanceof WebrpcError) return error.status >= 500;

				// Anything else is a bug on our side; retrying would hide it.
				return false;
			},
		},
	},
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
