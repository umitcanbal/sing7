import { Link } from "@tanstack/react-router";
import type { SongListItem } from "../rpc/client.gen";
import { Skeleton } from "../ui/Skeleton";

// The row's own spacing and text sizes, shared with the placeholder below so the
// two cannot drift apart and make the page jump when the real list arrives.
const ROW = "flex items-baseline gap-4 border-b border-neutral-200 px-3 py-3";
const TITLE = "block truncate text-lg font-medium";
const ARTIST = "block truncate text-sm";

// One row: title on top, artist under it, and the key on the right when the
// song has one. The whole row is the link, so there is a big target to click.
export function SongRow({ song }: { song: SongListItem }) {
	return (
		<Link
			to="/songs/$slug"
			params={{ slug: song.slug }}
			className={`${ROW} no-underline hover:bg-neutral-100`}
		>
			<span className="min-w-0 flex-1">
				<span className={`${TITLE} text-lyric`}>{song.title}</span>
				<span className={`${ARTIST} text-quiet`}>{song.artist}</span>
			</span>
			{song.key && (
				<span className="shrink-0 text-sm text-quiet">{song.key}</span>
			)}
		</Link>
	);
}

/*
 * A row-shaped placeholder for while the list is loading.
 *
 * It lives here, next to the real row, and reuses the row's own spacing and text
 * classes. That is the whole trick: the height is right because it is built from
 * the same numbers, not because someone measured a row once and typed the answer
 * in. The requirement is that the page must not jump when the real list lands,
 * and matching by construction is the only way that stays true.
 *
 * The grey bars sit inside spans carrying the real text sizes, so each bar
 * occupies exactly the line box its text would have.
 */
export function SongRowSkeleton() {
	return (
		<div className={ROW}>
			<span className="min-w-0 flex-1">
				<span className={TITLE}>
					<Skeleton className="h-[1em] w-48" />
				</span>
				<span className={ARTIST}>
					<Skeleton className="h-[1em] w-28" />
				</span>
			</span>
		</div>
	);
}
