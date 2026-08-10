import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import z from "zod";
import { useSongList } from "../api/queries";
import { filterSongs } from "../song-list/filterSongs";
import { SearchBox } from "../song-list/SearchBox";
import { SongRow } from "../song-list/SongRow";

// The address is text a user can edit, so it is the one genuinely unchecked
// input in the app. Zod turns "?q=panic" into a typed { q?: string }.
const searchSchema = z.object({ q: z.string().optional() });

function SongListScreen() {
	const { q } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const { data: songs, isPending, error } = useSongList();

	const filteredSongs = useMemo(
		() => filterSongs(songs ?? [], q ?? ""),
		[songs, q],
	);

	const setQuery = (queryParam: string) => {
		navigate({
			search: queryParam === "" ? {} : { q: queryParam },
			replace: true,
		});
	};

	return (
		<div className="mx-auto max-w-2xl px-4 py-8">
			<div className="mb-6 flex items-center justify-between gap-4">
				<h1 className="text-2xl font-bold text-lyric">SING7</h1>
				<SearchBox value={q ?? ""} onChange={setQuery} />
			</div>

			{/* Loading and error screens are Step 9; these are placeholders. */}
			{isPending && <p className="text-quiet">Loading…</p>}
			{error && <p className="text-quiet">Error: {error.message}</p>}

			{songs && (
				<div className="border-t border-neutral-200">
					{filteredSongs.map((song) => (
						<SongRow key={song.slug} song={song} />
					))}
				</div>
			)}
		</div>
	);
}

export const Route = createFileRoute("/")({
	validateSearch: searchSchema,
	component: SongListScreen,
});
