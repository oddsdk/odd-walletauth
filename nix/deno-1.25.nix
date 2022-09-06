{ autoPatchelfHook, fetchzip, stdenv, lib }:
(import ./deno.nix rec {
  inherit autoPatchelfHook fetchzip stdenv lib;
  version = "1.25.1";
  downloadMap = {
    x86_64-linux = {
      url = "https://github.com/denoland/deno/releases/download/v${version}/deno-x86_64-unknown-linux-gnu.zip";
      hash = "sha256-YEGHa6NcE7HUWKXMzQ9KJIVT2qpnApJIVy64E8zgBcc=";
    };
    aarch64-darwin = {
      url = "https://github.com/denoland/deno/releases/download/v${version}/deno-aarch64-apple-darwin.zip";
      hash = "sha256-mo24Fej8VzWZObzhKS7C/WgVdZd1Q1KJq3EGL3rSFIA=";
    };
    aarch64-linux = {
      url = "https://github.com/LukeChannings/deno-arm64/releases/download/v${version}/deno-linux-arm64.zip";
      hash = "sha256-V9p2yJhe9HtX+rVGkvJmKZbqdcciacWoXg5IU5VMMgc=";
    };
  };
  priority = 10;
})