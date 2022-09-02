import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill"
import { defineConfig } from "vite"
import reactPlugin from "@vitejs/plugin-react"

export default {

  plugins: [ reactPlugin() ],

  optimizeDeps: {
    esbuildOptions: {
      define: {
        "global": "globalThis",
        "globalThis.process.env.NODE_ENV": "production",
      },
      target: "es2020",
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
        }),
      ],
    }
  },
  build: {
    target: "es2020"
  },
}
