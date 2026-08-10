import { createFileRoute, Link } from "@tanstack/react-router";
import { useSong } from "../api/queries";
import { SongNotFoundError } from "../rpc/client.gen";
import { SongBody } from "../song/SongBody";

// The song itself is drawn here now. The info line, the strum grid and the
// notes box are Step 6; the scrolling is Step 7.
function SongScreen() {
	// The router parsed "$slug" out of the address and typed it for us.
	const { slug } = Route.useParams();
	const { data: song, isPending, error } = useSong(slug);

	if (isPending) return <p className="p-8 text-quiet">Loading…</p>;

	// The backend answers an unknown slug with a real 404, and the generated
	// client turns that into this error class. Step 9 makes this screen proper.
	if (error instanceof SongNotFoundError) {
		return (
			<div className="p-8">
				<p>That song isn't here.</p>
				<Link to="/">Back to the list</Link>
			</div>
		);
	}
	if (error) return <p className="p-8 text-quiet">Error: {error.message}</p>;

	return (
		<div className="mx-auto max-w-3xl px-4 py-8">
			<Link to="/" className="text-sm text-quiet">
				‹ back
			</Link>
			<h1 className="mt-2 text-2xl font-bold text-lyric">{song.title}</h1>
			<p className="mb-8 text-quiet">{song.artist}</p>

			<SongBody sections={song.sections} />
		</div>
	);
}

export const Route = createFileRoute("/songs/$slug")({
	component: SongScreen,
});
