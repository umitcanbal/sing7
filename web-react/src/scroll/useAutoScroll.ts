import { useAtomValue, useSetAtom } from "jotai";
import { type RefObject, useEffect, useRef } from "react";
import { isAutoScrollingAtom, scrollSpeedAtom } from "./atoms";

/*
 * 100% = 10 pixels per second. One named constant, not a feel.
 *
 * Tuned against real songs on screen, which is what the requirements said to do
 * once there was something to play along with. It started at 20, and 50% turned
 * out to be the speed you actually want — so that speed became 100%, and the
 * slider now opens on it instead of needing dragging down every time.
 *
 * At this rate a typical rendered line — a chord row plus a lyric row, around
 * 60px tall — takes about six seconds to pass.
 *
 * Tune it here and nowhere else: the SvelteKit app uses the same number, or the
 * two builds scroll at different speeds.
 */
export const PIXELS_PER_SECOND_AT_100 = 10;

/*
 * How far the real scroll position may drift from the position we asked for
 * before we call it a human. Browsers round scroll positions to device pixels,
 * so an exact match is not something to rely on.
 */
export const HAND_SCROLL_TOLERANCE = 2;

/** How far the song may be from its end before we call it finished. */
const END_TOLERANCE = 0.5;

/*
 * How far down the window the song's first line should land when you press
 * play, as a fraction of the window's height.
 *
 * Without this the first line sits hard against the top edge and starts leaving
 * immediately — it is the one line in the song that gets no time on screen,
 * while every other line enters at the bottom and travels a whole window height
 * before it goes. A quarter of the way down gives you the first line plus the
 * next few underneath it, which is what you want to see before you start.
 *
 * A fraction rather than a fixed number of pixels, so it suits a laptop and a
 * large monitor equally. Tune it by feel, like the speed above.
 */
export const LEAD_IN_FRACTION = 0.25;

export type PageMeasurements = {
	/** Distance from the top of the document to the first line of the song. */
	songTop: number;
	/** Distance from the top of the document to the end of the song, tail included. */
	songBottom: number;
	viewportHeight: number;
	/** The furthest the page can be scrolled. */
	maxScroll: number;
};

/*
 * Where the scroll starts and where it ends — both measured from the song, not
 * from the page.
 *
 * The song is not the last thing on the page: the closed "Song info" box sits
 * below it on every song. Scrolling to the bottom of the *page* would creep on
 * past the last lyric line and through that box. Measuring the song block also
 * means opening the info box mid-song cannot move the finishing line, even
 * though it makes the page taller.
 *
 * The two ends are not symmetrical, and that is deliberate:
 *
 *  - `songBottom` already includes the song's tail space — the blank strip the
 *    height of the control bar — so stopping with it at the bottom edge of the
 *    window leaves the last line sitting just clear of the bar. It then rests
 *    there, in plain sight, for as long as you like.
 *  - The start needs help instead. Scrolling exactly to `songTop` puts the
 *    first line against the top edge, where it starts disappearing at once. So
 *    we stop short of the song's top by the lead-in, and the first line lands
 *    a comfortable way down the window with the next few visible below it.
 *
 * The lead-in is taken here rather than as padding inside SongBody: padding big
 * enough to matter would show as a large empty gap above the song before you
 * ever press play. This way the page is untouched and only the landing spot
 * moves.
 */
export function songScrollRange({
	songTop,
	songBottom,
	viewportHeight,
	maxScroll,
}: PageMeasurements): { start: number; end: number } {
	const leadIn = viewportHeight * LEAD_IN_FRACTION;
	const start = clamp(songTop - leadIn, 0, maxScroll);
	const end = clamp(songBottom - viewportHeight, 0, maxScroll);
	return { start, end };
}

/** How far to move this frame. Elapsed time, so 60Hz and 120Hz screens agree. */
export function pixelsPerFrame(speedPercent: number, seconds: number): number {
	return (speedPercent / 100) * PIXELS_PER_SECOND_AT_100 * seconds;
}

