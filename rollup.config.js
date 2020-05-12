import pkg from "./package.json";
import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";

export default {
  input: "micro-di.ts",
  output: [
    {
      file: pkg.main,
      name: "microdi",
      format: "umd",
      exports: "named",
      sourcemap: true
    }
  ],
  external: ["reflect-metadata"],
  plugins: [typescript(), terser()]
};
