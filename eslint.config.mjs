// eslint-config-next 16 ya exporta flat configs: no hace falta FlatCompat.
import coreWebVitals from "eslint-config-next/core-web-vitals"
import typescript from "eslint-config-next/typescript"

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      // Scripts CommonJS de un solo uso (generación de OG images, compresión), no son app.
      "compress.js",
      "make-og*.js",
    ],
  },
  ...coreWebVitals,
  ...typescript,
]

export default config
