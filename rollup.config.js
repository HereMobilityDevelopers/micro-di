import typescript from 'rollup-plugin-typescript2';
import { terser } from "rollup-plugin-terser";
import pkg from './package.json';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.main,
      name: "MicroDi",
      format: 'umd',
      exports: 'named',
      sourcemap: true
    }
  ],
  external: [
    ...Object.keys(pkg.dependencies || {})
  ],
  watch: {
    include: 'src/**',
  },
  plugins: [
    typescript({
      typescript: require('typescript'),
      useTsconfigDeclarationDir: true
    }),
    terser()
  ]
};
