{
  description = "NixOS development tools for the booking system";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };

      nodejs = pkgs.nodejs_24;

      pnpm = (pkgs.pnpm_11.override { nodejs-slim = nodejs; }).overrideAttrs {
        version = "11.17.0";
        src = pkgs.fetchurl {
          url = "https://registry.npmjs.org/pnpm/-/pnpm-11.17.0.tgz";
          hash = "sha256-ZE61B5ZU6H2uWaB+YtfwmBYrnOWPBgdzKLXd78ochUE=";
        };
      };

      corepack = pkgs.writeShellScriptBin "corepack" ''
        if [ "$#" -gt 0 ] && [ "$1" = "pnpm" ]; then
          shift
          exec ${pnpm}/bin/pnpm "$@"
        fi

        exec ${pkgs.corepack}/bin/corepack "$@"
      '';

      workerd = pkgs.stdenv.mkDerivation {
        pname = "workerd";
        version = "1.20260826.1";

        src = pkgs.fetchurl {
          url = "https://registry.npmjs.org/@cloudflare/workerd-linux-64/-/workerd-linux-64-1.20260826.1.tgz";
          hash = "sha256-drhqHhdCMR0rbYBG3aRx+RYkP6Al3Ct5AWc+WbMfRWs=";
        };

        sourceRoot = "package";
        nativeBuildInputs = [ pkgs.autoPatchelfHook ];
        buildInputs = [ pkgs.stdenv.cc.cc.lib ];
        dontBuild = true;

        installPhase = ''
          runHook preInstall

          install -Dm755 bin/workerd "$out/bin/workerd"

          runHook postInstall
        '';
      };

      markplane = pkgs.stdenvNoCC.mkDerivation {
        pname = "markplane";
        version = "0.1.2";

        src = pkgs.fetchurl {
          url = "https://github.com/zerowand01/markplane/releases/download/v0.1.2/markplane-v0.1.2-x86_64-unknown-linux-musl.tar.gz";
          hash = "sha256-YKjZpUkAmTkR8L4ZqY/P9bqdIwD1ZfPxrPxCmduIZKk=";
        };

        sourceRoot = ".";
        dontBuild = true;

        installPhase = ''
          runHook preInstall

          install -Dm755 markplane "$out/bin/markplane"

          runHook postInstall
        '';
      };
    in
    {
      packages.${system} = {
        inherit markplane pnpm workerd;
      };

      devShells.${system}.default = pkgs.mkShell {
        packages = [
          corepack
          nodejs
          pnpm
          pkgs.chromium
          pkgs.git
          markplane
          workerd
        ];

        MINIFLARE_WORKERD_PATH = "${workerd}/bin/workerd";
        PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = "${pkgs.chromium}/bin/chromium";
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";

        shellHook = ''
          echo "Booking System development shell"
          echo "Install dependencies with: pnpm install --frozen-lockfile"
          echo "Run all verification with: pnpm check"
        '';
      };
    };
}
