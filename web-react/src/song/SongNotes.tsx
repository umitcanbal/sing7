/*
 * The "Song info" box at the very bottom: YouTube links, sources, chord
 * summaries, and any Czech labels the parser did not map to a known field.
 *
 * It is reference material, not something you read while playing, so it is
 * closed by default and sits below the song. Every song has notes, so this box
 * is always there — which is exactly why it must stay out of the way.
 *
 * <details> is the browser's own collapsible box: no state, no click handler,
 * and it opens for Ctrl+F even while closed.
 */
export function SongNotes({ notes }: { notes: string[] }) {
	if (notes.length === 0) return null;

	return (
		<details className="mt-12 border-t border-neutral-200 pt-4 text-sm text-quiet">
			<summary className="cursor-pointer">Song info</summary>
			<ul className="mt-2 space-y-1">
				{notes.map((note) => (
					<li key={note}>{note}</li>
				))}
			</ul>
		</details>
	);
}
