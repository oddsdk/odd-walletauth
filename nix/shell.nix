{ pkgs ? import <nixpkgs> {} }: with pkgs; let

  # Dependencies
  # ------------

  deno = pkgs.callPackage ./deno-1.25.nix {};

in

mkShell {

  buildInputs = [
    nodejs-18_x
    esbuild
  ];

}