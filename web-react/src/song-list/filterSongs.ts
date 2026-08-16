import type { SongListItem } from "../rpc/client.gen";

// A plain function, deliberately kept free of React so it can be tested on its own.
//
// This MUST behave identically to SongStore.Search in internal/store/song.go,
// which builds its haystack as lowercase(Title + " " + Artist) and does a
// substring match on a trimmed, lowercased trimmedQuery. If the two ever disagree,
// the same query gives different results depending on who did the filtering.
//
// Matching is strict: letters must match exactly, so "severni" does not find
// "Severní vítr". Accent-insensitive matching is a nice-to-have, and when it
// arrives it has to be added to BOTH sides in the same change.
export function filterSongs(
	songs: SongListItem[],
	query: string,
): SongListItem[] {
	const trimmedQuery = query.trim().toLowerCase();
	if (trimmedQuery === "") return songs;

	return songs.filter((song) =>
		`${song.title} ${song.artist}`.toLowerCase().includes(trimmedQuery),
	);
}
