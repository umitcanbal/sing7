import { act, render } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, describe, expect, it } from "vitest";
import { isAutoScrollingAtom } from "./atoms";
import { useScrollKeys } from "./useScrollKeys";

function mount(store: ReturnType<typeof createStore>) {
	function Listener() {
		useScrollKeys();
		return null;
	}
	render(
		<Provider store={store}>
			<Listener />
		</Provider>,
	);
}

/** Press space on whatever currently has focus, and report the event. */
function pressSpace(options: KeyboardEventInit = {}) {
	const event = new KeyboardEvent("keydown", {
		code: "Space",
		key: " ",
		bubbles: true,
		cancelable: true,
		...options,
	});
	act(() => {
		(document.activeElement ?? window).dispatchEvent(event);
	});
	return event;
}

afterEach(() => {
	document.body.innerHTML = "";
});

describe("useScrollKeys", () => {
	it("starts the scroll on space, and stops it on the next press", () => {
		const store = createStore();
		mount(store);

		pressSpace();
		expect(store.get(isAutoScrollingAtom)).toBe(true);

		pressSpace();
		expect(store.get(isAutoScrollingAtom)).toBe(false);
	});

	it("cancels the browser's page-down", () => {
		// The browser's default for space is "scroll down one screen", which would
		// fight the auto-scroll.
		const store = createStore();
		mount(store);

		expect(pressSpace().defaultPrevented).toBe(true);
	});

	it("does not toggle repeatedly while the key is held", () => {
		const store = createStore();
		mount(store);

		pressSpace();
		expect(store.get(isAutoScrollingAtom)).toBe(true);

		// Holding the key repeats it. One press, one toggle — but the page-down is
		// still cancelled for every repeat.
		const repeat = pressSpace({ repeat: true });
		expect(repeat.defaultPrevented).toBe(true);
		expect(store.get(isAutoScrollingAtom)).toBe(true);
	});

	it("leaves space alone in a text field", () => {
		// The search box has to be able to type a space.
		const store = createStore();
		mount(store);

		const input = document.createElement("input");
		document.body.appendChild(input);
		input.focus();

		const event = pressSpace();

		expect(store.get(isAutoScrollingAtom)).toBe(false);
		expect(event.defaultPrevented).toBe(false);
	});

	it("leaves space alone on a focused button", () => {
		// After you click play with the mouse the button keeps focus, and space
		// activates it. If we toggled as well the two would cancel out and the key
		// would look dead.
		const store = createStore();
		mount(store);

		const button = document.createElement("button");
		document.body.appendChild(button);
		button.focus();

		const event = pressSpace();

		expect(store.get(isAutoScrollingAtom)).toBe(false);
		expect(event.defaultPrevented).toBe(false);
	});

	it("ignores space held with a modifier", () => {
		// Cmd+Space and friends belong to the system.
		const store = createStore();
		mount(store);

		const event = pressSpace({ metaKey: true });

		expect(store.get(isAutoScrollingAtom)).toBe(false);
		expect(event.defaultPrevented).toBe(false);
	});

	it("ignores every other key", () => {
		const store = createStore();
		mount(store);

		act(() => {
			window.dispatchEvent(
				new KeyboardEvent("keydown", { code: "KeyK", key: "k" }),
			);
		});

		expect(store.get(isAutoScrollingAtom)).toBe(false);
	});
});
