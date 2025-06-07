# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Home Assistant configuration repository for "Booth St. House" with a sophisticated climate control system that coordinates between an Ecobee thermostat and multiple heat pumps. The configuration uses a template climate controller to intelligently switch between heating and cooling systems based on outdoor temperature and user preferences.

## Architecture

### Climate Control System
The core architecture revolves around a `2354_climate_controller` (climate template) that acts as a master controller:
- **Heat mode**: Uses Ecobee thermostat for heating, heat pumps are turned off
- **Cool mode**: Uses heat pumps for cooling, Ecobee is set to 65°F minimum
- **Off mode**: All systems turned off

Key entities:
- `climate.2354_climate_controller` - Master climate template controller
- `climate.2354_ecobee_thermostat` - Primary heating system
- `climate.2354_dining_room_heat_pump` - Cooling system
- `climate.2354_kitchen_heat_pump` - Cooling system
- `group.heatpumps` - Groups the two heat pump entities

### Configuration Structure
- `configuration.yaml` - Main config with climate template logic
- `automations/climate/ecobee.yaml` - Synchronization automations between controllers
- `sensors.yaml` - Template sensors including outdoor temperature and warmest space detection
- `scenes.yaml`, `scripts.yaml` - Currently minimal/empty
- `depricated_*` files - Legacy configurations being phased out

### Template Sensors
- `sensor.outside_temp` - Extracts temperature from weather forecast
- `sensor.outside_humidity` - Extracts humidity from weather forecast  
- `sensor.warmest_space` - Identifies which room has the highest temperature
- `binary_sensor.use_heat_pump` - Determines preferred HVAC system based on outdoor temperature

## Configuration Validation

Home Assistant configurations can be validated using:
```bash
# Check configuration syntax
hass --script check_config --config /path/to/config

# Test specific automations
hass --script check_config --config /path/to/config --info automation
```

## Development Patterns

When modifying climate automations:
1. Test conditions thoroughly using Home Assistant's template editor
2. Use `mode: parallel` for automations that may trigger simultaneously
3. Include proper conditions to prevent infinite loops between controllers
4. Temperature values should be integers when comparing with template conditions

The project follows Home Assistant's YAML configuration structure with includes for organization. Climate logic is centralized in the main configuration file, while automations are separated by domain.