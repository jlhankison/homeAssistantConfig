# CLAUDE.md

Home Assistant configuration for Booth St. House.

## Status

v2 rewrite in progress on branch `v2-rewrite`. The prior iteration is preserved at tag `v1-final` — use `git show v1-final` or `git checkout v1-final` to browse.

Runtime state (`.storage/`, `home-assistant_v2.db`, `secrets.yaml`, logs) is gitignored and remains in place across the rewrite; only the tracked YAML/docs/dev files are being rebuilt.

## Hardware context

- Ecobee thermostat controlling a boiler (heat)
- Two Gree heat pumps: kitchen, dining room (heat + cool)
- Fire tablets as wall displays
- Garage door opener
