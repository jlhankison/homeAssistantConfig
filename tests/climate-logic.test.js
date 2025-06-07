const ClimateController = require('./climate-logic');

describe('Climate Control System Tests', () => {
  let controller;

  beforeEach(() => {
    controller = new ClimateController();
  });

  describe('Temperature Threshold Switching Logic', () => {
    test('should use heat pump when outdoor temp is above threshold', () => {
      // Set outdoor temp above threshold (50°F)
      controller.setState('sensor.outside_temp', 55);
      controller.setState('input_number.use_hp_temp', 50);
      
      expect(controller.shouldUseHeatPump()).toBe(true);
    });

    test('should use boiler when outdoor temp is below threshold', () => {
      // Set outdoor temp below threshold (50°F)
      controller.setState('sensor.outside_temp', 45);
      controller.setState('input_number.use_hp_temp', 50);
      
      expect(controller.shouldUseHeatPump()).toBe(false);
    });

    test('should use heat pump when outdoor temp equals threshold', () => {
      // Set outdoor temp equal to threshold
      controller.setState('sensor.outside_temp', 50);
      controller.setState('input_number.use_hp_temp', 50);
      
      expect(controller.shouldUseHeatPump()).toBe(true);
    });

    test('should handle different threshold values correctly', () => {
      // Test with threshold at 45°F
      controller.setState('input_number.use_hp_temp', 45);
      
      controller.setState('sensor.outside_temp', 50);
      expect(controller.shouldUseHeatPump()).toBe(true);
      
      controller.setState('sensor.outside_temp', 40);
      expect(controller.shouldUseHeatPump()).toBe(false);
      
      controller.setState('sensor.outside_temp', 45);
      expect(controller.shouldUseHeatPump()).toBe(true);
    });
  });

  describe('Heat Mode Operation (Boiler/Ecobee)', () => {
    test('should set ecobee to target temperature in heat mode', () => {
      controller.setHvacMode('heat');
      controller.setTemperature(72);
      
      const status = controller.getSystemStatus();
      expect(status.controller.mode).toBe('heat');
      expect(status.controller.temperature).toBe(72);
      expect(status.ecobee.mode).toBe('heat');
      expect(status.ecobee.temperature).toBe(72);
    });

    test('should turn off heat pumps in heat mode', () => {
      controller.setHvacMode('heat');
      
      const status = controller.getSystemStatus();
      expect(status.heatPumps.dining.mode).toBe('off');
      expect(status.heatPumps.kitchen.mode).toBe('off');
    });

    test('should maintain ecobee temperature when controller temp changes in heat mode', () => {
      controller.setHvacMode('heat');
      controller.setTemperature(70);
      
      let status = controller.getSystemStatus();
      expect(status.ecobee.temperature).toBe(70);
      
      controller.setTemperature(75);
      status = controller.getSystemStatus();
      expect(status.ecobee.temperature).toBe(75);
    });
  });

  describe('Cool Mode Operation (Heat Pumps)', () => {
    test('should set heat pumps to target temperature in cool mode', () => {
      controller.setHvacMode('cool');
      controller.setTemperature(75);
      
      const status = controller.getSystemStatus();
      expect(status.controller.mode).toBe('cool');
      expect(status.controller.temperature).toBe(75);
      expect(status.heatPumps.dining.mode).toBe('cool');
      expect(status.heatPumps.dining.temperature).toBe(75);
      expect(status.heatPumps.kitchen.mode).toBe('cool');
      expect(status.heatPumps.kitchen.temperature).toBe(75);
    });

    test('should set ecobee to 65°F in cool mode', () => {
      controller.setHvacMode('cool');
      controller.setTemperature(72);
      
      const status = controller.getSystemStatus();
      expect(status.ecobee.temperature).toBe(65);
    });

    test('should maintain ecobee at 65°F regardless of controller temp changes in cool mode', () => {
      controller.setHvacMode('cool');
      controller.setTemperature(70);
      
      let status = controller.getSystemStatus();
      expect(status.ecobee.temperature).toBe(65);
      
      controller.setTemperature(78);
      status = controller.getSystemStatus();
      expect(status.ecobee.temperature).toBe(65);
      expect(status.heatPumps.dining.temperature).toBe(78);
      expect(status.heatPumps.kitchen.temperature).toBe(78);
    });
  });

  describe('Off Mode Operation', () => {
    test('should set ecobee to 65°F and turn off heat pumps in off mode', () => {
      controller.setHvacMode('off');
      
      const status = controller.getSystemStatus();
      expect(status.controller.mode).toBe('off');
      expect(status.ecobee.temperature).toBe(65);
      expect(status.heatPumps.dining.mode).toBe('off');
      expect(status.heatPumps.kitchen.mode).toBe('off');
    });

    test('should maintain ecobee at 65°F when temperature is set in off mode', () => {
      controller.setHvacMode('off');
      controller.setTemperature(80);
      
      const status = controller.getSystemStatus();
      expect(status.ecobee.temperature).toBe(65);
    });
  });

  describe('Efficiency Logic Tests', () => {
    test('system should be configured for heat pump use when outdoor temp supports it', () => {
      // Scenario: Mild weather, heat pumps should be efficient
      controller.setState('sensor.outside_temp', 60);
      controller.setState('input_number.use_hp_temp', 50);
      
      // If we're cooling and outdoor temp supports heat pumps
      controller.setHvacMode('cool');
      controller.setTemperature(74);
      
      const status = controller.getSystemStatus();
      expect(status.shouldUseHeatPump).toBe(true);
      expect(status.heatPumps.dining.mode).toBe('cool');
      expect(status.heatPumps.kitchen.mode).toBe('cool');
      expect(status.ecobee.temperature).toBe(65); // Not actively heating
    });

    test('system should be configured for boiler use when outdoor temp is too cold', () => {
      // Scenario: Cold weather, boiler should be more efficient
      controller.setState('sensor.outside_temp', 30);
      controller.setState('input_number.use_hp_temp', 50);
      
      // If we're heating and outdoor temp requires boiler
      controller.setHvacMode('heat');
      controller.setTemperature(70);
      
      const status = controller.getSystemStatus();
      expect(status.shouldUseHeatPump).toBe(false);
      expect(status.ecobee.mode).toBe('heat');
      expect(status.ecobee.temperature).toBe(70);
      expect(status.heatPumps.dining.mode).toBe('off');
      expect(status.heatPumps.kitchen.mode).toBe('off');
    });
  });

  describe('System State Validation', () => {
    test('should never have both heat pumps and boiler actively heating simultaneously', () => {
      // Test heat mode
      controller.setHvacMode('heat');
      controller.setTemperature(75);
      
      let status = controller.getSystemStatus();
      if (status.ecobee.mode === 'heat' && status.ecobee.temperature > 65) {
        expect(status.heatPumps.dining.mode).toBe('off');
        expect(status.heatPumps.kitchen.mode).toBe('off');
      }
      
      // Test cool mode
      controller.setHvacMode('cool');
      controller.setTemperature(70);
      
      status = controller.getSystemStatus();
      if (status.heatPumps.dining.mode === 'cool') {
        expect(status.ecobee.temperature).toBe(65); // Should be at minimum
      }
    });

    test('should maintain temperature consistency across system components', () => {
      controller.setHvacMode('cool');
      const targetTemp = 76;
      controller.setTemperature(targetTemp);
      
      const status = controller.getSystemStatus();
      expect(status.controller.temperature).toBe(targetTemp);
      expect(status.heatPumps.dining.temperature).toBe(targetTemp);
      expect(status.heatPumps.kitchen.temperature).toBe(targetTemp);
    });

    test('should handle mode transitions correctly', () => {
      // Start in heat mode
      controller.setHvacMode('heat');
      controller.setTemperature(70);
      
      let status = controller.getSystemStatus();
      expect(status.ecobee.temperature).toBe(70);
      expect(status.heatPumps.dining.mode).toBe('off');
      
      // Switch to cool mode
      controller.setHvacMode('cool');
      controller.setTemperature(74);
      
      status = controller.getSystemStatus();
      expect(status.ecobee.temperature).toBe(65);
      expect(status.heatPumps.dining.mode).toBe('cool');
      expect(status.heatPumps.dining.temperature).toBe(74);
      
      // Switch to off mode
      controller.setHvacMode('off');
      
      status = controller.getSystemStatus();
      expect(status.ecobee.temperature).toBe(65);
      expect(status.heatPumps.dining.mode).toBe('off');
      expect(status.heatPumps.kitchen.mode).toBe('off');
    });
  });
});