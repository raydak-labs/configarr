{
  config,
  lib,
  pkgs,
  ...
}: let
  cfg = config.services.configarr;
in {
  config = lib.mkIf cfg.enable {
    systemd = {
      services.configarr = {
        after = [
          "network-online.target"
          "systemd-tmpfiles-setup.service"
        ];
        description = "Run Configarr (packaged) once";
        path = [pkgs.git];
        preStart = let
          configFile = pkgs.writeText "configarr-config.yml" cfg.config;
        in ''
          install -D -m 0644 ${configFile} ${cfg.dataDir}/config/config.yml
          chown ${cfg.user}:${cfg.group} ${cfg.dataDir}/config/config.yml
        '';
        serviceConfig = {
          EnvironmentFile = lib.optional (cfg.environmentFile != null) cfg.environmentFile;
          ExecStart = lib.getExe (import ../package.nix {inherit lib pkgs;});
          Group = cfg.group;
          Type = "oneshot";
          User = cfg.user;
          WorkingDirectory = cfg.dataDir;
        };
        wants = ["network-online.target"];
      };

      timers.configarr = {
        description = "Schedule Configarr run";
        partOf = ["configarr.service"];
        timerConfig = {
          OnCalendar = cfg.schedule;
          Persistent = true;
          RandomizedDelaySec = "5m";
        };
        wantedBy = ["timers.target"];
      };

      tmpfiles.rules = [
        "d ${cfg.dataDir} 0755 ${cfg.user} ${cfg.group} -"
        "d ${cfg.dataDir}/config 0755 ${cfg.user} ${cfg.group} -"
      ];
    };

    users = {
      groups = lib.mkIf (cfg.group == "configarr") {
        ${cfg.group} = {};
      };

      users = lib.mkIf (cfg.user == "configarr") {
        configarr = {
          description = "configarr user";
          inherit (cfg) group;
          home = cfg.dataDir;
          isSystemUser = true;
        };
      };
    };
  };
}
