import type { Ref } from "react";
import type { Section } from "../rpc/client.gen";
import { SongSection } from "./SongSection";

/*
 * The whole song. Kept as one element on purpose: the auto-scroll asks the
 * browser where this element starts and ends, because "the top" means the
 * song's first line and "the bottom" means its last — neither is the page.
 * That is what the ref is for.
 *
 * song-tail adds blank space at the end, the height of the control bar, so the
 * last line can always scroll clear above it. It is inside this element rather
 * than after it so that the measured bottom edge already allows for the bar.
 *
 * text-xl is 1.25rem (20px) — bigger than a normal web page, because this is
 * read at arm's length with a guitar in the way. Chords are the same size as
 * the lyrics, not smaller: they are the thing you are looking for.
 */
export function SongBody({
	sections,
	ref,
}: {
	sections: Section[];
	ref?: Ref<HTMLDivElement>;
}) {
	return (
		<div ref={ref} className="song-tail space-y-6 text-xl text-lyric">
			{sections.map((section, index) => (
				// Sections have no id, and an unlabelled section has nothing else to
				// identify it, so position is the only stable identity.
				// biome-ignore lint/suspicious/noArrayIndexKey: sections are a fixed, ordered list
				<SongSection key={index} section={section} />
			))}
		</div>
	);
}
