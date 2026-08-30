import { defineConfig } from "vitest/config";

// Vitest configuration is consumed through its required default-export API.
// eslint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    include: ["src/browser/**/*.browser.test.js"],
  },
});
