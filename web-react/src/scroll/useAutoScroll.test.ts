import { describe, expect, it } from "vitest";
import {
	isHandScroll,
	LEAD_IN_FRACTION,
	PIXELS_PER_SECOND_AT_100,
	pixelsPerFrame,
	songScrollRange,
} from "./useAutoScroll";

describe("songScrollRange", () => {
	// A typical song page: the title, info line and strum grid occupy the first
	// 300px, the song runs from there, and the "Song info" box sits below it.
	const page = {
		songTop: 300,
		songBottom: 4000,
		viewportHeight: 800,
		maxScroll: 5000, // taller than the song, because of the notes box below
	};

	it("lands the first line a lead-in below the top edge, not against it", () => {
		// The song starts at 300, the window is 800 tall, so the lead-in is 200.
		// Scrolling to 100 leaves the first line 200px down the window, with the
		// next few lines under it — instead of at the very top, where it would
		// begin disappearing the moment the scroll started.
		expect(songScrollRange(page).start).toBe(100);
		expect(page.songTop - songScrollRange(page).start).toBe(
			page.viewportHeight * LEAD_IN_FRACTION,
		);
	});

	it("still leaves the title and strum grid behind", () => {
		// The lead-in is a head start, not a reason to sit at the top of the page.
		expect(songScrollRange(page).start).toBeGreaterThan(0);
	});

	it("does not scroll above the top of the page for the lead-in", () => {
		// A song whose first line is already near the top has nowhere to give.
		const nearTop = { ...page, songTop: 50 };
		expect(songScrollRange(nearTop).start).toBe(0);
	});

	it("stops at the end of the song, not the end of the page", () => {
		// The page can scroll to 5000, but the song ends well before that. Going
		// further would creep through the Song info box.
		expect(songScrollRange(page).end).toBe(4000 - 800);
		expect(songScrollRange(page).end).toBeLessThan(page.maxScroll);
	});

	it("is unmoved by the page getting taller below the song", () => {
		// Opening the <details> notes box grows the document. The finishing line
		// must not move while you are playing.
		const taller = { ...page, maxScroll: 9000 };
		expect(songScrollRange(taller).end).toBe(songScrollRange(page).end);
	});

	it("never asks for a position the page cannot reach", () => {
		// A short page: the song ends near the bottom and there is little below it.
		const shortPage = { ...page, songBottom: 4000, maxScroll: 2000 };
		expect(songScrollRange(shortPage).end).toBe(2000);
	});

	it("reports nothing to scroll when the song fits on one screen", () => {
		// end <= start is how the engine spots this; play then does nothing.
		const oneScreen = {
			songTop: 300,
			songBottom: 900,
			viewportHeight: 800,
			maxScroll: 400,
		};
		const { start, end } = songScrollRange(oneScreen);
		expect(end).toBeLessThanOrEqual(start);
	});

	it("never returns a negative position", () => {
		const tiny = {
			songTop: 0,
			songBottom: 100,
			viewportHeight: 800,
			maxScroll: 0,
		};
		const { start, end } = songScrollRange(tiny);
		expect(start).toBe(0);
		expect(end).toBe(0);
	});
});

describe("pixelsPerFrame", () => {
	it("moves 10 pixels in a second at 100%", () => {
		// Tuned against real songs. Both apps must use this number.
		expect(PIXELS_PER_SECOND_AT_100).toBe(10);
		expect(pixelsPerFrame(100, 1)).toBe(10);
	});

	it("is a percentage of that", () => {
		expect(pixelsPerFrame(50, 1)).toBe(5);
		expect(pixelsPerFrame(300, 1)).toBe(30);
		expect(pixelsPerFrame(10, 1)).toBe(1);
	});

	it("covers the same distance whatever the frame rate", () => {
		// A 60Hz screen takes 60 frames of 1/60s; a 120Hz screen takes 120 of
		// 1/120s. Both must move exactly as far in that second.
		const at60 = 60 * pixelsPerFrame(100, 1 / 60);
		const at120 = 120 * pixelsPerFrame(100, 1 / 120);
		expect(at60).toBeCloseTo(10, 10);
		expect(at120).toBeCloseTo(10, 10);
	});

	it("keeps fractions rather than rounding them away", () => {
		// At 100% a 60Hz frame is a sixth of a pixel. Rounding each frame to zero
		// would stop the page moving at all.
		expect(pixelsPerFrame(100, 1 / 60)).toBeCloseTo(0.167, 3);
	});
});

describe("isHandScroll", () => {
	it("ignores the browser rounding our own scroll", () => {
		expect(isHandScroll(1000, 1000)).toBe(false);
		expect(isHandScroll(1000.4, 1000)).toBe(false);
		expect(isHandScroll(998.5, 1000)).toBe(false);
	});

	it("spots a real scroll by hand", () => {
		// A wheel notch moves far more than a rounding error ever does.
		expect(isHandScroll(1120, 1000)).toBe(true);
		expect(isHandScroll(880, 1000)).toBe(true);
	});
});
