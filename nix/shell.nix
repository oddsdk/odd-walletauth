{ pkgs ? import <nixpkgs> {} }: with pkgs; let

  # Dependencies
  # ------------

  deno = pkgs.callPackage ./deno-1.25.nix {};

in

mkShell {

  buildInputs = [
    deno
    esbuild
  ];

}