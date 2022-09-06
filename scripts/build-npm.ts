import { build, emptyDir } from "https://deno.land/x/dnt@0.30.0/mod.ts";

await emptyDir("./dist")

await build({
  entryPoints: [ "./src/index.ts" ],
  importMap: "./import-map.json",
  outDir: "./dist",
  shims: {},
  typeCheck: false,
  package: {
    name: "webnative-walletauth",
    version: Deno.args[ 0 ],
    description: "",
    license: "Apache-2.0",
    repository: {
      type: "git",
      url: "git+https://github.com/fission-codes/webnative-walletauth.git",
    },
    bugs: {
      url: "https://github.com/fission-codes/webnative-walletauth/issues",
    },
    exports: {
      "./*": {
        "import": "./esm/*",
        "require": "./script/*",
        "types": "./types/*",
      },
    },
  },
})

Deno.copyFileSync("LICENSE", "dist/LICENSE")
Deno.copyFileSync("README.md", "dist/README.md")