import type { Meta } from "../rpc/client.gen";

/*
 * Title, artist, and the small grey line of facts under them.
 *
 * The line shows only what the song file actually has and quietly skips the
 * rest — every field is optional, and most songs are missing several. Only Key
 * and Capo are given a word, because "4/4", "122 BPM" and "2000" already say
 * what they are.
 */
export function infoLine(meta: Meta): string[] {
	const facts: string[] = [];

	if (meta.key) facts.push(`Key ${meta.key}`);
	// A capo of 0 would mean "no capo", so it is worth printing if a file ever
	// says so. `!= null` keeps 0 while dropping both null and undefined.
	if (meta.capo != null) facts.push(`Capo ${meta.capo}`);
	if (meta.tempo) facts.push(meta.tempo);
	if (meta.time) facts.push(meta.time);
	if (meta.year != null) facts.push(String(meta.year));

	return facts;
}

export function SongMeta({
	title,
	artist,
	meta,
}: {
	title: string;
	artist: string;
	meta: Meta;
}) {
	const facts = infoLine(meta);

	return (
		<header className="mb-8">
			<h1 className="text-2xl font-bold text-lyric">{title}</h1>
			<p className="text-quiet">{artist}</p>
			{facts.length > 0 && (
				<p className="mt-1 text-sm text-quiet">{facts.join(" · ")}</p>
			)}
		</header>
	);
}
