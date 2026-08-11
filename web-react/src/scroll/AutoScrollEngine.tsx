import type { RefObject } from "react";
import { useAutoScroll } from "./useAutoScroll";
import { useScrollKeys } from "./useScrollKeys";
import { useWakeLock } from "./useWakeLock";

/*
 * Runs everything about the auto-scroll. Draws nothing.
 *
 * Three hooks, three separate concerns, deliberately not merged: the frame loop
 * that moves the page, the spacebar that starts and stops it, and the wake lock
 * that keeps the screen on. They have different lifetimes and different ways of
 * failing — the key listener has to be alive while the scroll is *stopped*, and
 * the wake lock is allowed to fail silently while nothing else is.
 *
 * A component that returns null looks odd until you notice that useAutoScroll
 * has no markup to contribute — it drives the window, it does not draw. So its
 * host should draw nothing either. "Who scrolls the page" and "who draws the
 * song" are unrelated jobs, and this keeps them apart.
 *
 * Keeping them apart also happens to matter a lot for speed. The hook
 * subscribes to the speed atom, and the slider fires on every step of a drag —
 * many times a second. A subscription costs exactly what the subscribing
 * component renders, so with the hook up in the song page every one of those
 * steps re-rendered the whole song: every section, every line, every part, all
 * returning identical markup, all while the frame loop was trying to scroll.
 *
 * Down here the same change costs one function call, one ref assignment, and a
 * null compared against a null — the same whether the song has ten lines or a
 * thousand.
 *
 * The ref is safe to use however this sits in the JSX: React attaches every ref
 * in the commit phase, before any effect runs.
 */
export function AutoScrollEngine({
	songBodyRef,
}: {
	songBodyRef: RefObject<HTMLElement | null>;
}) {
	useAutoScroll(songBodyRef);
	useScrollKeys();
	useWakeLock();
	return null;
}
