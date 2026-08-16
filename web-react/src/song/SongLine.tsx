import type { Line } from "../rpc/client.gen";
import { ChordPart } from "./ChordPart";

/*
 * One line of the song. There is only ever one markup — the difference between
 * the three kinds of line is spacing, and spacing is what CSS is for. So this
 * picks a class rather than picking a component.
 *
 * Note the two different sources: `chordsOnly` is a field the backend sets,
 * while "this line has no chords" is worked out here from the parts. There is
 * no `lyricsOnly` field to look for.
 */
function lineVariant(line: Line): string {
	if (line.chordsOnly) return "line--chords-only";
	if (line.parts.some((part) => part.chord)) return "line--chorded";
	return "line--no-chords";
}

export function SongLine({ line }: { line: Line }) {
	return (
		<div className={`line ${lineVariant(line)}`}>
			{line.parts.map((part, index) => (
				// Parts have no id, and the same chord and text can repeat inside one
				// line, so the position in the line is the only stable identity.
				// biome-ignore lint/suspicious/noArrayIndexKey: parts are a fixed, ordered list
				<ChordPart key={index} part={part} />
			))}
			{line.annotation && <span className="annotation">{line.annotation}</span>}
		</div>
	);
}
