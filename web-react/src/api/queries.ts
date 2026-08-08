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
