import { act, renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { isAutoScrollingAtom, scrollSpeedAtom } from "./atoms";
import { useAutoScroll } from "./useAutoScroll";

/*
 * jsdom has no layout and does not scroll, so the page is faked: a settable
 * scroll position, a fixed viewport, and a song element whose position we
 * decide. Frames are driven by hand rather than by a real screen, which is what
 * makes "half a second passed" something a test can state exactly.
 */
function stubPage({
	songTop = 300,
	songHeight = 3700,
	viewport = 800,
	docHeight = 6000,
}: {
	songTop?: number;
	songHeight?: number;
	viewport?: number;
	docHeight?: number;
} = {}) {
	let scrollY = 0;
	let nextFrameId = 1;
	const frames = new Map<number, FrameRequestCallback>();

	Object.defineProperty(window, "scrollY", {
		configurable: true,
		get: () => scrollY,
	});
	Object.defineProperty(window, "innerHeight", {
		configurable: true,
		value: viewport,
	});
	Object.defineProperty(document.documentElement, "scrollHeight", {
		configurable: true,
		get: () => docHeight,
	});
	// The engine always calls the two-argument form, scrollTo(0, y).
	window.scrollTo = ((_x: number, y: number) => {
		scrollY = y;
	}) as typeof window.scrollTo;
	window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
		const id = nextFrameId++;
		frames.set(id, callback);
		return id;
	}) as typeof window.requestAnimationFrame;
	window.cancelAnimationFrame = ((id: number) => {
		frames.delete(id);
	}) as typeof window.cancelAnimationFrame;

	const element = document.createElement("div");
	// The song's position on the page, converted to viewport coordinates the way
	// a real getBoundingClientRect would.
	element.getBoundingClientRect = () =>
		({
			top: songTop - scrollY,
			bottom: songTop + songHeight - scrollY,
			height: songHeight,
			left: 0,
			right: 0,
			width: 0,
			x: 0,
			y: songTop - scrollY,
			toJSON: () => ({}),
		}) as DOMRect;
	document.body.appendChild(element);

	return {
		element,
		get scrollY() {
			return scrollY;
		},
		setScrollY(value: number) {
			scrollY = value;
		},
		pendingFrames: () => frames.size,
		/** Run every frame that is waiting, as if `now` milliseconds had passed. */
		runFrame(now: number) {
			const pending = [...frames.values()];
			frames.clear();
			act(() => {
				for (const callback of pending) callback(now);
			});
		},
	};
}

function start(page: ReturnType<typeof stubPage>, speed = 100) {
	const store = createStore();
	store.set(scrollSpeedAtom, speed);

	const ref = { current: page.element };
	renderHook(() => useAutoScroll(ref), {
		wrapper: ({ children }: { children: ReactNode }) => (
			<Provider store={store}>{children}</Provider>
		),
	});

	const run = () => act(() => store.set(isAutoScrollingAtom, true));
	return { store, run, isRunning: () => store.get(isAutoScrollingAtom) };
}

afterEach(() => {
	document.body.innerHTML = "";
});

describe("useAutoScroll — where it starts", () => {
	it("jumps to the song's first line on a song you have not scrolled", () => {
		const page = stubPage(); // song starts at 300, window is 800 tall
		const { run } = start(page);

		run();

		// Past the title, artist, info line and strum grid — but stopping 200px
		// short of the song, so the first line lands a quarter of the way down the
		// window instead of against the top edge, where it would start vanishing
		// straight away.
		expect(page.scrollY).toBe(100);
	});

	it("carries on from where you are if you stopped in the middle", () => {
		const page = stubPage();
		page.setScrollY(1500);
		const { run } = start(page);

		run();

		// No jump — you paused to work on a chord and pressed play again.
		expect(page.scrollY).toBe(1500);
	});

	it("jumps back to the first line when you press play at the end", () => {
		const page = stubPage(); // end = 4000 - 800 = 3200
		page.setScrollY(3200);
		const { run } = start(page);

		run();

		// The same landing spot as a fresh song, lead-in included.
		expect(page.scrollY).toBe(100);
	});
});

describe("useAutoScroll — moving", () => {
	it("moves 10 pixels in a second at 100%", () => {
		const page = stubPage();
		const { run } = start(page, 100);

		run();
		page.runFrame(0); // first frame only sets the clock
		page.runFrame(1000);

		expect(page.scrollY).toBeCloseTo(110, 5);
	});

	it("changes speed mid-scroll without jumping or restarting", () => {
		const page = stubPage();
		const { run, store } = start(page, 100);

		run();
		page.runFrame(0);
		page.runFrame(1000);
		expect(page.scrollY).toBeCloseTo(110, 5);

		// Drag the slider while it is moving.
		act(() => store.set(scrollSpeedAtom, 200));
		page.runFrame(2000);

		// 20px in the next second, carrying on from 110 — not restarted from 100,
		// which is what would happen if the speed tore the loop down and rebuilt it.
		expect(page.scrollY).toBeCloseTo(130, 5);
	});
});

describe("useAutoScroll — where it stops", () => {
	it("stops at the end of the song and puts the button back to play", () => {
		const page = stubPage();
		page.setScrollY(3190); // 10px short of the end at 3200
		const { run, isRunning } = start(page);

		run();
		page.runFrame(0);
		page.runFrame(1000); // would travel 20px, but only 10px remain

		expect(page.scrollY).toBe(3200);
		expect(isRunning()).toBe(false);
		expect(page.pendingFrames()).toBe(0);
	});

	it("stops at the song's end, not the page's", () => {
		// The document scrolls to 5200, but the song ends at 3200 — below it sit
		// the Song info box and the page padding, which are not part of the song.
		const page = stubPage();
		page.setScrollY(3190);
		const { run } = start(page);

		run();
		page.runFrame(0);
		page.runFrame(1000);

		expect(page.scrollY).toBe(3200);
		expect(page.scrollY).toBeLessThan(6000 - 800);
	});

	it("does nothing at all when the song fits on one screen", () => {
		const page = stubPage({ songHeight: 400, docHeight: 1000 });
		const { run, isRunning } = start(page);

		run();

		// No jump, no frames, and the button goes straight back to play.
		expect(page.scrollY).toBe(0);
		expect(isRunning()).toBe(false);
		expect(page.pendingFrames()).toBe(0);
	});
});

describe("useAutoScroll — a hand scroll stops it", () => {
	it("pauses when you scroll with the wheel", () => {
		const page = stubPage();
		const { run, isRunning } = start(page);

		run();
		page.runFrame(0);
		page.runFrame(1000);
		expect(isRunning()).toBe(true);

		// You turn the wheel: the page moves somewhere we did not put it.
		page.setScrollY(2000);
		page.runFrame(2000);

		expect(isRunning()).toBe(false);
		expect(page.pendingFrames()).toBe(0);
		// And it does not drag the page back to where it had got to.
		expect(page.scrollY).toBe(2000);
	});

	it("is not fooled by the browser rounding its own scrolling", () => {
		const page = stubPage();
		const { run, isRunning } = start(page);

		run();
		page.runFrame(0);
		page.runFrame(1000);

		// Browsers settle on device pixels; a fraction out is us, not a human.
		page.setScrollY(page.scrollY + 0.4);
		page.runFrame(2000);

		expect(isRunning()).toBe(true);
	});
});
