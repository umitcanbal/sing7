import { Button } from "./Button";

/*
 * Shown when the backend cannot be reached.
 *
 * A plain sentence and a Retry button — deliberately no error text from the
 * exception. What the browser throws is written for a developer ("Failed to
 * fetch", a stack, a status code) and tells a person holding a guitar nothing
 * they can act on. Retry is the only useful thing here, so it is the only thing
 * offered.
 *
 * Retry re-runs the query rather than reloading the page, so nothing else is
 * thrown away.
 */
export function ErrorState({
	message,
	onRetry,
}: {
	message: string;
	onRetry: () => void;
}) {
	return (
		<div role="alert" className="py-12 text-center">
			<p className="mb-4 text-quiet">{message}</p>
			<Button onClick={onRetry}>Retry</Button>
		</div>
	);
}
