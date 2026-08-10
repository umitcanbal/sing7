import type { Section } from "../rpc/client.gen";
import { SongLine } from "./SongLine";

/*
 * One named part of the song, like [Verse 1] — or an unnamed run of lines.
 * Nearly half the songs have no section names at all, so a missing label means
 * no heading, no placeholder and no "Untitled": the song simply starts.
 */
export function SongSection({ section }: { section: Section }) {
	return (
		<section>
			{section.label && (
				<h2 className="mb-1 text-sm text-quiet">[{section.label}]</h2>
			)}
			{section.lines.map((line, index) => (
				// Lines have no id and identical lines do repeat, so position is the
				// only stable identity available.
				// biome-ignore lint/suspicious/noArrayIndexKey: lines are a fixed, ordered list
				<SongLine key={index} line={line} />
			))}
		</section>
	);
}
