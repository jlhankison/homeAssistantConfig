const CorrectedClimateController = require('./corrected-climate-logic');

describe('Bug Regression Tests - All Discovered Issues', () => {
  let controller;

  beforeEach(() => {
    controller = new CorrectedClimateController();
  });

  describe('BUG #1: No automation triggers on outside temperature changes', () => {
    test('should trigger heat source switch when outside temp drops below threshold', () => {
      // Setup: Heat mode with heat pumps initially recommended
      controller.setState('sensor.outside_temp', 50); // Above 35°F threshold
      controller.setState('climate.2354_climate_controller', 'heat', {
        hvac_mode: 'heat',
        temperature: 72
      });
      
      // Initial state should use heat pumps
      controller.runAllAutomations();
      let status = controller.getSystemStatus();
      expect(status.shouldUseHeatPump).toBe(true);
      expect(status.heatPumps.dining.mode).toBe('heat');
      expect(status.ecobee.temperature).toBe(65); // Safety minimum
      
      // BUG TEST: Outside temp drops below threshold
      const triggered = controller.simulateOutsideTempChange(25); // Below 35°F
      
      // Should trigger automation to switch to boiler
      expect(triggered).toBe(true);
      
      status = controller.getSystemStatus();
      expect(status.shouldUseHeatPump).toBe(false);
      expect(status.ecobee.temperature).toBe(72); // Should match controller now
      expect(status.heatPumps.dining.mode).toBe('off'); // Heat pumps off
      
      const log = controller.getLog();
      expect(log).toContain('Automation 5: Switch Heat Source Based on Outside Temperature');
    });

    test('should trigger heat source switch when outside temp rises above threshold', () => {
      // Setup: Heat mode with boiler initially used
      controller.setState('sensor.outside_temp', 25); // Below 35°F threshold
      controller.setState('climate.2354_climate_controller', 'heat', {
        hvac_mode: 'heat',
        temperature: 72
      });
      
      // Initial state should use boiler
      controller.runAllAutomations();
      let status = controller.getSystemStatus();
      expect(status.shouldUseHeatPump).toBe(false);
      expect(status.ecobee.temperature).toBe(72);
      
      // BUG TEST: Outside temp rises above threshold
      const triggered = controller.simulateOutsideTempChange(45); // Above 35°F
      
      // Should trigger automation to switch to heat pumps
      expect(triggered).toBe(true);
      
      status = controller.getSystemStatus();
      expect(status.shouldUseHeatPump).toBe(true);
      expect(status.ecobee.temperature).toBe(65); // Safety minimum
      expect(status.heatPumps.dining.mode).toBe('heat');
      expect(status.heatPumps.dining.temperature).toBe(72);
    });
  });

  describe('BUG #2: Ecobee temperature not dropping to minimum when heat pumps recommended', () => {
    test('should set ecobee to 65°F safety minimum when heat pumps handle heating', () => {
      // Setup: Conditions favor heat pumps
      controller.setState('sensor.outside_temp', 55); // Above 35°F threshold
      controller.setState('climate.2354_climate_controller', 'heat', {
        hvac_mode: 'heat',
        temperature: 75
      });
      
      // Run automations
      controller.runAllAutomations();
      
      const status = controller.getSystemStatus();
      
      // BUG TEST: Ecobee should be at safety minimum, NOT matching controller
      expect(status.shouldUseHeatPump).toBe(true);
      expect(status.ecobee.temperature).toBe(65); // Safety minimum
      expect(status.ecobee.temperature).not.toBe(75); // Should NOT match controller
      expect(status.heatPumps.dining.temperature).toBe(75); // Heat pumps match controller
      expect(status.heatPumps.kitchen.temperature).toBe(75);
    });

    test('should maintain ecobee at 65°F even when controller temperature changes', () => {
      // Setup: Heat pumps handling heating
      controller.setState('sensor.outside_temp', 55);
      controller.setState('climate.2354_climate_controller', 'heat', {
        hvac_mode: 'heat',
        temperature: 72
      });
      controller.runAllAutomations();
      
      // Change controller temperature
      controller.setState('climate.2354_climate_controller', 'heat', {
        hvac_mode: 'heat',
        temperature: 78
      });
      controller.runAllAutomations();
      
      const status = controller.getSystemStatus();
      
      // Ecobee should remain at safety minimum
      expect(status.ecobee.temperature).toBe(65);
      expect(status.heatPumps.dining.temperature).toBe(78);
      expect(status.heatPumps.kitchen.temperature).toBe(78);
    });
  });

  describe('BUG #3: No automatic switching to cooling mode', () => {
    test('should automatically switch to cool mode when indoor temp exceeds target', () => {
      // Setup: Indoor temp higher than target
      controller.setState('sensor.2354_average_indoor_temperature', 76);
      controller.setState('climate.2354_climate_controller', 'heat', {
        hvac_mode: 'heat',
        temperature: 72
      });
      
      // BUG TEST: Should trigger mode switch to cooling
      const triggered = controller.simulateIndoorTempChange(76);
      
      expect(triggered).toBe(true);
      
      const status = controller.getSystemStatus();
      expect(status.controller.mode).toBe('cool'); // Should switch to cool
      
      const log = controller.getLog();
      expect(log).toContain('Automation 6: Auto Switch to Cool Mode');
    });

    test('should use heat pumps for cooling and set ecobee to minimum', () => {
      // Setup: Need cooling
      controller.setState('sensor.2354_average_indoor_temperature', 78);
      controller.setState('climate.2354_climate_controller', 'cool', {
        hvac_mode: 'cool',
        temperature: 74
      });
      
      // Run automations
      controller.runAllAutomations();
      
      const status = controller.getSystemStatus();
      
      // BUG TEST: Heat pumps should cool, ecobee at safety minimum
      expect(status.heatPumps.dining.mode).toBe('cool');
      expect(status.heatPumps.kitchen.mode).toBe('cool');
      expect(status.heatPumps.dining.temperature).toBe(74);
      expect(status.heatPumps.kitchen.temperature).toBe(74);
      expect(status.ecobee.temperature).toBe(65); // Safety minimum
    });

    test('should automatically switch to heat mode when indoor temp below target', () => {
      // Setup: Indoor temp lower than target, currently in cool mode
      controller.setState('sensor.2354_average_indoor_temperature', 68);
      controller.setState('climate.2354_climate_controller', 'cool', {
        hvac_mode: 'cool',
        temperature: 72
      });
      
      // BUG TEST: Should trigger mode switch to heating
      const triggered = controller.simulateIndoorTempChange(68);
      
      expect(triggered).toBe(true);
      
      const status = controller.getSystemStatus();
      expect(status.controller.mode).toBe('heat'); // Should switch to heat
      
      const log = controller.getLog();
      expect(log).toContain('Automation 6: Auto Switch to Heat Mode');
    });
  });

  describe('Integration Tests - Multiple Bug Scenarios', () => {
    test('should handle complex scenario: outdoor temp change during cooling operation', () => {
      // Setup: Hot day, cooling needed, but outside temp near threshold
      controller.setState('sensor.outside_temp', 40); // Above threshold
      controller.setState('sensor.2354_average_indoor_temperature', 78);
      controller.setState('climate.2354_climate_controller', 'cool', {
        hvac_mode: 'cool',
        temperature: 74
      });
      
      // Initial state: cooling with heat pumps
      controller.runAllAutomations();
      let status = controller.getSystemStatus();
      expect(status.heatPumps.dining.mode).toBe('cool');
      expect(status.ecobee.temperature).toBe(65);
      
      // Outside temp drops significantly - but shouldn't affect cooling operation
      controller.simulateOutsideTempChange(20);
      controller.runAllAutomations();
      
      status = controller.getSystemStatus();
      // Should still be cooling (heat pumps are fine for cooling regardless)
      expect(status.controller.mode).toBe('cool');
      expect(status.heatPumps.dining.mode).toBe('cool');
      expect(status.ecobee.temperature).toBe(65);
    });

    test('should handle temperature threshold boundary conditions', () => {
      // Test exactly at threshold
      controller.setState('sensor.outside_temp', 35); // Exactly at threshold
      controller.setState('climate.2354_climate_controller', 'heat', {
        hvac_mode: 'heat',
        temperature: 72
      });
      
      controller.runAllAutomations();
      let status = controller.getSystemStatus();
      
      // At threshold, should use heat pumps (>= logic)
      expect(status.shouldUseHeatPump).toBe(true);
      expect(status.heatPumps.dining.mode).toBe('heat');
      expect(status.ecobee.temperature).toBe(65);
      
      // Drop 1 degree below threshold
      controller.simulateOutsideTempChange(34);
      controller.runAllAutomations();
      
      status = controller.getSystemStatus();
      expect(status.shouldUseHeatPump).toBe(false);
      expect(status.ecobee.temperature).toBe(72); // Should switch to boiler
      expect(status.heatPumps.dining.mode).toBe('off');
    });

    test('should maintain system integrity during rapid changes', () => {
      // Simulate rapid environmental changes
      controller.setState('climate.2354_climate_controller', 'heat', {
        hvac_mode: 'heat',
        temperature: 72
      });
      
      // Rapid outside temp changes
      controller.simulateOutsideTempChange(50); // Heat pumps
      controller.runAllAutomations();
      let status1 = controller.getSystemStatus();
      
      controller.simulateOutsideTempChange(20); // Boiler
      controller.runAllAutomations();
      let status2 = controller.getSystemStatus();
      
      controller.simulateOutsideTempChange(60); // Back to heat pumps
      controller.runAllAutomations();
      let status3 = controller.getSystemStatus();
      
      // Each transition should be clean and correct
      expect(status1.heatPumps.dining.mode).toBe('heat');
      expect(status1.ecobee.temperature).toBe(65);
      
      expect(status2.heatPumps.dining.mode).toBe('off');
      expect(status2.ecobee.temperature).toBe(72);
      
      expect(status3.heatPumps.dining.mode).toBe('heat');
      expect(status3.ecobee.temperature).toBe(65);
    });
  });

  describe('Safety and Consistency Tests', () => {
    test('should never have conflicting heating systems active simultaneously', () => {
      // Test various scenarios to ensure no conflicts
      const scenarios = [
        { outside: 50, controller: 'heat', target: 72 },
        { outside: 25, controller: 'heat', target: 75 },
        { outside: 40, controller: 'cool', target: 70 },
        { outside: 30, controller: 'off', target: 68 }
      ];
      
      scenarios.forEach(scenario => {
        controller.setState('sensor.outside_temp', scenario.outside);
        controller.setState('climate.2354_climate_controller', scenario.controller, {
          hvac_mode: scenario.controller,
          temperature: scenario.target
        });
        
        controller.runAllAutomations();
        const status = controller.getSystemStatus();
        
        // Never both heating systems active for heating simultaneously
        if (status.ecobee.mode === 'heat' && status.ecobee.temperature > 65) {
          expect(status.heatPumps.dining.mode).not.toBe('heat');
          expect(status.heatPumps.kitchen.mode).not.toBe('heat');
        }
        
        if (status.heatPumps.dining.mode === 'heat') {
          expect(status.ecobee.temperature).toBe(65); // Should be at minimum
        }
      });
    });

    test('should always maintain ecobee at safe minimum when not primary heat source', () => {
      const testCases = [
        { mode: 'cool', outside: 45 }, // Cooling mode
        { mode: 'off', outside: 45 },  // System off
        { mode: 'heat', outside: 50 }  // Heat mode with heat pumps preferred
      ];
      
      testCases.forEach(testCase => {
        controller.setState('sensor.outside_temp', testCase.outside);
        controller.setState('climate.2354_climate_controller', testCase.mode, {
          hvac_mode: testCase.mode,
          temperature: 75
        });
        
        controller.runAllAutomations();
        const status = controller.getSystemStatus();
        
        if (testCase.mode !== 'heat' || status.shouldUseHeatPump) {
          expect(status.ecobee.temperature).toBe(65);
        }
      });
    });
  });
});