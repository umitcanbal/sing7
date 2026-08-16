import { act, render } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isAutoScrollingAtom } from "./atoms";
import { useWakeLock } from "./useWakeLock";

/*
 * A stand-in for the browser's wake lock. The real one cannot be exercised in a
 * test, and the interesting behaviour here is not "does the screen stay on" but
 * "what does the app do when the lock is refused, or taken away".
 */
function stubWakeLock({ refuse = false } = {}) {
	const released: WakeLockSentinel[] = [];
	const listeners = new Map<WakeLockSentinel, () => void>();

	const request = vi.fn(async () => {
		if (refuse) throw new Error("refused");
		const sentinel = {
			released: false,
			release: vi.fn(async () => {
				released.push(sentinel as unknown as WakeLockSentinel);
			}),
			addEventListener: (_type: string, handler: () => void) => {
				listeners.set(sentinel as unknown as WakeLockSentinel, handler);
			},
		};
		return sentinel as unknown as WakeLockSentinel;
	});

	Object.defineProperty(navigator, "wakeLock", {
		configurable: true,
		value: { request },
	});

	return {
		request,
		releasedCount: () => released.length,
		/** The browser takes the lock back, as it does when the tab is hidden. */
		dropFromOutside() {
			for (const handler of listeners.values()) handler();
			listeners.clear();
		},
	};
}

function removeWakeLock() {
	delete (navigator as { wakeLock?: unknown }).wakeLock;
}

function mount(store: ReturnType<typeof createStore>) {
	function Holder() {
		useWakeLock();
		return null;
	}
	return render(
		<Provider store={store}>
			<Holder />
		</Provider>,
	);
}

/** Let the promise inside the hook settle. */
const settle = () => act(async () => {});

function setVisibility(state: DocumentVisibilityState) {
	Object.defineProperty(document, "visibilityState", {
		configurable: true,
		value: state,
	});
	act(() => {
		document.dispatchEvent(new Event("visibilitychange"));
	});
}

afterEach(() => {
	removeWakeLock();
	setVisibility("visible");
	vi.restoreAllMocks();
});

describe("useWakeLock", () => {
	it("asks for nothing until the scroll starts", async () => {
		const lock = stubWakeLock();
		const store = createStore();
		mount(store);
		await settle();

		expect(lock.request).not.toHaveBeenCalled();
	});

	it("asks when the scroll starts", async () => {
		const lock = stubWakeLock();
		const store = createStore();
		mount(store);

		act(() => store.set(isAutoScrollingAtom, true));
		await settle();

		expect(lock.request).toHaveBeenCalledWith("screen");
	});

	it("releases the moment the scroll stops", async () => {
		// A lock that is never released keeps the machine awake forever.
		const lock = stubWakeLock();
		const store = createStore();
		mount(store);

		act(() => store.set(isAutoScrollingAtom, true));
		await settle();
		act(() => store.set(isAutoScrollingAtom, false));
		await settle();

		expect(lock.releasedCount()).toBe(1);
	});

	it("releases when the page goes away mid-scroll", async () => {
		const lock = stubWakeLock();
		const store = createStore();
		const { unmount } = mount(store);

		act(() => store.set(isAutoScrollingAtom, true));
		await settle();
		act(() => unmount());
		await settle();

		expect(lock.releasedCount()).toBe(1);
	});

	it("keeps going when the browser refuses", async () => {
		// The lock is a bonus, never a requirement: no throw, no warning, and the
		// scroll is left running.
		stubWakeLock({ refuse: true });
		const store = createStore();
		mount(store);

		act(() => store.set(isAutoScrollingAtom, true));
		await settle();

		expect(store.get(isAutoScrollingAtom)).toBe(true);
	});

	it("keeps going when the browser has no wake lock at all", async () => {
		removeWakeLock();
		const store = createStore();
		mount(store);

		act(() => store.set(isAutoScrollingAtom, true));
		await settle();

		expect(store.get(isAutoScrollingAtom)).toBe(true);
	});

	it("asks again when the tab comes back and the scroll is still running", async () => {
		const lock = stubWakeLock();
		const store = createStore();
		mount(store);

		act(() => store.set(isAutoScrollingAtom, true));
		await settle();
		expect(lock.request).toHaveBeenCalledTimes(1);

		// Switching tab: the browser takes the lock back by itself.
		lock.dropFromOutside();
		setVisibility("hidden");
		await settle();

		// Coming back.
		setVisibility("visible");
		await settle();

		expect(lock.request).toHaveBeenCalledTimes(2);
	});

	it("does not ask twice when it still holds a lock", async () => {
		const lock = stubWakeLock();
		const store = createStore();
		mount(store);

		act(() => store.set(isAutoScrollingAtom, true));
		await settle();

		// A visibility change that did not cost us the lock.
		setVisibility("visible");
		await settle();

		expect(lock.request).toHaveBeenCalledTimes(1);
	});

	it("does not ask when the tab returns but the scroll has stopped", async () => {
		const lock = stubWakeLock();
		const store = createStore();
		mount(store);

		act(() => store.set(isAutoScrollingAtom, true));
		await settle();
		act(() => store.set(isAutoScrollingAtom, false));
		await settle();

		setVisibility("visible");
		await settle();

		expect(lock.request).toHaveBeenCalledTimes(1);
	});
});
