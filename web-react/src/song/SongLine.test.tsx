import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Line } from "../rpc/client.gen";
import { SongLine } from "./SongLine";

/*
 * The five awkward cases from the requirements. Each one is a rule the app can
 * break without looking broken — a wrong result here reads as a slightly odd
 * song rather than an error, so a human might never notice. That is exactly why
 * they are tested.
 */

const line = (over: Partial<Line>): Line => ({
	chordsOnly: false,
	parts: [],
	...over,
});

// The lyric alone: every part's text half, in order, glued back together.
function lyric(container: HTMLElement) {
	return [...container.querySelectorAll(".text")]
		.map((node) => node.textContent)
		.join("");
}

// The rendered markup, with each part's chord and text read back separately.
function parts(container: HTMLElement) {
	return [...container.querySelectorAll(".part")].map((part) => ({
		chord: part.querySelector(".chord")?.textContent ?? null,
		text: part.querySelector(".text")?.textContent ?? null,
	}));
}

describe("SongLine", () => {
	it("1. draws a chord landing mid-word exactly where the file puts it", () => {
		// Don't Panic really does split "like" across two parts. The app never
		// moves a chord to the nearest word start.
		const { container } = render(
			<SongLine
				line={line({
					parts: [
						{ chord: "Am", text: "Bones, sinking l" },
						{ chord: "C", text: "ike stones" },
					],
				})}
			/>,
		);

		expect(parts(container)).toEqual([
			{ chord: "Am", text: "Bones, sinking l" },
			{ chord: "C", text: "ike stones" },
		]);
		// Joined back together the text halves must still read as one sentence.
		// (container.textContent would interleave the chord names, so the lyric
		// is only contiguous once the chord rows are left out.)
		expect(lyric(container)).toBe("Bones, sinking like stones");
	});

	it("2. gives a lyric line with no chord above it no chord row at all", () => {
		const { container } = render(
			<SongLine line={line({ parts: [{ text: "All that we fought for" }] })} />,
		);

		// The variant class is what removes the row; reserving blank space would
		// nearly double the height of a song.
		expect(
			container.querySelector(".line")?.classList.contains("line--no-chords"),
		).toBe(true);
	});

	it("2b. keeps an empty chord row for a chordless part on a chorded line", () => {
		// The case the architecture doc's "leave out the empty half" rule misses:
		// without the empty chord row this part's lyric would ride up level with
		// its neighbour's chord, tearing the sentence in half.
		const { container } = render(
			<SongLine
				line={line({
					parts: [
						{ text: "All that we " },
						{ chord: "Fmaj7", text: "fought for" },
					],
				})}
			/>,
		);

		expect(
			container.querySelector(".line")?.classList.contains("line--chorded"),
		).toBe(true);
		expect(parts(container)).toEqual([
			{ chord: "", text: "All that we " },
			{ chord: "Fmaj7", text: "fought for" },
		]);
	});

	it("3. gives a chords-only line no lyric row beneath it", () => {
		const { container } = render(
			<SongLine
				line={line({
					chordsOnly: true,
					parts: [{ chord: "Am" }, { chord: "C" }, { chord: "Fmaj7" }],
				})}
			/>,
		);

		expect(
			container.querySelector(".line")?.classList.contains("line--chords-only"),
		).toBe(true);
		// No .text elements at all — the empty half really is left out here.
		expect(container.querySelectorAll(".text")).toHaveLength(0);
		expect(parts(container)).toEqual([
			{ chord: "Am", text: null },
			{ chord: "C", text: null },
			{ chord: "Fmaj7", text: null },
		]);
	});

	it("4. shows a note at the end of a line, exactly as written", () => {
		const { container } = render(
			<SongLine
				line={line({
					parts: [{ chord: "Am", text: "Bones" }],
					annotation: "(×2)",
				})}
			/>,
		);

		const note = container.querySelector(".annotation");
		// Never dropped, and never reworded — "(×2)" and "(2x)" both occur.
		expect(note?.textContent).toBe("(×2)");
	});

	it("4b. keeps a long note whole", () => {
		// Real data has notes that are whole sentences, not just (×2).
		const long = "(charakteristický kytarový riff, viz UG)";
		const { container } = render(
			<SongLine line={line({ parts: [{ chord: "E" }], annotation: long })} />,
		);

		expect(container.querySelector(".annotation")?.textContent).toBe(long);
	});

	it("renders no note element when the line has none", () => {
		const { container } = render(
			<SongLine line={line({ parts: [{ chord: "Am", text: "Bones" }] })} />,
		);

		expect(container.querySelector(".annotation")).toBeNull();
	});
});
