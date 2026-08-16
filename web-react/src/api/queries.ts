import { useQuery } from "@tanstack/react-query";
import { api } from "./client";

// The whole library, fetched once at startup. No `q` is sent: the backend can
// filter, but with 28 songs the browser filters the list it already has.
export function useSongList() {
	return useQuery({
		queryKey: api.queryKey.listSongs({}),
		queryFn: () => api.listSongs({}),
		select: (data) => data.songs,
	});
}

// One full song, fetched when its page opens. Each slug is its own cache entry,
// so going back to a song you already opened costs no request.
export function useSong(slug: string) {
	return useQuery({
		queryKey: api.queryKey.getSong({ slug }),
		queryFn: ({ signal }) => api.getSong({ slug }, undefined, signal),
		select: (data) => data.song,
	});
}
