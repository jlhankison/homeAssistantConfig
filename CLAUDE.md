# CLAUDE.md

Home Assistant configuration for a duplex at 2354 / 2356 N Booth St,
Milwaukee WI. Main = lower unit (residence, 2354). Rental = upper unit
(Airbnb, 2356).

## Status

v2 is live on branch `v2-rewrite`. The prior iteration is preserved at
tag `v1-final` — `git show v1-final` or `git checkout v1-final` to browse.

## Hardware

- **Main** (2354): Burnham P-204A-WNI boiler (~80% AFUE) controlled by
  `climate.2354_ecobee_thermostat`; Gree Multi21+ heat pumps —
  outdoor `MULTI24HP230V1CO`, indoor `climate.2354_kitchen_heat_pump`
  and `climate.2354_dining_room_heat_pump` (both 3VIR12HP230V1AH cassettes).
- **Rental** (2356): New Yorker CG30F boiler (84% AFUE) controlled by
  `climate.2356_ecobee_thermostat`. No Gree heat pumps paired yet.
- Fire tablets as wall displays (Fully Kiosk).
- MyQ garage door opener.

## Architecture

- `configuration.yaml` — top-level entry; `!include_dir_named packages/`.
- `packages/` — feature bundles (one file = one feature):
  - `shared_weather.yaml` — outdoor sensors from `weather.forecast_booth_st_lower`.
  - `shared_utilities.yaml` — marginal utility rates (WE Energies), Gree
    COP curve, shared heat-pump $/BTU sensor.
  - `climate_main.yaml` — `climate.main_controller` (climate_template),
    per-unit boiler AFUE + $/BTU + preferred-source + auto heat/cool switch.
  - `climate_rental.yaml` — `climate.rental_controller` (boiler-only
    until heat pumps are paired); no auto switch.
  - `misc.yaml` — garage late-night closer, tablet dimming, battery alerts.
- `dashboards/climate.yaml` — Lovelace YAML dashboard (Overview + Tuning).
- `blueprints/automation/sbyx/…` — community low-battery blueprint.

## Design rules

- The `climate.<unit>_controller` template is the **single authority** that
  touches physical devices (Ecobee + heat pumps). Automations only mutate
  the master entity; they never bypass it.
- Rates are **marginal** (per-kWh/therm energy charges), not average bill
  rates. Fixed customer charges don't belong in the "run 1 more BTU" decision.
- Template sensors use `float(default)` fallbacks and `availability:`
  guards so downstream logic never sees `unknown`/`unavailable`.

## Runtime state (gitignored)

`.storage/`, `home-assistant_v2.db*`, `secrets.yaml`, logs, `custom_components/`,
`deps/`, `www/`, `tts/`, `image/`. Never committed.

## Deferred features

- Airbnb calendar-driven setback for the rental.
- Energy monitoring (Emporia Vue / re-enable disabled Shelly HT sensors).
- TOU utility rates (template sensor swap).
- Pair 2356 heat pumps and extend `climate_rental.yaml` to match main's
  routing.
- Refine Gree COP curve from submittal PDF if grabbed.
