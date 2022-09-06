{ pkgs ? import <nixpkgs> {} }: with pkgs; let

  # Dependencies
  # ------------

  deps = {

    tools = [
      just
    ];

    languages = [
      (pkgs.callPackage ./deno-1.25.nix { })
      nodejs-18_x
    ];

  };

in

mkShell {

  buildInputs = builtins.concatLists [
    deps.tools
    deps.languages
  ];

}