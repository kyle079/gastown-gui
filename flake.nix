{
  description = "Nix flake for gastown-gui";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        packageJson = builtins.fromJSON (builtins.readFile ./package.json);
      in {
        packages = {
          gastown-gui = pkgs.buildNpmPackage {
            pname = packageJson.name;
            version = packageJson.version;
            src = ./.;

            npmDepsHash = "sha256-xjwBig9CPR6OUWgRLD9pAJAmAq7oVvW/ulrqRqRilrs=";

            dontNpmBuild = true;
            PUPPETEER_SKIP_DOWNLOAD = "true";

            meta = {
              description = packageJson.description;
              homepage = packageJson.homepage;
              license = pkgs.lib.licenses.mit;
              mainProgram = "gastown-gui";
            };
          };

          default = self.packages.${system}.gastown-gui;
        };

        apps.default = {
          type = "app";
          program = "${self.packages.${system}.gastown-gui}/bin/gastown-gui";
        };
      })
    // {
      nixosModules.deployment = import ./nix/deployment.nix { inherit self; };
    };
}
