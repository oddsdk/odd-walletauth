{ pkgs ? import <nixpkgs> {} }: with pkgs; let

  # Dependencies
  # ------------

  deps = {

    tools = [
      just
    ];

    languages = [
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