#!/bin/sh
# Seed the *arr bootstrap config before its process starts.
#
# Host Filtering reads AllowedHosts once at startup. The e2e stack reaches each app
# both from the host (127.0.0.1) and from other containers (the compose service name),
# so both must be present. Seeding at boot keeps a reused volume correct across restarts,
# which a runtime API write cannot do, and lets the host-settings tests run without a
# one-off "make the list non-empty" write.
set -eu

service="${1:?usage: seed-arr-config.sh <compose-service-name> [command...]}"
shift
# Linuxserver images start through /init; other images pass their own command.
if [ "$#" -eq 0 ]; then set -- /init; fi
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
  exec "$@"
fi

flattened=$(tr '\n' ' ' < "$config")
current=$(printf '%s\n' "$flattened" | sed -n 's:.*<AllowedHosts[^>]*>\([^<]*\)</AllowedHosts>.*:\1:p' | head -n 1 | tr -d '[:space:]')
merged="$current"
for host in localhost 127.0.0.1 "$service"; do
  case ",${merged}," in
    *",${host},"*) ;;
    *) merged="${merged:+${merged},}${host}" ;;
  esac
done

if [ "$merged" != "$current" ]; then
  # sed replacement data: escape the delimiter, backslash and & so XML entities or
  # unusual host text survive verbatim instead of being re-interpreted.
  escaped=$(printf '%s' "$merged" | sed 's/[\\&#]/\\&/g')
  # Work on the flattened document so an element split across lines - including a
  # self-closing tag - is matched as one string. A one-line config.xml is valid XML.
  if grep -q '<AllowedHosts' "$config"; then
    printf '%s\n' "$flattened" | sed \
      -e "s#<AllowedHosts[^>]*/>#<AllowedHosts>${escaped}</AllowedHosts>#" \
      -e "s#<AllowedHosts[^>]*>[^<]*</AllowedHosts>#<AllowedHosts>${escaped}</AllowedHosts>#" \
      > "${config}.tmp"
  else
    # No element: insert before the closing root tag, even when it shares a line.
    printf '%s\n' "$flattened" \
      | sed "s#</Config>#  <AllowedHosts>${escaped}</AllowedHosts></Config>#" \
      > "${config}.tmp"
  fi
  mv "${config}.tmp" "$config"
fi

chown "${PUID:-1000}:${PGID:-1000}" "$config"
exec "$@"
