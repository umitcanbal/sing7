import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SongSection } from "./SongSection";

describe("SongSection", () => {
	it("5. starts an unnamed section with no heading at all", () => {
		// Nearly half the songs have no section names. No heading, no placeholder,
		// no "Untitled" — the song just starts.
		const { container } = render(
			<SongSection
				section={{ lines: [{ chordsOnly: false, parts: [{ text: "Bones" }] }] }}
			/>,
		);

		expect(container.querySelector("h2")).toBeNull();
		expect(container.textContent).toBe("Bones");
	});

	it("shows a section name in brackets when there is one", () => {
		const { container } = render(
			<SongSection
				section={{
					label: "Verse 1",
					lines: [{ chordsOnly: false, parts: [{ text: "Bones" }] }],
				}}
			/>,
		);

		expect(container.querySelector("h2")?.textContent).toBe("[Verse 1]");
	});
});
