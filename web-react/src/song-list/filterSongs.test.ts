import { describe, expect, it } from "vitest";
import type { SongListItem } from "../rpc/client.gen";
import { filterSongs } from "./filterSongs";

const songs: SongListItem[] = [
	{ slug: "coldplay-dont-panic", title: "Don't Panic", artist: "Coldplay" },
	{ slug: "ac-dc-highway-to-hell", title: "Highway to Hell", artist: "AC/DC" },
	{ slug: "cechomor-severni-vitr", title: "Severní vítr", artist: "Čechomor" },
];

const titles = (result: SongListItem[]) => result.map((song) => song.title);

describe("filterSongs", () => {
	it("returns every song for an empty query", () => {
		expect(filterSongs(songs, "")).toHaveLength(3);
	});

	it("returns every song for a whitespace-only query", () => {
		// Go trims the needle first, so "   " is the same as "".
		expect(filterSongs(songs, "   ")).toHaveLength(3);
	});

	it("matches on title", () => {
		expect(titles(filterSongs(songs, "panic"))).toEqual(["Don't Panic"]);
	});

	it("matches on artist", () => {
		expect(titles(filterSongs(songs, "coldplay"))).toEqual(["Don't Panic"]);
	});

	it("ignores case", () => {
		expect(titles(filterSongs(songs, "PaNiC"))).toEqual(["Don't Panic"]);
	});

	it("matches a substring in the middle of a word", () => {
		expect(titles(filterSongs(songs, "ighwa"))).toEqual(["Highway to Hell"]);
	});

	it("returns nothing when there is no match", () => {
		expect(filterSongs(songs, "zzz")).toEqual([]);
	});

	it("keeps the order it was given", () => {
		// The backend already sorted artist-then-title; filtering must not reorder.
		// "l" is in "Coldplay" and "Hell", but not in "Severní vítr Čechomor".
		expect(titles(filterSongs(songs, "l"))).toEqual([
			"Don't Panic",
			"Highway to Hell",
		]);
	});

	it("matches letters strictly — accents are different letters", () => {
		// "severni" does NOT find "Severní vítr". This is agreed behaviour, not a bug.
		expect(filterSongs(songs, "severni")).toEqual([]);
		expect(titles(filterSongs(songs, "severní"))).toEqual(["Severní vítr"]);
	});

	it("can match across the title/artist boundary", () => {
		// Go joins them as "Title Artist" before searching, so this matches there
		// too. Mirrored on purpose: the two sides must not disagree.
		expect(titles(filterSongs(songs, "panic coldplay"))).toEqual([
			"Don't Panic",
		]);
	});
});
