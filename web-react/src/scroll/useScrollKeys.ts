import { useSetAtom } from "jotai";
import { useEffect } from "react";
import { isAutoScrollingAtom } from "./atoms";

/*
 * The spacebar starts and stops the scroll.
 *
 * This is the point of the whole app: both hands stay on the guitar, and
 * reaching for the mouse mid-song is the thing we are trying to avoid.
 *
 * There is a second reason it has to exist. The browser's own default for space
 * is "scroll down one screen", which fights the auto-scroll — so space has to be
 * caught and its default cancelled here whether we act on it or not.
 *
 * It is a separate hook from useAutoScroll, and it has to be: useAutoScroll's
 * loop only exists while the scroll is running, but the key that *starts* the
 * scroll must be listened for while it is stopped.
 */

/*
 * Some elements do something with space themselves, and we must not take it
 * from them: a text field types a space, and a focused button activates. That
 * last one matters more than it looks — after you click play with the mouse the
 * button keeps focus, so space activates the button. If we also toggled, the
 * two would cancel out and the key would appear dead.
 */
function handlesSpaceItself(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable) return true;

	switch (target.tagName) {
		case "INPUT":
		case "TEXTAREA":
		case "SELECT":
		case "BUTTON":
			return true;
		case "A":
			return target.hasAttribute("href");
		default:
			return false;
	}
}

export function useScrollKeys() {
	// The updater form means we never need to read the atom, so this hook
	// subscribes to nothing and re-renders for nothing.
	const setAutoScrolling = useSetAtom(isAutoScrollingAtom);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			// `code` is the physical key, so this holds on any keyboard layout.
			if (event.code !== "Space") return;

			// Ctrl+Space, Cmd+Space and friends belong to the system, not to us.
			if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
				return;
			}

			if (handlesSpaceItself(event.target)) return;

			// Cancel the browser's page-down before anything else, so it cannot
			// fight the scroll even on a keystroke we go on to ignore.
			event.preventDefault();

			// Holding the key down repeats it. One press, one toggle.
			if (event.repeat) return;

			setAutoScrolling((running) => !running);
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [setAutoScrolling]);
}
