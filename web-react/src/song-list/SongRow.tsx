import { Link } from "@tanstack/react-router";
import type { SongListItem } from "../rpc/client.gen";

// One row: title on top, artist under it, and the key on the right when the
// song has one. The whole row is the link, so there is a big target to click.
export function SongRow({ song }: { song: SongListItem }) {
	return (
		<Link
			to="/songs/$slug"
			params={{ slug: song.slug }}
			className="flex items-baseline gap-4 border-b border-neutral-200 px-3 py-3 no-underline hover:bg-neutral-100"
		>
			<span className="min-w-0 flex-1">
				<span className="block truncate text-lg font-medium text-lyric">
					{song.title}
				</span>
				<span className="block truncate text-sm text-quiet">{song.artist}</span>
			</span>
			{song.key && (
				<span className="shrink-0 text-sm text-quiet">{song.key}</span>
			)}
		</Link>
	);
}
