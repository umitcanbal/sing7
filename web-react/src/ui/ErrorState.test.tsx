import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorState } from "./ErrorState";

describe("ErrorState", () => {
	it("shows a plain sentence and a Retry button", () => {
		const { container, getByRole } = render(
			<ErrorState message="Can't reach the song library." onRetry={() => {}} />,
		);

		expect(container.textContent).toContain("Can't reach the song library.");
		expect(getByRole("button").textContent).toBe("Retry");
	});

	it("retries without reloading the page", () => {
		// Retry re-runs the query, so nothing else in the app is thrown away.
		const onRetry = vi.fn();
		const { getByRole } = render(
			<ErrorState message="Can't reach it." onRetry={onRetry} />,
		);

		fireEvent.click(getByRole("button"));

		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it("says nothing a developer would write", () => {
		// No stack, no status code, no "Failed to fetch" — none of it tells a
		// person holding a guitar anything they can act on.
		const { container } = render(
			<ErrorState message="Can't reach the song library." onRetry={() => {}} />,
		);

		const text = container.textContent ?? "";
		expect(text).not.toMatch(/failed to fetch|networkerror|\bat \w+|\d{3}/i);
	});

	it("is announced as an alert", () => {
		const { getByRole } = render(
			<ErrorState message="Can't reach it." onRetry={() => {}} />,
		);

		expect(getByRole("alert")).toBeTruthy();
	});
});
