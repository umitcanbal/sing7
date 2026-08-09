import { createFileRoute, Link } from "@tanstack/react-router";
import { useSong } from "../api/queries";
import { SongNotFoundError } from "../rpc/client.gen";

// Title and artist only. The song itself — chords over lyrics — is Step 5.
function SongScreen() {
	// The router parsed "$slug" out of the address and typed it for us.
	const { slug } = Route.useParams();
	const { data: song, isPending, error } = useSong(slug);

	if (isPending) return <p>Loading…</p>;

	// The backend answers an unknown slug with a real 404, and the generated
	// client turns that into this error class. Step 9 makes this screen proper.
	if (error instanceof SongNotFoundError) {
		return (
			<div>
				<p>That song isn't here.</p>
				<Link to="/">Back to the list</Link>
			</div>
		);
	}
	if (error) return <p>Error: {error.message}</p>;

	return (
		<div>
			<Link to="/">‹ back</Link>
			<h1 className="text-lyric">{song.title}</h1>
			<p>{song.artist}</p>
		</div>
	);
}

export const Route = createFileRoute("/songs/$slug")({
	component: SongScreen,
});
