{lib, ...}: {
  options.services.configarr = {
    config = lib.mkOption {
      default = "";
      description = "YAML configuration.";
      type = lib.types.string;
    };

    dataDir = lib.mkOption {
      default = "/var/lib/configarr";
      description = "Working directory for Configarr (repos/, config/, etc.).";
      type = lib.types.path;
    };

    enable = lib.mkEnableOption "Configarr synchronization service";

    environmentFile = lib.mkOption {
      default = null;
      description = ''
        Environment file as defined in {manpage}`systemd.exec(5)`.
      '';
      type = lib.types.nullOr lib.types.path;
    };

    group = lib.mkOption {
      default = "configarr";
      description = "Group for the Configarr service.";
      type = lib.types.str;
    };

    schedule = lib.mkOption {
      default = "daily";
      description = "Run interval for the timer.";
      type = lib.types.str;
    };

    user = lib.mkOption {
      default = "configarr";
      description = "User to run the Configarr service as.";
      type = lib.types.str;
    };
  };
}
