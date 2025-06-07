# Climate Control Test Suite

This test suite validates the efficient integration between Gree heat pumps and Ecobee-controlled boiler system to maintain optimal house temperature using the most energy-efficient method based on outdoor temperature thresholds.

## Test Framework

- **Framework**: Jest (Node.js)
- **Structure**: Test-driven development (TDD)
- **Coverage**: Climate logic, automation synchronization, efficiency decisions

## Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Test Categories

### 1. Temperature Threshold Switching Logic
Tests the binary sensor logic that determines when to use heat pumps vs boiler based on outdoor temperature compared to `input_number.use_hp_temp`.

**Key scenarios:**
- Outdoor temp above threshold → Use heat pumps
- Outdoor temp below threshold → Use boiler
- Outdoor temp equals threshold → Use heat pumps

### 2. Heat Mode Operation (Boiler/Ecobee)
Validates that when in heat mode:
- Ecobee thermostat is set to target temperature
- Heat pumps are turned off
- Temperature changes sync to Ecobee

### 3. Cool Mode Operation (Heat Pumps)
Validates that when in cool mode:
- Both heat pumps are set to target temperature
- Ecobee is set to 65°F (minimum)
- Temperature changes sync to both heat pumps

### 4. Off Mode Operation
Validates that when system is off:
- All heat pumps are turned off
- Ecobee is set to 65°F
- System maintains safe state

### 5. Automation Synchronization
Tests the automation logic that prevents conflicts:
- No simultaneous heating from both systems
- Proper temperature synchronization
- Cross-system interference prevention

### 6. Efficiency Logic
Validates optimal system selection:
- Heat pumps for moderate/warm weather
- Boiler for cold weather heating
- Proper threshold-based switching

### 7. Real-world Scenarios
Tests complete workflows:
- Morning warm-up (cold outside)
- Afternoon cooling (warm outside)
- Shoulder season operations
- System shutdown procedures

## Expected Behavior

The test suite ensures:

1. **Energy Efficiency**: Most efficient system is used based on outdoor temperature
2. **No Conflicts**: Heat pumps and boiler never actively compete
3. **Synchronization**: All components maintain consistent target temperatures
4. **Safety**: System maintains safe states during transitions
5. **Consistency**: Rapid mode changes don't create unstable states

## Test Files

- `climate-logic.js` - Core climate control simulation
- `climate-logic.test.js` - Primary system logic tests (16 tests)
- `automation-sync.test.js` - Automation and synchronization tests (15 tests)
- `corrected-climate-logic.js` - Corrected automation logic simulation
- `bug-regression.test.js` - Bug regression tests for all discovered issues (12 tests)

## Bug Coverage

The test suite now includes comprehensive regression tests for all major bugs discovered:

### **BUG #1: Outside Temperature Triggers** ✅
- Tests automation triggering when outside temp crosses heat pump threshold
- Validates heat source switching (heat pumps ↔ boiler)
- Ensures proper system reconfiguration on environmental changes

### **BUG #2: Ecobee Safety Temperature** ✅  
- Tests Ecobee dropping to 65°F minimum when heat pumps handle heating
- Validates Ecobee staying at safety minimum regardless of controller changes
- Prevents Ecobee from matching controller when not primary heat source

### **BUG #3: Automatic Mode Switching** ✅
- Tests automatic heat/cool mode switching based on indoor vs target temp
- Validates proper cooling mode activation and heat pump operation
- Ensures seamless transitions between heating and cooling

### **Integration & Safety Tests** ✅
- Complex multi-variable scenarios (temp changes during different modes)
- Boundary condition testing (exactly at threshold values)
- Rapid change scenarios ensuring system stability
- Safety validations preventing conflicting heating systems

## Configuration Mapping

Tests simulate the actual Home Assistant configuration:
- `climate.2354_climate_controller` - Master climate template
- `climate.2354_ecobee_thermostat` - Boiler control
- `climate.2354_dining_room_heat_pump` - Heat pump 1
- `climate.2354_kitchen_heat_pump` - Heat pump 2
- `binary_sensor.use_heat_pump` - Efficiency decision logic

All tests must pass before deploying configuration changes to ensure system reliability and efficiency.