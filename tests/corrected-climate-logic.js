// Corrected Climate control logic simulation with all bug fixes

class CorrectedClimateController {
  constructor() {
    this.entities = {
      'sensor.outside_temp': 50,
      'input_number.use_hp_temp': 35,
      'sensor.2354_average_indoor_temperature': 70,
      'binary_sensor.use_heat_pump': { state: 'on', attributes: {} },
      'climate.2354_climate_controller': { 
        state: 'heat', 
        attributes: { temperature: 72, hvac_mode: 'heat' } 
      },
      'climate.2354_ecobee_thermostat': { 
        state: 'heat', 
        attributes: { temperature: 70, hvac_mode: 'heat' } 
      },
      'climate.2354_dining_room_heat_pump': { 
        state: 'off', 
        attributes: { temperature: null, hvac_mode: 'off' } 
      },
      'climate.2354_kitchen_heat_pump': { 
        state: 'off', 
        attributes: { temperature: null, hvac_mode: 'off' } 
      }
    };
    
    this.automationLog = [];
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
    
    // Update binary sensor when outside temp changes
    if (entityId === 'sensor.outside_temp') {
      this.updateHeatPumpBinarySensor();
    }
  }

  updateHeatPumpBinarySensor() {
    const outdoorTemp = parseInt(this.states('sensor.outside_temp'));
    const hvacTransTemp = parseInt(this.states('input_number.use_hp_temp'));
    const shouldUse = outdoorTemp >= hvacTransTemp;
    this.setState('binary_sensor.use_heat_pump', shouldUse ? 'on' : 'off');
  }

  shouldUseHeatPump() {
    return this.states('binary_sensor.use_heat_pump') === 'on';
  }

  log(message) {
    this.automationLog.push(message);
  }

  clearLog() {
    this.automationLog = [];
  }

  getLog() {
    return this.automationLog;
  }

  // CORRECTED AUTOMATION LOGIC

  // Automation 1: Sync Ecobee for Heat Mode (when boiler should be used)
  automationSyncEcobeeHeatMode() {
    const controllerMode = this.state_attr('climate.2354_climate_controller', 'hvac_mode');
    const controllerTemp = this.state_attr('climate.2354_climate_controller', 'temperature');
    const shouldUseHP = this.shouldUseHeatPump();
    
    if (controllerMode === 'heat' && !shouldUseHP) {
      this.log('Automation 1: Sync Ecobee for Heat Mode');
      
      // Set ecobee to match controller
      this.setState('climate.2354_ecobee_thermostat', 'heat', {
        hvac_mode: 'heat',
        temperature: controllerTemp
      });
      
      // Turn off heat pumps
      this.setState('climate.2354_dining_room_heat_pump', 'off', {
        hvac_mode: 'off',
        temperature: null
      });
      this.setState('climate.2354_kitchen_heat_pump', 'off', {
        hvac_mode: 'off', 
        temperature: null
      });
      
      return true;
    }
    return false;
  }

  // Automation 2: Use Heat Pumps for Heating (when heat pumps should be used)
  automationUseHeatPumpsForHeating() {
    const controllerMode = this.state_attr('climate.2354_climate_controller', 'hvac_mode');
    const controllerTemp = this.state_attr('climate.2354_climate_controller', 'temperature');
    const shouldUseHP = this.shouldUseHeatPump();
    
    if (controllerMode === 'heat' && shouldUseHP) {
      this.log('Automation 2: Use Heat Pumps for Heating');
      
      // Set heat pumps to heat at controller temperature
      this.setState('climate.2354_dining_room_heat_pump', 'heat', {
        hvac_mode: 'heat',
        temperature: controllerTemp
      });
      this.setState('climate.2354_kitchen_heat_pump', 'heat', {
        hvac_mode: 'heat',
        temperature: controllerTemp
      });
      
      // Set ecobee to safety minimum
      this.setState('climate.2354_ecobee_thermostat', 'heat', {
        hvac_mode: 'heat',
        temperature: 65
      });
      
      return true;
    }
    return false;
  }

