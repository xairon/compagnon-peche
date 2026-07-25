// Shared test setup. Loaded for every test file: the jest-dom matchers are inert
// in the node-environment logic tests, and the screen tests need them.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Testing Library only auto-cleans when vitest runs with `globals: true`, which
// this project does not. Without this, each render stacks on the previous one
// and queries fail with "found multiple elements".
afterEach(() => {
  cleanup();
});
