import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import z from "zod";
import { useSongList } from "../api/queries";
import { filterSongs } from "../song-list/filterSongs";
import { SearchBox } from "../song-list/SearchBox";
import { SongRow, SongRowSkeleton } from "../song-list/SongRow";
import { Button } from "../ui/Button";
import { ErrorState } from "../ui/ErrorState";

// Enough placeholder rows to fill a screen while the list is on its way.
const SKELETON_ROWS = 8;

// The address is text a user can edit, so it is the one genuinely unchecked
// input in the app. Zod turns "?q=panic" into a typed { q?: string }.
const searchSchema = z.object({ q: z.string().optional() });

function SongListScreen() {
	const { q } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const { data: songs, isPending, error, refetch } = useSongList();

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

			{isPending && (
				// role="status" makes this a polite live region, so a screen reader
				// hears "Loading songs" once instead of nothing at all — the grey bars
				// themselves are hidden from it.
				<div
					role="status"
					aria-busy="true"
					aria-label="Loading songs"
					className="border-t border-neutral-200"
				>
					{Array.from({ length: SKELETON_ROWS }, (_, index) => (
						// Placeholders have no identity beyond their position.
						// biome-ignore lint/suspicious/noArrayIndexKey: a fixed-length placeholder list
						<SongRowSkeleton key={index} />
					))}
				</div>
			)}

			{error && (
				<ErrorState
					message="Can't reach the song library."
					onRetry={() => refetch()}
				/>
			)}

			{songs && filteredSongs.length === 0 && (
				<div className="py-12 text-center">
					<p className="mb-4 text-quiet">
						No songs match <span className="text-lyric">{q}</span>
					</p>
					<Button variant="quiet" onClick={() => setQuery("")}>
						Clear search
					</Button>
				</div>
			)}

			{songs && filteredSongs.length > 0 && (
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
