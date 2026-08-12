import { expect, test } from "@playwright/test";

/*
 * The one end-to-end run: everything a person actually does, in one go.
 *
 * Search, watch the address change, open a song, press space, watch the page
 * scroll by itself. If any wire in the app is loose — the router, the proxy, the
 * stylesheet, the mount — this is the test that notices, because it is the only
 * one that starts the real thing.
 *
 * It uses the real library from the real Go server, so it asserts on a song that
 * genuinely exists rather than on a fixture.
 */
test("search for a song, open it, and let it scroll", async ({
	page,
	request,
}) => {
	// A clear failure beats a mysterious timeout: without the backend the app
	// shows its "can't reach the library" screen and every step below fails for
	// reasons that have nothing to do with the app.
	const health = await request
		.get("http://localhost:8080/health")
		.catch(() => null);
	expect(
		health?.ok(),
		"The Go server must be running on :8080 — start it with `go run ./cmd/server`",
	).toBe(true);

	// ---- the list ----
	await page.goto("/");

	// A list of songs arrives. No song is named here on purpose: what appears in
	// the first payload is the app's business, and would change the day the list
	// is paginated.
	//
	// nth(5) rather than count(): expect(locator) retries until it passes, while
	// `await rows.count()` answers straight away — and the list arrives after the
	// page load event, so counting immediately can catch an empty list.
	const rows = page.getByRole("link", { name: /.+/ });
	await expect(rows.nth(5)).toBeVisible();

	// ---- searching ----
	await page.getByRole("searchbox", { name: "Search songs" }).fill("panic");

	// The search lives in the address, and nowhere else.
	await expect(page).toHaveURL(/\?q=panic/);

	const dontPanic = page.getByRole("link", { name: /Don't Panic/ });

	// And the list itself shrank, rather than a dropdown appearing.
	await expect(dontPanic).toBeVisible();
	await expect(
		page.getByRole("link", { name: /Highway to Hell/ }),
	).toBeHidden();

	// ---- opening a song ----
	await dontPanic.click();
	await expect(page).toHaveURL(/\/songs\/coldplay-dont-panic$/);

	// The song is really drawn: a chord over the words, not just a title.
	await expect(
		page.getByRole("heading", { name: "Don't Panic" }),
	).toBeVisible();
	await expect(page.locator(".chord").first()).toBeVisible();

	// ---- the whole point of the app ----
	expect(await page.evaluate(() => window.scrollY)).toBe(0);

	await page.keyboard.press("Space");

	// It jumps to the song's first line, then creeps. Poll rather than wait a
	// fixed time: the creep is deliberately slow.
	await expect
		.poll(() => page.evaluate(() => window.scrollY))
		.toBeGreaterThan(20);

	// Still moving a moment later — a jump alone would not prove it scrolls.
	const afterJump = await page.evaluate(() => window.scrollY);
	await expect
		.poll(() => page.evaluate(() => window.scrollY))
		.toBeGreaterThan(afterJump + 5);

	// Space stops it again, and the page does not page-down the way it normally
	// would when space is pressed.
	await page.keyboard.press("Space");
	const stopped = await page.evaluate(() => window.scrollY);
	await page.waitForTimeout(500);
	expect(await page.evaluate(() => window.scrollY)).toBe(stopped);
});
