import { act, render } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { type ReactNode, useRef } from "react";
import { describe, expect, it } from "vitest";
import { AutoScrollEngine } from "./AutoScrollEngine";
import { scrollSpeedAtom } from "./atoms";
import { useAutoScroll } from "./useAutoScroll";

/*
 * The point of AutoScrollEngine is that it is a boundary: the hook's atom
 * subscriptions live inside it, so the song around it is not re-rendered every
 * time the speed slider moves.
 *
 * A subscription costs exactly what the subscribing component renders. These
 * tests hold that line — move the hook back up into the page and the first one
 * fails.
 */

let songRenders = 0;

// Stands in for the song: everything the page draws around the engine.
function PretendSong() {
	songRenders++;
	return <p>the song</p>;
}

function wrapper(store: ReturnType<typeof createStore>) {
	return ({ children }: { children: ReactNode }) => (
		<Provider store={store}>{children}</Provider>
	);
}

describe("AutoScrollEngine", () => {
	it("draws nothing itself", () => {
		const store = createStore();
		const ref = { current: null };
		const { container } = render(<AutoScrollEngine songBodyRef={ref} />, {
			wrapper: wrapper(store),
		});
		expect(container.innerHTML).toBe("");
	});

	it("keeps a speed change away from the song", () => {
		const store = createStore();
		store.set(scrollSpeedAtom, 100);
		songRenders = 0;

		function Page() {
			const songBodyRef = useRef<HTMLDivElement>(null);
			return (
				<div ref={songBodyRef}>
					<PretendSong />
					<AutoScrollEngine songBodyRef={songBodyRef} />
				</div>
			);
		}

		render(<Page />, { wrapper: wrapper(store) });
		expect(songRenders).toBe(1);

		// Drag the slider: many of these arrive per second in real use.
		act(() => store.set(scrollSpeedAtom, 150));
		act(() => store.set(scrollSpeedAtom, 200));

		// The song was not touched. Only the engine re-rendered, and it renders
		// nothing, so the cost does not grow with the length of the song.
		expect(songRenders).toBe(1);
	});

	it("shows what it is protecting against", () => {
		// The same tree with the hook called in the page instead of behind the
		// boundary — which is how this started out. Every slider step now re-renders
		// the song, because that is where the subscription lives.
		const store = createStore();
		store.set(scrollSpeedAtom, 100);
		songRenders = 0;

		function PageWithoutBoundary() {
			const songBodyRef = useRef<HTMLDivElement>(null);
			useAutoScroll(songBodyRef);
			return (
				<div ref={songBodyRef}>
					<PretendSong />
				</div>
			);
		}

		render(<PageWithoutBoundary />, { wrapper: wrapper(store) });
		expect(songRenders).toBe(1);

		act(() => store.set(scrollSpeedAtom, 150));
		act(() => store.set(scrollSpeedAtom, 200));

		expect(songRenders).toBe(3);
	});
});
