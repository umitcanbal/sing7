import { createRootRoute, Outlet } from "@tanstack/react-router";

// The shell around every page. <Outlet /> is the hole the matched route renders
// into — the list on "/", one song on "/songs/xxx".
export const Route = createRootRoute({
	component: () => <Outlet />,
});
