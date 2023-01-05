import { defineConfig } from "tsup";

export default defineConfig({
  entryPoints: ["src/index.ts"],
  bundle: true,
  outDir: "dist",
  format: ["cjs"],
});
