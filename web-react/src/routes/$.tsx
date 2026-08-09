import { createFileRoute, Link } from "@tanstack/react-router";

// "$" on its own catches any address no other route matched, e.g. /nonsense.
// An unknown *slug* is different — that address matches, and the backend 404s.
function NotFoundScreen() {
	return (
		<div>
			<p>There's nothing at this address.</p>
			<Link to="/">Back to the list</Link>
		</div>
	);
}

export const Route = createFileRoute("/$")({
	component: NotFoundScreen,
});
