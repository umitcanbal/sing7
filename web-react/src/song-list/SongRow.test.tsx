import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithRouter } from "../test-router";
import { SongRow, SongRowSkeleton } from "./SongRow";

/*
 * The requirement these hold: the page must not jump when the real list
 * arrives. That only stays true if a placeholder row is laid out exactly like a
 * real one — so the test is that they are built from the same classes, rather
 * than that someone measured a row once and typed the answer in.
 */

// jsdom does no layout, so heights cannot be measured. The next best check is
// that the two share the classes that decide the height.
function rowClasses(container: HTMLElement) {
	const row = container.querySelector("[class*='py-3']") as HTMLElement;
	return new Set(row.className.split(/\s+/).filter(Boolean));
}

// SongRow contains a <Link>, so it needs a router; the placeholder does not.
const aSong = {
	slug: "coldplay-dont-panic",
	title: "Don't Panic",
	artist: "Coldplay",
};

describe("SongRowSkeleton", () => {
	it("uses the real row's spacing, so the page does not jump", async () => {
		const real = await renderWithRouter(<SongRow song={aSong} />);
		const placeholder = render(<SongRowSkeleton />);

		const realClasses = rowClasses(real.container);
		const placeholderClasses = rowClasses(placeholder.container);

		// Everything that sets padding, borders or line layout must match.
		for (const shared of [
			"flex",
			"items-baseline",
			"gap-4",
			"border-b",
			"border-neutral-200",
			"px-3",
			"py-3",
		]) {
			expect(realClasses.has(shared)).toBe(true);
			expect(placeholderClasses.has(shared)).toBe(true);
		}
	});

	it("carries the same text sizes, so the bars occupy real line boxes", () => {
		const { container } = render(<SongRowSkeleton />);

		expect(container.innerHTML).toContain("text-lg");
		expect(container.innerHTML).toContain("text-sm");
	});

	it("has no text to read out", () => {
		// It is scenery. The loading state is announced once, by the list around it.
		const { container } = render(<SongRowSkeleton />);
		expect(container.textContent).toBe("");
	});

	it("is not a link", () => {
		// There is nothing to open yet.
		const { container } = render(<SongRowSkeleton />);
		expect(container.querySelector("a")).toBeNull();
	});
});

describe("SongRow", () => {
	it("shows the key when the song has one", async () => {
		const { container } = await renderWithRouter(
			<SongRow song={{ ...aSong, key: "F" }} />,
		);
		expect(container.textContent).toContain("F");
	});

	it("shows no key when the song has none", async () => {
		const { container } = await renderWithRouter(
			<SongRow
				song={{
					slug: "the-beatles-hey-jude",
					title: "Hey Jude",
					artist: "The Beatles",
				}}
			/>,
		);
		expect(container.textContent).toBe("Hey JudeThe Beatles");
	});
});
