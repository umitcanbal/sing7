import type { Section } from "../rpc/client.gen";
import { SongSection } from "./SongSection";

/*
 * The whole song. Kept as one element on purpose: Step 7's auto-scroll needs to
 * ask the browser where the song starts on the page, and "the top" means the
 * song's first line, not the top of the page.
 *
 * text-xl is 1.25rem (20px) — bigger than a normal web page, because this is
 * read at arm's length with a guitar in the way. Chords are the same size as
 * the lyrics, not smaller: they are the thing you are looking for.
 */
export function SongBody({ sections }: { sections: Section[] }) {
	return (
		<div className="space-y-6 text-xl text-lyric">
			{sections.map((section, index) => (
				// Sections have no id, and an unlabelled section has nothing else to
				// identify it, so position is the only stable identity.
				// biome-ignore lint/suspicious/noArrayIndexKey: sections are a fixed, ordered list
				<SongSection key={index} section={section} />
			))}
		</div>
	);
}
