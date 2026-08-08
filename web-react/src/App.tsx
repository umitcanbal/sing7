import { useSongList } from "./api/queries";

// Deliberately ugly. Step 2 only proves the data arrives; the real list screen
// is Step 4, and the loading and error states are Step 9.
function App() {
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
						{song.title} — {song.artist}
					</li>
				))}
			</ul>
		</div>
	);
}

export default App;
