import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { isAutoScrollingAtom } from "./atoms";

/*
 * Keeps the screen awake while the scroll is running.
 *
 * This does not happen by itself. The computer decides you are idle from real
 * input — keyboard, mouse, trackpad — and a page scrolling itself is not input.
 * Without this the screen dims in the middle of a song.
 *
 * Releasing matters as much as asking: a lock that is never released keeps the
 * machine awake forever.
 *
 * THE LOCK IS A BONUS, NEVER A REQUIREMENT. It can be refused, and on some
 * browsers it does not exist at all. When that happens the app keeps scrolling
 * and says nothing — no warning, no banner, no disabled button. The screen may
 * dim, which is a small annoyance; stopping the music over it would be a big
 * one. So every failure here is swallowed on purpose.
 */
export function useWakeLock() {
	const isAutoScrolling = useAtomValue(isAutoScrollingAtom);

	// A ref, not state: the handle is not for drawing, and nothing should
	// re-render because we did or did not get one.
	const sentinelRef = useRef<WakeLockSentinel | null>(null);

	useEffect(() => {
		if (!isAutoScrolling) return;

		// The effect can be torn down while a request is still in flight.
		let abandoned = false;

		const release = () => {
			const sentinel = sentinelRef.current;
			sentinelRef.current = null;
			// Already released, or the tab is gone — either way, nothing to report.
			sentinel?.release().catch(() => {});
		};

		const acquire = async () => {
			if (!("wakeLock" in navigator)) return;
			if (sentinelRef.current) return;

			try {
				const sentinel = await navigator.wakeLock.request("screen");

				// We stopped scrolling while the browser was thinking about it.
				if (abandoned) {
					sentinel.release().catch(() => {});
					return;
				}

				// The browser drops the lock by itself when the tab is hidden. Note
				// that here so the visibility handler below knows to ask again.
				sentinel.addEventListener("release", () => {
					if (sentinelRef.current === sentinel) sentinelRef.current = null;
				});

				sentinelRef.current = sentinel;
			} catch {
				// Refused. Keep scrolling, say nothing.
			}
		};

		// Coming back to the tab: if we are still scrolling and no longer hold a
		// lock, ask again. Nothing is done at the moment the tab is hidden — the
		// browser has already taken the lock back.
		const onVisibilityChange = () => {
			if (document.visibilityState === "visible") void acquire();
		};

		void acquire();
		document.addEventListener("visibilitychange", onVisibilityChange);

		return () => {
			abandoned = true;
			document.removeEventListener("visibilitychange", onVisibilityChange);
			release();
		};
	}, [isAutoScrolling]);
}
