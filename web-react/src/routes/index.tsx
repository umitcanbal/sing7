import { createFileRoute, Link } from "@tanstack/react-router";
import { useSongList } from "../api/queries";

// Still deliberately ugly. The real list screen — rows, search, ?q= — is Step 4.
function SongListScreen() {
	const { data: songs, isPending, error } = useSongList();

	if (isPending) return <p>Loading…</p>;
	if (error) return <p>Error: {error.message}</p>;

	return (
		<div>
			<h1 className="text-lyric">SING7</h1>
			<p>{songs.length} songs</p>
			<ul>
				{songs.map((song) => (
					<li key={song.slug}>
						<Link to="/songs/$slug" params={{ slug: song.slug }}>
							{song.title}
						</Link>{" "}
						— {song.artist}
					</li>
				))}
			</ul>
		</div>
	);
}

export const Route = createFileRoute("/")({
	component: SongListScreen,
});
