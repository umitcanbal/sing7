import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

/*
 * Almost nothing in this app is client state. This is the whole list.
 *
 * Both values are read and written in two places far apart in the tree — the
 * control bar at the bottom of the screen, and the scroll loop that drives the
 * window. Passing setters down through the page would be the classic mess, so
 * they live in Jotai instead.
 */

export const MIN_SPEED = 10;
export const MAX_SPEED = 300;
export const DEFAULT_SPEED = 100;

/*
 * The scroll speed as a percentage. One setting for every song, not one per
 * song — otherwise the app fills up with settings nobody chose on purpose.
 *
 * atomWithStorage keeps it in localStorage, so it survives songs and reloads.
 */
export const scrollSpeedAtom = atomWithStorage(
	"sing7:scroll-speed",
	DEFAULT_SPEED,
);

/*
 * Is the auto-scroll running?
 *
 * Not `isScrolling`: the page also scrolls when you turn the wheel, and that
 * name would sound like "the page is moving", which is a larger and different
 * idea. Not `isPlaying` either: the button is a play button, but nothing is
 * playing — no sound comes out of this app, and a reader seeing `isPlaying`
 * would go looking for audio code.
 *
 * Memory only. Whether the scroll was running is not worth restoring.
 */
export const isAutoScrollingAtom = atom(false);
