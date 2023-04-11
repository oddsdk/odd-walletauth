{
  description = "oddsdk/odd-walletauth";


  # Inputs
  # ======

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };


  # Outputs
  # =======

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.simpleFlake {
      inherit self nixpkgs;
      name = "oddsdk/odd-walletauth";
      shell = ./nix/shell.nix;
    };
}