  // Automation 3: Use Heat Pumps for Cooling
  automationUseHeatPumpsForCooling() {
    const controllerMode = this.state_attr('climate.2354_climate_controller', 'hvac_mode');
    const controllerTemp = this.state_attr('climate.2354_climate_controller', 'temperature');
    
    if (controllerMode === 'cool') {
      this.log('Automation 3: Use Heat Pumps for Cooling');
      
      // Set heat pumps to cool at controller temperature
      this.setState('climate.2354_dining_room_heat_pump', 'cool', {
        hvac_mode: 'cool',
        temperature: controllerTemp
      });
      this.setState('climate.2354_kitchen_heat_pump', 'cool', {
        hvac_mode: 'cool',
        temperature: controllerTemp
      });
      
      // Set ecobee to safety minimum
      this.setState('climate.2354_ecobee_thermostat', 'heat', {
        hvac_mode: 'heat',
        temperature: 65
      });
      
      return true;
    }
    return false;
  }

  // Automation 4: Set Minimum Temperature When System Off
  automationSetMinimumWhenOff() {
    const controllerMode = this.state_attr('climate.2354_climate_controller', 'hvac_mode');
    
    if (controllerMode === 'off') {
      this.log('Automation 4: Set Minimum Temperature When System Off');
      
      // Turn off heat pumps
      this.setState('climate.2354_dining_room_heat_pump', 'off', {
        hvac_mode: 'off',
        temperature: null
      });
      this.setState('climate.2354_kitchen_heat_pump', 'off', {
        hvac_mode: 'off',
        temperature: null
      });
      
      // Set ecobee to safety minimum
      this.setState('climate.2354_ecobee_thermostat', 'heat', {
        hvac_mode: 'heat',
        temperature: 65
      });
      
      return true;
    }
    return false;
  }

  // Automation 5: Switch Heat Source Based on Outside Temperature
  automationSwitchHeatSource() {
    const controllerMode = this.state_attr('climate.2354_climate_controller', 'hvac_mode');
    
    if (controllerMode === 'heat') {
      this.log('Automation 5: Switch Heat Source Based on Outside Temperature');
      
      if (this.shouldUseHeatPump()) {
        return this.automationUseHeatPumpsForHeating();
      } else {
        return this.automationSyncEcobeeHeatMode();
      }
    }
    return false;
  }

  // Automation 6: Auto Switch Heat/Cool Mode
  automationAutoSwitchMode() {
    const indoorTemp = parseInt(this.states('sensor.2354_average_indoor_temperature'));
    const targetTemp = this.state_attr('climate.2354_climate_controller', 'temperature');
    const currentMode = this.state_attr('climate.2354_climate_controller', 'hvac_mode');
    
    if (currentMode !== 'off') {
      if (indoorTemp > targetTemp && currentMode !== 'cool') {
        this.log('Automation 6: Auto Switch to Cool Mode');
        this.setState('climate.2354_climate_controller', 'cool', {
          hvac_mode: 'cool',
          temperature: targetTemp
        });
        return true;
      } else if (indoorTemp < targetTemp && currentMode !== 'heat') {
        this.log('Automation 6: Auto Switch to Heat Mode');
        this.setState('climate.2354_climate_controller', 'heat', {
          hvac_mode: 'heat',
          temperature: targetTemp
        });
        return true;
      }
    }
    return false;
  }

  // Main automation runner - simulates all automations being evaluated
  runAllAutomations() {
    this.clearLog();
    
    const results = {
      automation1: this.automationSyncEcobeeHeatMode(),
      automation2: this.automationUseHeatPumpsForHeating(),
      automation3: this.automationUseHeatPumpsForCooling(),
      automation4: this.automationSetMinimumWhenOff(),
      automation5: this.automationSwitchHeatSource(),
      automation6: this.automationAutoSwitchMode()
    };
    
    return results;
  }

  // Simulate outside temperature change (should trigger heat source switching)
  simulateOutsideTempChange(newTemp) {
    this.setState('sensor.outside_temp', newTemp);
    return this.automationSwitchHeatSource();
  }

  // Simulate indoor temperature change (should trigger mode switching)
  simulateIndoorTempChange(newTemp) {
    this.setState('sensor.2354_average_indoor_temperature', newTemp);
    return this.automationAutoSwitchMode();
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
      indoorTemp: this.states('sensor.2354_average_indoor_temperature'),
      shouldUseHeatPump: this.shouldUseHeatPump(),
      heatPumpThreshold: this.states('input_number.use_hp_temp')
    };
  }
}

module.exports = CorrectedClimateController;