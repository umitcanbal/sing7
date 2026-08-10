import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Meta } from "../rpc/client.gen";
import { infoLine, SongMeta } from "./SongMeta";

/*
 * The generated client types an absent field as `capo?: number`, i.e. number or
 * undefined. The Go server actually sends `"capo": null` — an absent int32 is
 * marshalled as null, not left out. So the wire carries a value the types say
 * cannot happen, and this cast is how a test describes what really arrives.
 *
 * infoLine uses `!= null`, which catches both, so nothing is broken. But do not
 * "tidy" such a check into `!== undefined`: it would pass type-checking and be
 * wrong at runtime for 22 of the 28 songs.
 */
const wire = (raw: Record<string, unknown>) => raw as Meta;

describe("infoLine", () => {
	it("shows only the fields the song actually has", () => {
		// Don't Panic: key, tempo, time and year, but no capo.
		expect(
			infoLine({ key: "F", tempo: "122 BPM", time: "4/4", year: 2000 }),
		).toEqual(["Key F", "122 BPM", "4/4", "2000"]);
	});

	it("skips a capo that is absent", () => {
		// 22 of the 28 songs send capo as null rather than leaving it out.
		expect(infoLine(wire({ key: "F", capo: null }))).toEqual(["Key F"]);
		expect(infoLine({ key: "F" })).toEqual(["Key F"]);
	});

	it("keeps a capo of 0, which means something different from absent", () => {
		expect(infoLine({ capo: 0 })).toEqual(["Capo 0"]);
	});

	it("returns nothing when the song has no facts at all", () => {
		expect(infoLine({})).toEqual([]);
	});

	it("keeps a long key exactly as written", () => {
		// Real values include "B (capo 2 → play as C shapes)".
		const key = "B (capo 2 → play as C shapes)";
		expect(infoLine({ key })).toEqual([`Key ${key}`]);
	});

	it("keeps the agreed order: key, capo, tempo, time, year", () => {
		expect(
			infoLine({
				year: 2000,
				time: "4/4",
				tempo: "122 BPM",
				capo: 2,
				key: "F",
			}),
		).toEqual(["Key F", "Capo 2", "122 BPM", "4/4", "2000"]);
	});
});

describe("SongMeta", () => {
	it("joins the facts with a dot", () => {
		const { container } = render(
			<SongMeta
				title="Don't Panic"
				artist="Coldplay"
				meta={{ key: "F", capo: 2 }}
			/>,
		);
		expect(container.textContent).toContain("Key F · Capo 2");
	});

	it("shows no info line when there is nothing to say", () => {
		const { container } = render(
			<SongMeta title="Untitled" artist="Nobody" meta={{}} />,
		);
		expect(container.querySelectorAll("p")).toHaveLength(1); // the artist only
	});
});
