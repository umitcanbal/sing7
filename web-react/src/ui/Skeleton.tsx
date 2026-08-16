/*
 * A grey bar standing in for text that has not arrived yet.
 *
 * Not a spinner. A spinner says "something is happening" and nothing else; a
 * skeleton says "a list is coming, and it will look roughly like this", so the
 * eye is already in the right place when the real thing lands.
 *
 * aria-hidden because there is nothing here to read out. The loading state is
 * announced once, by the region that holds these.
 */
export function Skeleton({ className }: { className?: string }) {
	return (
		<div
			aria-hidden="true"
			className={`animate-pulse rounded bg-neutral-200 ${className ?? ""}`.trim()}
		/>
	);
}
