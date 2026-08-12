import { defineConfig, devices } from "@playwright/test";

/*
 * One end-to-end run, not a suite.
 *
 * Everything else in this project is a unit test: one piece mounted on its own,
 * in a fake browser, with data typed by hand. Those are fast and they cover the
 * fiddly rules — but they never start the real app, so all 89 of them would pass
 * with the router unwired, the proxy broken or the page failing to mount at all.
 *
 * This is the test that would notice. It drives a real browser against the real
 * app and the real Go server.
 */
export default defineConfig({
	testDir: "./e2e",

	// A real browser doing real work is slower than jsdom; the defaults are tuned
	// for unit tests.
	timeout: 30_000,
	expect: { timeout: 10_000 },

	use: {
		baseURL: "http://localhost:5173",
		// Kept only when something fails, so a red run can be looked at rather
		// than guessed about.
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},

	/*
	 * The same one test on three engines, which is not the same as three tests.
	 *
	 * The thing at risk is HAND_SCROLL_TOLERANCE. The scroll loop decides a human
	 * intervened when the real position drifts more than 2px from the position it
	 * asked for. That number is a claim about how an engine rounds scroll
	 * positions, and it was picked against Chromium alone. If another engine
	 * rounded more coarsely, the loop would read its own scrolling as a hand
	 * scroll and stop on the first frame — auto-scroll would simply not work, and
	 * nothing else could catch it, because jsdom does not scroll at all.
	 *
	 * Measured on all three: asking for 123.456 gives back 123, a drift of 0.456px
	 * — including WebKit at devicePixelRatio 2. The tolerance holds with room to
	 * spare.
	 *
	 * Playwright's WebKit and Firefox are its own builds, not the browsers people
	 * download — close enough to be worth running, not close enough to be proof.
	 */
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
		{ name: "webkit", use: { ...devices["Desktop Safari"] } },
		{ name: "firefox", use: { ...devices["Desktop Firefox"] } },
	],

	// Starts the dev server if it is not already up, and leaves your own running
	// one alone if it is.
	webServer: {
		command: "pnpm dev",
		url: "http://localhost:5173",
		reuseExistingServer: true,
		timeout: 60_000,
	},
});
