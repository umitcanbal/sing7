import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

/*
 * Renders a component that contains a <Link>.
 *
 * TanStack Router's Link reads the router out of context to work out its href,
 * so anything containing one cannot be rendered on its own — it fails with
 * "Cannot read properties of null". This wraps the component in a throwaway
 * router with an in-memory history, so no real navigation happens.
 *
 * The routes below exist only so a Link can resolve its target. They render
 * nothing: the root's component renders the component under test instead of an
 * <Outlet />, so the router never draws a page of its own.
 */
export async function renderWithRouter(ui: ReactNode) {
	const rootRoute = createRootRoute({ component: () => <>{ui}</> });

	const routeTree = rootRoute.addChildren([
		createRoute({
			getParentRoute: () => rootRoute,
			path: "/",
			component: () => null,
		}),
		createRoute({
			getParentRoute: () => rootRoute,
			path: "/songs/$slug",
			component: () => null,
		}),
	]);

	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});

	// The router resolves its first route asynchronously, so without this the
	// first render produces an empty container.
	await router.load();

	// The app registers its own router type globally, and this test one is a
	// different shape. Only the runtime behaviour matters here.
	return render(<RouterProvider router={router as never} />);
}
