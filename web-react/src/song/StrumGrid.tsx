import type { Strum } from "../rpc/client.gen";

/*
 * The strumming patterns, if the song has any. A song with none renders nothing
 * at all — no empty box.
 *
 * This is the one place a fixed-width font is right. A strum pattern is a grid:
 * the stroke and the beat under it must sit in the same column, and unlike a
 * lyric there is no sentence to read, only columns to count.
 *
 * But a fixed-width font is not enough on its own. Beats run past nine, so "10"
 * is two characters wide while every stroke is one. Printing both rows as text
 * would drift apart from the tenth slot onwards. So the rows are split into
 * tokens and laid out as real grid columns, and each column is as wide as its
 * widest member.
 */
export function splitSlots(row: string): string[] {
	return row.trim().split(/\s+/).filter(Boolean);
}

function Pattern({ pattern }: { pattern: Strum }) {
	const strokes = splitSlots(pattern.strokes);
	const beats = splitSlots(pattern.beats);
	// Every real pattern has matching counts, but a mismatch must not tear the
	// grid: the shorter row just leaves its last cells empty.
	const slots = Math.max(strokes.length, beats.length);
	const columns = Array.from({ length: slots }, (_, index) => {
		return index;
	});
	return (
		<div>
			{pattern.label && (
				<p className="mb-1 text-sm text-quiet">{pattern.label}</p>
			)}
			{/* The grid alone scrolls sideways when it is too wide — it must never
			    wrap, because a wrapped grid is a wrong grid. */}
			<div className="overflow-x-auto">
				<div
					className="strum"
					style={{
						gridTemplateColumns: `repeat(${slots}, minmax(1.5ch, auto))`,
					}}
				>
					{columns.map((index) => (
						// Slots have no identity beyond their position in the bar.
						<span key={`stroke-${index}`}>{strokes[index] ?? ""}</span>
					))}
					{columns.map((index) => (
						<span key={`beat-${index}`} className="text-quiet">
							{beats[index] ?? ""}
						</span>
					))}
				</div>
			</div>
		</div>
	);
}

export function StrumGrid({ patterns }: { patterns: Strum[] }) {
	if (patterns.length === 0) return null;

	return (
		<div className="mb-8 space-y-4">
			{patterns.map((pattern, index) => (
				// Patterns have no id, and two can share a label or have none at all.
				// biome-ignore lint/suspicious/noArrayIndexKey: patterns are a fixed, ordered list
				<Pattern key={index} pattern={pattern} />
			))}
		</div>
	);
}
