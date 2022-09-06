import { build, emptyDir } from "https://deno.land/x/dnt@0.30.0/mod.ts";

await emptyDir("./npm")

await build({
  entryPoints: [ "./src/index.ts" ],
  importMap: "./import-map.json",
  outDir: "./npm",
  shims: {},
  compilerOptions: {
    lib: ["es2020", "dom", "webworker"],
  },
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
      "./*": "./script/*",
    },
    devDependencies: {
      "events": "^3.3.0"
    }
  },
})

Deno.copyFileSync("LICENSE", "npm/LICENSE")
Deno.copyFileSync("README.md", "npm/README.md")