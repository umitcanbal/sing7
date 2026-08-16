import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/*
 * Unmount anything a test rendered, after every test.
 *
 * Testing Library registers this itself only when Vitest runs with `globals`
 * on. We import describe/it/expect explicitly instead, so it has to be wired up
 * by hand — and without it, components from earlier tests stay mounted with
 * their window and document listeners still attached, and start answering
 * events meant for the test that is currently running.
 */
afterEach(cleanup);
