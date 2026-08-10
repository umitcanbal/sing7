import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Strum } from "../rpc/client.gen";
import { StrumGrid, splitSlots } from "./StrumGrid";

// Every cell of the grid, in reading order: the stroke row then the beat row.
function cells(container: HTMLElement) {
	return [...(container.querySelector(".strum")?.children ?? [])].map(
		(cell) => cell.textContent,
	);
}

function columnCount(container: HTMLElement) {
	const grid = container.querySelector<HTMLElement>(".strum");
	return grid?.style.gridTemplateColumns ?? "";
}

describe("splitSlots", () => {
	it("splits a row into one token per slot", () => {
		expect(splitSlots("↓ · x ↑ · ↑ ↓ ↑")).toEqual([
			"↓",
			"·",
			"x",
			"↑",
			"·",
			"↑",
			"↓",
			"↑",
		]);
	});

	it("ignores padding and runs of spaces", () => {
		expect(splitSlots("  ↓   ↑  ")).toEqual(["↓", "↑"]);
	});

	it("keeps multi-character beats as one slot each", () => {
		// The reason the grid is columns and not preformatted text.
		expect(splitSlots("9 & 10 & 11 &")).toEqual([
			"9",
			"&",
			"10",
			"&",
			"11",
			"&",
		]);
	});
});

describe("StrumGrid", () => {
	it("renders nothing at all when the song has no pattern", () => {
		const { container } = render(<StrumGrid patterns={[]} />);
		// No empty box, no heading, nothing.
		expect(container.innerHTML).toBe("");
	});

	it("keeps a stroke and its beat in the same column past slot nine", () => {
		// Everlong's 24-slot pattern: beats 10, 11 and 12 are two characters wide
		// while every stroke is one. As plain text the rows would drift apart from
		// the tenth slot on; as a grid, column 19 holds "▼" over "10".
		const pattern: Strum = {
			strokes: "↓ ↓ ▼ ↓ ▼ ↓ ▼ ↓ ▼ ↓ ↓ ↓ ▼ ↓ ▼ ↓ ↓ ↓ ▼ ↓ ▼ ↓ ↓ ↓",
			beats: "1 & 2 & 3 & 4 & 5 & 6 & 7 & 8 & 9 & 10 & 11 & 12 &",
		};
		const { container } = render(<StrumGrid patterns={[pattern]} />);

		const slots = splitSlots(pattern.strokes).length;
		expect(slots).toBe(24);
		expect(columnCount(container)).toContain("repeat(24");

		// The grid holds both rows back to back, so cell i and cell i+slots are
		// the two halves of one column.
		const grid = cells(container);
		expect(grid).toHaveLength(slots * 2);
		expect(grid[18]).toBe("▼");
		expect(grid[18 + slots]).toBe("10");
	});

	it("shows a label when the pattern has one", () => {
		const { container } = render(
			<StrumGrid
				patterns={[{ label: "Intro / verse", strokes: "↓ ↑", beats: "1 &" }]}
			/>,
		);
		expect(container.textContent).toContain("Intro / verse");
	});

	it("shows no label element when the pattern has none", () => {
		// 5 of the 12 real patterns have no label.
		const { container } = render(
			<StrumGrid patterns={[{ strokes: "↓ ↑", beats: "1 &" }]} />,
		);
		expect(container.querySelector("p")).toBeNull();
	});

	it("shows every pattern, one below the other", () => {
		// No tabs, no carousel, no picking one.
		const { container } = render(
			<StrumGrid
				patterns={[
					{ label: "Intro / verse", strokes: "↓ ↑", beats: "1 &" },
					{ label: "Chorus", strokes: "↓ ↓", beats: "1 &" },
				]}
			/>,
		);
		expect(container.querySelectorAll(".strum")).toHaveLength(2);
		expect(container.textContent).toContain("Intro / verse");
		expect(container.textContent).toContain("Chorus");
	});

	it("does not tear the grid when the two rows disagree", () => {
		// Does not happen in the real files, but a short row must leave empty
		// cells rather than shifting everything after it.
		const { container } = render(
			<StrumGrid patterns={[{ strokes: "↓ ↑ ↓", beats: "1 &" }]} />,
		);
		expect(columnCount(container)).toContain("repeat(3");
		expect(cells(container)).toEqual(["↓", "↑", "↓", "1", "&", ""]);
	});
});