/*
 * Did a human scroll?
 *
 * Our own scrolling fires scroll events too, so listening for them tells us
 * nothing. Instead we remember the position the browser settled on after each
 * frame; if the position at the start of the next frame is not that, something
 * other than us moved the page.
 */
export function isHandScroll(actual: number, expected: number): boolean {
	return Math.abs(actual - expected) > HAND_SCROLL_TOLERANCE;
}

function clamp(value: number, low: number, high: number): number {
	return Math.min(Math.max(value, low), high);
}

function measure(element: HTMLElement): PageMeasurements {
	const rect = element.getBoundingClientRect();
	const scrollY = window.scrollY;
	return {
		songTop: rect.top + scrollY,
		songBottom: rect.bottom + scrollY,
		viewportHeight: window.innerHeight,
		maxScroll: Math.max(
			0,
			document.documentElement.scrollHeight - window.innerHeight,
		),
	};
}

/*
 * The scroll engine. All of the scroll behaviour lives here, because it is the
 * most stateful thing in the app and the easiest to get subtly wrong.
 */
export function useAutoScroll(songBodyRef: RefObject<HTMLElement | null>) {
	const isAutoScrolling = useAtomValue(isAutoScrollingAtom);
	const setAutoScrolling = useSetAtom(isAutoScrollingAtom);
	const speed = useAtomValue(scrollSpeedAtom);

	/*
	 * The speed is read inside the frame loop through a ref, not from the atom
	 * directly. If it were a dependency of the effect below, dragging the slider
	 * would tear the loop down and build a new one — which would re-run the
	 * "where do we start from" decision and could jump the page mid-song.
	 * A ref lets the speed change take effect on the very next frame instead.
	 */
	const speedRef = useRef(speed);
	useEffect(() => {
		speedRef.current = speed;
	}, [speed]);

	useEffect(() => {
		if (!isAutoScrolling) return;

		const element = songBodyRef.current;
		if (!element) return;

		const { start, end } = songScrollRange(measure(element));

		// A song that fits on one screen has nothing to scroll. Do nothing at all
		// and put the button straight back to play — no jump, no flicker.
		if (end <= start) {
			setAutoScrolling(false);
			return;
		}

		// Where do we start from?
		//  - opened the song and not scrolled yet -> jump to the first line
		//  - reached the end and pressed play again -> jump back to the first line
		//  - stopped in the middle to work on a chord -> carry on from here
		const atEnd = window.scrollY >= end - END_TOLERANCE;
		const untouched = window.scrollY <= 0;
		if (untouched || atEnd) window.scrollTo(0, start);

		// The position we are aiming for, kept as a float. Asking the browser for
		// an exact position each frame beats nudging it by a fraction of a pixel,
		// because the leftover fractions are ours to keep rather than the
		// browser's to round away.
		let position = window.scrollY;
		let expected: number = window.scrollY;
		let previousTime: number | null = null;
		let frameId = 0;

		const frame = (now: number) => {
			if (isHandScroll(window.scrollY, expected)) {
				// Scrolling by hand stops it, exactly as if you pressed pause.
				setAutoScrolling(false);
				return;
			}

			// Re-measure every frame so a window resize cannot leave us aiming at a
			// finishing line that has moved.
			const range = songScrollRange(measure(element));

			if (previousTime !== null) {
				const seconds = (now - previousTime) / 1000;
				position = Math.min(
					position + pixelsPerFrame(speedRef.current, seconds),
					range.end,
				);
				window.scrollTo(0, position);
			}
			previousTime = now;

			// Read back what the browser actually did, so rounding is not mistaken
			// for a human next frame.
			expected = window.scrollY;

			if (position >= range.end - END_TOLERANCE) {
				// It stops at the end of the song, and the button goes back to play.
				setAutoScrolling(false);
				return;
			}

			frameId = requestAnimationFrame(frame);
		};

		frameId = requestAnimationFrame(frame);
		return () => cancelAnimationFrame(frameId);
	}, [isAutoScrolling, setAutoScrolling, songBodyRef]);
}
