#!/bin/sh
# Seed the *arr bootstrap config before its process starts.
#
# Host Filtering reads AllowedHosts once at startup. The e2e stack reaches each app
# both from the host (127.0.0.1) and from other containers (the compose service name),
# so both must be present. Seeding at boot keeps a reused volume correct across restarts,
# which a runtime API write cannot do, and lets the host-settings tests run without a
# one-off "make the list non-empty" write.
set -eu

service="${1:?usage: seed-arr-config.sh <compose-service-name>}"
config=/config/config.xml
required="localhost,127.0.0.1,${service}"

if [ ! -f "$config" ]; then
  # First boot: the app fills every other key with its defaults.
  cat > "$config" <<EOF
<Config>
  <AllowedHosts>${required}</AllowedHosts>
</Config>
EOF
  chown "${PUID:-1000}:${PGID:-1000}" "$config"
  exec /init
fi

current=$(sed -n 's:.*<AllowedHosts>\(.*\)</AllowedHosts>.*:\1:p' "$config" | head -n 1)
merged="$current"
for host in localhost 127.0.0.1 "$service"; do
  case ",${merged}," in
    *",${host},"*) ;;
    *) merged="${merged:+${merged},}${host}" ;;
  esac
done

if [ "$merged" != "$current" ]; then
  if grep -q '<AllowedHosts[[:space:]]*/>' "$config"; then
    # Retained or hand-edited config: expand the self-closing element.
    sed -i "s#<AllowedHosts[[:space:]]*/>#<AllowedHosts>${merged}</AllowedHosts>#" "$config"
  elif grep -q '<AllowedHosts>' "$config"; then
    sed -i "s#<AllowedHosts>.*</AllowedHosts>#<AllowedHosts>${merged}</AllowedHosts>#" "$config"
  else
    awk -v entry="  <AllowedHosts>${merged}</AllowedHosts>" \
      '{ print } /<Config>/ && !done { print entry; done=1 }' "$config" > "${config}.tmp"
    mv "${config}.tmp" "$config"
  fi
fi

chown "${PUID:-1000}:${PGID:-1000}" "$config"
exec /init
