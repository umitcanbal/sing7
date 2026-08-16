import type { Part } from "../rpc/client.gen";

/*
 * One chord and the text that follows it, drawn as a single block so the two
 * can never be separated — not by wrapping, and not by any layout change later.
 *
 * The chord half is always rendered, even with nothing in it. An empty chord
 * row is invisible but it holds the lyric down onto the lyric row, so a part
 * with no chord still lines up with its neighbours that have one. On a line
 * where nothing has a chord, CSS hides the row entirely.
 *
 * The text half is left out when there is no text, which is what lets a
 * chords-only line have no lyric row at all.
 */
export function ChordPart({ part }: { part: Part }) {
	return (
		<span className="part">
			<span className="chord">{part.chord}</span>
			{part.text && <span className="text">{part.text}</span>}
		</span>
	);
}
