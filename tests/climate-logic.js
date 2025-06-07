// Climate control logic simulation
class ClimateController {
  constructor() {
    this.entities = {
      'sensor.outside_temp': 70,
      'input_number.use_hp_temp': 50,
      'sensor.2354_average_indoor_temperature': 72,
      'climate.2354_climate_controller': { 
        state: 'heat', 
        attributes: { temperature: 75, hvac_mode: 'heat' } 
      },
      'climate.2354_ecobee_thermostat': { 
        state: 'heat', 
        attributes: { temperature: 75, hvac_mode: 'heat' } 
      },
      'climate.2354_dining_room_heat_pump': { 
        state: 'off', 
        attributes: { temperature: 75, hvac_mode: 'off' } 
      },
      'climate.2354_kitchen_heat_pump': { 
        state: 'off', 
        attributes: { temperature: 75, hvac_mode: 'off' } 
      }
    };
  }

  states(entityId) {
    const entity = this.entities[entityId];
    return typeof entity === 'object' ? entity.state : entity;
  }

  state_attr(entityId, attribute) {
    const entity = this.entities[entityId];
    return entity && entity.attributes ? entity.attributes[attribute] : null;
  }

  setState(entityId, state, attributes = {}) {
    if (typeof this.entities[entityId] === 'object') {
      this.entities[entityId].state = state;
      this.entities[entityId].attributes = { ...this.entities[entityId].attributes, ...attributes };
    } else {
      this.entities[entityId] = state;
    }
  }

  // Simulate the use_heat_pump binary sensor logic
  shouldUseHeatPump() {
    const outdoorTemp = parseInt(this.states('sensor.outside_temp'));
    const hvacTransTemp = parseInt(this.states('input_number.use_hp_temp'));
    
    if (outdoorTemp >= hvacTransTemp) {
      return true;
    } else if (outdoorTemp < hvacTransTemp) {
      return false;
    } else {
      return false;
    }
  }

  // Simulate climate controller set_temperature logic
  setTemperature(targetTemp) {
    const currentMode = this.state_attr('climate.2354_climate_controller', 'hvac_mode');
    
    // Update the controller's target temperature
    this.setState('climate.2354_climate_controller', currentMode, { temperature: targetTemp });

    if (currentMode === 'heat') {
      // Heat mode: Use Ecobee thermostat
      this.setState('climate.2354_ecobee_thermostat', 'heat', { temperature: targetTemp });
    } else if (currentMode === 'cool') {
      // Cool mode: Use heat pumps, set Ecobee to 65
      this.setState('climate.2354_dining_room_heat_pump', 'cool', { temperature: targetTemp });
      this.setState('climate.2354_kitchen_heat_pump', 'cool', { temperature: targetTemp });
      this.setState('climate.2354_ecobee_thermostat', 'heat', { temperature: 65 });
    } else if (currentMode === 'off') {
      // Off mode: Set Ecobee to 65
      this.setState('climate.2354_ecobee_thermostat', 'heat', { temperature: 65 });
    }
  }

  // Simulate climate controller set_hvac_mode logic
  setHvacMode(mode) {
    this.setState('climate.2354_climate_controller', mode, { hvac_mode: mode });

    if (mode === 'heat') {
      // Heat mode: Ecobee on, heat pumps off
      this.setState('climate.2354_ecobee_thermostat', 'heat', { hvac_mode: 'heat' });
      this.setState('climate.2354_dining_room_heat_pump', 'off', { hvac_mode: 'off' });
      this.setState('climate.2354_kitchen_heat_pump', 'off', { hvac_mode: 'off' });
    } else if (mode === 'cool') {
      // Cool mode: Heat pumps on, set ecobee to 65
      this.setState('climate.2354_dining_room_heat_pump', 'cool', { hvac_mode: 'cool' });
      this.setState('climate.2354_kitchen_heat_pump', 'cool', { hvac_mode: 'cool' });
      this.setState('climate.2354_ecobee_thermostat', 'heat', { hvac_mode: 'heat', temperature: 65 });
    } else if (mode === 'off') {
      // Off mode: All systems off, set ecobee to 65
      this.setState('climate.2354_dining_room_heat_pump', 'off', { hvac_mode: 'off' });
      this.setState('climate.2354_kitchen_heat_pump', 'off', { hvac_mode: 'off' });
      this.setState('climate.2354_ecobee_thermostat', 'heat', { hvac_mode: 'heat', temperature: 65 });
    }
  }

  // Helper method to get current system status
  getSystemStatus() {
    return {
      controller: {
        mode: this.state_attr('climate.2354_climate_controller', 'hvac_mode'),
        temperature: this.state_attr('climate.2354_climate_controller', 'temperature')
      },
      ecobee: {
        mode: this.state_attr('climate.2354_ecobee_thermostat', 'hvac_mode'),
        temperature: this.state_attr('climate.2354_ecobee_thermostat', 'temperature')
      },
      heatPumps: {
        dining: {
          mode: this.state_attr('climate.2354_dining_room_heat_pump', 'hvac_mode'),
          temperature: this.state_attr('climate.2354_dining_room_heat_pump', 'temperature')
        },
        kitchen: {
          mode: this.state_attr('climate.2354_kitchen_heat_pump', 'hvac_mode'),
          temperature: this.state_attr('climate.2354_kitchen_heat_pump', 'temperature')
        }
      },
      outdoorTemp: this.states('sensor.outside_temp'),
      shouldUseHeatPump: this.shouldUseHeatPump()
    };
  }
}

module.exports = ClimateController;