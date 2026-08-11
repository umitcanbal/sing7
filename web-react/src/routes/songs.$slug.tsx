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
import { ErrorState } from "../ui/ErrorState";
import { Skeleton } from "../ui/Skeleton";

// The page around the song, whatever state the song itself is in.
function Page({ children }: { children: React.ReactNode }) {
	return (
		<div className="page-tail mx-auto max-w-3xl px-4 pt-8">
			<Link to="/" className="text-sm text-quiet hover:text-lyric">
				‹ back
			</Link>
			{children}
		</div>
	);
}

function SongScreen() {
	// The router parsed "$slug" out of the address and typed it for us.
	const { slug } = Route.useParams();
	const { data: song, isPending, error, refetch } = useSong(slug);

	// The scroll engine measures this element to know where the song starts and
	// where it ends. The engine itself is rendered below rather than called here,
	// so that a slider drag re-renders it instead of the whole song.
	const songBodyRef = useRef<HTMLDivElement>(null);

	if (isPending) {
		return (
			<Page>
				<div role="status" aria-busy="true" aria-label="Loading song">
					<div className="mb-8 space-y-2">
						<Skeleton className="h-8 w-64" />
						<Skeleton className="h-5 w-40" />
					</div>
					{/* Ragged widths, so it reads as lines of a song rather than a
					    block. Written out rather than generated, because Tailwind only
					    sees class names that appear literally in the source. */}
					<div className="space-y-4">
						{["w-11/12", "w-8/12", "w-10/12", "w-6/12", "w-9/12"].map(
							(width) => (
								<Skeleton key={width} className={`h-7 ${width}`} />
							),
						)}
					</div>
				</div>
			</Page>
		);
	}

	// The backend answers an unknown slug with a real 404, and the generated
	// client turns that into this error class. A wrong address is not a failure
	// worth offering a Retry for — retrying would fail again.
	if (error instanceof SongNotFoundError) {
		return (
			<Page>
				<div className="py-12 text-center">
					<p className="mb-4 text-quiet">That song isn't here.</p>
					<Link to="/" className="text-chord underline">
						Back to the list
					</Link>
				</div>
			</Page>
		);
	}

	if (error) {
		return (
			<Page>
				<ErrorState
					message="Can't reach this song."
					onRetry={() => refetch()}
				/>
			</Page>
		);
	}

	return (
		<Page>
			<SongMeta title={song.title} artist={song.artist} meta={song.meta} />
			<StrumGrid patterns={song.strum} />
			<SongBody ref={songBodyRef} sections={song.sections} />
			<SongNotes notes={song.meta.notes ?? []} />

			<ScrollBar />
			<AutoScrollEngine songBodyRef={songBodyRef} />
		</Page>
	);
}

export const Route = createFileRoute("/songs/$slug")({
	component: SongScreen,
});
