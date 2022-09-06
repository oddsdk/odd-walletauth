{ pkgs ? import <nixpkgs> {} }: with pkgs; let

  # Dependencies
  # ------------

  deno = pkgs.callPackage ./deno-1.25.nix {};

  deps = {

    tools = [
      just
    ];

    languages = [
      deno
    ];

  };

in

mkShell {

  buildInputs = builtins.concatLists [
    deps.tools
    deps.languages
  ];

}