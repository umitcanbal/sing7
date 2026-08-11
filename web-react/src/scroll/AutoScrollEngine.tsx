import type { RefObject } from "react";
import { useAutoScroll } from "./useAutoScroll";

/*
 * Runs the auto-scroll. Draws nothing.
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
	return null;
}
