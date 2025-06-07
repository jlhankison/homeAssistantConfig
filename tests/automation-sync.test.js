const ClimateController = require('./climate-logic');

describe('Automation Synchronization Tests', () => {
  let controller;

  beforeEach(() => {
    controller = new ClimateController();
  });

  describe('Ecobee Sync Automation Simulation', () => {
    test('should sync ecobee when climate controller switches to heat mode', () => {
      // Initial state - not in heat mode
      controller.setHvacMode('cool');
      
      // Simulate automation trigger: climate controller state change to heat
      controller.setHvacMode('heat');
      controller.setTemperature(72);
      
      const status = controller.getSystemStatus();
      
      // Automation should have synced ecobee
      expect(status.ecobee.mode).toBe('heat');
      expect(status.ecobee.temperature).toBe(72);
    });

    test('should sync ecobee temperature when climate controller temperature changes in heat mode', () => {
      // Set up initial state
      controller.setHvacMode('heat');
      controller.setTemperature(70);
      
      // Simulate temperature change that would trigger automation
      controller.setTemperature(75);
      
      const status = controller.getSystemStatus();
      
      // Temperature should be synced
      expect(status.ecobee.temperature).toBe(75);
      expect(status.controller.temperature).toBe(75);
    });

    test('should set ecobee to 65°F when climate controller is not in heat mode', () => {
      // Start in heat mode
      controller.setHvacMode('heat');
      controller.setTemperature(72);
      
      // Switch to cool mode (automation should trigger)
      controller.setHvacMode('cool');
      
      const status = controller.getSystemStatus();
      
      // Ecobee should be set to minimum temperature
      expect(status.ecobee.temperature).toBe(65);
    });
  });

  describe('Heat Pump Sync Tests', () => {
    test('should turn off heat pumps when switching to heat mode', () => {
      // Start with heat pumps running
      controller.setHvacMode('cool');
      controller.setTemperature(74);
      
      let status = controller.getSystemStatus();
      expect(status.heatPumps.dining.mode).toBe('cool');
      expect(status.heatPumps.kitchen.mode).toBe('cool');
      
      // Switch to heat mode
      controller.setHvacMode('heat');
      
      status = controller.getSystemStatus();
      expect(status.heatPumps.dining.mode).toBe('off');
      expect(status.heatPumps.kitchen.mode).toBe('off');
    });

    test('should synchronize both heat pumps in cool mode', () => {
      controller.setHvacMode('cool');
      controller.setTemperature(76);
      
      const status = controller.getSystemStatus();
      
      // Both heat pumps should be synchronized
      expect(status.heatPumps.dining.mode).toBe('cool');
      expect(status.heatPumps.dining.temperature).toBe(76);
      expect(status.heatPumps.kitchen.mode).toBe('cool');
      expect(status.heatPumps.kitchen.temperature).toBe(76);
    });
  });

  describe('Cross-System Interference Prevention', () => {
    test('should prevent heat pumps from interfering with heat mode operation', () => {
      controller.setHvacMode('heat');
      controller.setTemperature(72);
      
      const status = controller.getSystemStatus();
      
      // Heat pumps should be off, ecobee should be active
      expect(status.ecobee.mode).toBe('heat');
      expect(status.ecobee.temperature).toBe(72);
      expect(status.heatPumps.dining.mode).toBe('off');
      expect(status.heatPumps.kitchen.mode).toBe('off');
    });

    test('should prevent ecobee from heating when heat pumps are in use', () => {
      controller.setHvacMode('cool');
      controller.setTemperature(74);
      
      const status = controller.getSystemStatus();
      
      // Ecobee should be at minimum, heat pumps active
      expect(status.ecobee.temperature).toBe(65);
      expect(status.heatPumps.dining.mode).toBe('cool');
      expect(status.heatPumps.kitchen.mode).toBe('cool');
      expect(status.heatPumps.dining.temperature).toBe(74);
      expect(status.heatPumps.kitchen.temperature).toBe(74);
    });
  });

  describe('Real-world Scenarios', () => {
    test('should handle morning warm-up scenario (cold outside, need heat)', () => {
      // Cold morning scenario
      controller.setState('sensor.outside_temp', 35);
      controller.setState('input_number.use_hp_temp', 50);
      controller.setState('sensor.2354_average_indoor_temperature', 68);
      
      // System should use boiler for efficiency
      controller.setHvacMode('heat');
      controller.setTemperature(72);
      
      const status = controller.getSystemStatus();
      
      expect(status.shouldUseHeatPump).toBe(false); // Too cold for heat pumps
      expect(status.ecobee.mode).toBe('heat');
      expect(status.ecobee.temperature).toBe(72);
      expect(status.heatPumps.dining.mode).toBe('off');
      expect(status.heatPumps.kitchen.mode).toBe('off');
    });

    test('should handle afternoon cooling scenario (warm outside, need cooling)', () => {
      // Warm afternoon scenario
      controller.setState('sensor.outside_temp', 75);
      controller.setState('input_number.use_hp_temp', 50);
      controller.setState('sensor.2354_average_indoor_temperature', 78);
      
      // System should use heat pumps for cooling
      controller.setHvacMode('cool');
      controller.setTemperature(74);
      
      const status = controller.getSystemStatus();
      
      expect(status.shouldUseHeatPump).toBe(true); // Warm enough for heat pumps
      expect(status.heatPumps.dining.mode).toBe('cool');
      expect(status.heatPumps.kitchen.mode).toBe('cool');
      expect(status.heatPumps.dining.temperature).toBe(74);
      expect(status.ecobee.temperature).toBe(65); // Not actively heating
    });

    test('should handle shoulder season scenario (moderate temp, heating needed)', () => {
      // Shoulder season - could use either system
      controller.setState('sensor.outside_temp', 55);
      controller.setState('input_number.use_hp_temp', 50);
      controller.setState('sensor.2354_average_indoor_temperature', 70);
      
      // Test that heat pumps are preferred when temperature allows
      expect(controller.shouldUseHeatPump()).toBe(true);
      
      // If heating is needed, should still use boiler per current logic
      controller.setHvacMode('heat');
      controller.setTemperature(72);
      
      const status = controller.getSystemStatus();
      expect(status.ecobee.mode).toBe('heat');
      expect(status.ecobee.temperature).toBe(72);
    });

    test('should handle system shutdown scenario', () => {
      // Start with active system
      controller.setHvacMode('cool');
      controller.setTemperature(74);
      
      // Turn off system
      controller.setHvacMode('off');
      
      const status = controller.getSystemStatus();
      
      // All systems should be in safe state
      expect(status.controller.mode).toBe('off');
      expect(status.ecobee.temperature).toBe(65);
      expect(status.heatPumps.dining.mode).toBe('off');
      expect(status.heatPumps.kitchen.mode).toBe('off');
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    test('should handle rapid mode changes without system conflicts', () => {
      // Rapid mode changes
      controller.setHvacMode('heat');
      controller.setTemperature(72);
      controller.setHvacMode('cool');
      controller.setTemperature(74);
      controller.setHvacMode('off');
      controller.setHvacMode('heat');
      controller.setTemperature(70);
      
      const status = controller.getSystemStatus();
      
      // Final state should be consistent
      expect(status.controller.mode).toBe('heat');
      expect(status.ecobee.mode).toBe('heat');
      expect(status.ecobee.temperature).toBe(70);
      expect(status.heatPumps.dining.mode).toBe('off');
      expect(status.heatPumps.kitchen.mode).toBe('off');
    });

    test('should handle extreme temperature settings', () => {
      // Test minimum temperature
      controller.setHvacMode('heat');
      controller.setTemperature(65);
      
      let status = controller.getSystemStatus();
      expect(status.ecobee.temperature).toBe(65);
      
      // Test maximum temperature
      controller.setHvacMode('cool');
      controller.setTemperature(85);
      
      status = controller.getSystemStatus();
      expect(status.heatPumps.dining.temperature).toBe(85);
      expect(status.heatPumps.kitchen.temperature).toBe(85);
      expect(status.ecobee.temperature).toBe(65);
    });

    test('should maintain system integrity during temperature threshold changes', () => {
      // Set initial state
      controller.setState('sensor.outside_temp', 52);
      controller.setState('input_number.use_hp_temp', 50);
      
      expect(controller.shouldUseHeatPump()).toBe(true);
      
      // Change threshold
      controller.setState('input_number.use_hp_temp', 55);
      
      expect(controller.shouldUseHeatPump()).toBe(false);
      
      // System state should remain consistent regardless of threshold changes
      controller.setHvacMode('heat');
      controller.setTemperature(72);
      
      const status = controller.getSystemStatus();
      expect(status.ecobee.mode).toBe('heat');
      expect(status.ecobee.temperature).toBe(72);
    });
  });
});