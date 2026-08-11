import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef } from "react";
import { useSong } from "../api/queries";
import { SongNotFoundError } from "../rpc/client.gen";
import { AutoScrollEngine } from "../scroll/AutoScrollEngine";
import { ScrollBar } from "../scroll/ScrollBar";
import { SongBody } from "../song/SongBody";
import { SongMeta } from "../song/SongMeta";
import { SongNotes } from "../song/SongNotes";
import { StrumGrid } from "../song/StrumGrid";

// The complete song page, apart from the scrolling — that is Step 7.
//
// The order is deliberate: you read the facts and the strum pattern before you
// start, and the notes are reference you look at afterwards, if ever. The strum
// grid does not float, because a pattern is one bar that repeats all song, so it
// is checked once and then never looked at again.
function SongScreen() {
	// The router parsed "$slug" out of the address and typed it for us.
	const { slug } = Route.useParams();
	const { data: song, isPending, error } = useSong(slug);

	// The scroll engine measures this element to know where the song starts and
	// where it ends. The engine itself is rendered below rather than called here,
	// so that a slider drag re-renders it instead of the whole song.
	const songBodyRef = useRef<HTMLDivElement>(null);

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
		<div className="page-tail mx-auto max-w-3xl px-4 pt-8">
			<Link to="/" className="text-sm text-quiet hover:text-lyric">
				‹ back
			</Link>

			<SongMeta title={song.title} artist={song.artist} meta={song.meta} />
			<StrumGrid patterns={song.strum} />
			<SongBody ref={songBodyRef} sections={song.sections} />
			<SongNotes notes={song.meta.notes ?? []} />

			<ScrollBar />
			<AutoScrollEngine songBodyRef={songBodyRef} />
		</div>
	);
}

export const Route = createFileRoute("/songs/$slug")({
	component: SongScreen,
});
