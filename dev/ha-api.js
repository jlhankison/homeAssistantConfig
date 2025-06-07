const axios = require('axios');
require('dotenv').config();

class HomeAssistantAPI {
  constructor() {
    this.baseURL = process.env.HA_URL || 'http://homeassistant.local:8123';
    this.token = process.env.HA_TOKEN;
    
    if (!this.token) {
      console.error('❌ HA_TOKEN not found in .env file');
      console.log('📝 Create a Long-Lived Access Token in Home Assistant:');
      console.log('   Profile → Security → Long-Lived Access Tokens');
      console.log('   Then add it to your .env file as HA_TOKEN=your_token_here');
      return;
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  }

  async testConnection() {
    try {
      const response = await this.client.get('/api/');
      console.log('✅ Connected to Home Assistant');
      console.log(`📍 Location: ${response.data.location_name}`);
      console.log(`🏠 Version: ${response.data.version}`);
      return true;
    } catch (error) {
      console.error('❌ Connection failed:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      return false;
    }
  }

  async getStates(entityId = null) {
    try {
      const url = entityId ? `/api/states/${entityId}` : '/api/states';
      const response = await this.client.get(url);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting states:', error.message);
      return null;
    }
  }

  async getClimateEntities() {
    try {
      const states = await this.getStates();
      if (!states) return [];
      
      const climateEntities = states.filter(entity => 
        entity.entity_id.startsWith('climate.')
      );
      
      console.log(`🌡️ Found ${climateEntities.length} climate entities:`);
      climateEntities.forEach(entity => {
        console.log(`  ${entity.entity_id}: ${entity.state} (${entity.attributes.temperature}°F)`);
      });
      
      return climateEntities;
    } catch (error) {
      console.error('❌ Error getting climate entities:', error.message);
      return [];
    }
  }

  async getTemperatureSensors() {
    try {
      const states = await this.getStates();
      if (!states) return [];

      const tempSensors = states.filter(entity => 
        entity.entity_id.includes('temperature') || 
        entity.entity_id.includes('temp') ||
        entity.entity_id === 'sensor.outside_temp' ||
        entity.entity_id === 'sensor.2354_average_indoor_temperature' ||
        entity.entity_id === 'binary_sensor.use_heat_pump'
      );

      console.log(`🌡️ Found ${tempSensors.length} temperature-related sensors:`);
      tempSensors.forEach(entity => {
        const unit = entity.attributes.unit_of_measurement || '';
        console.log(`  ${entity.entity_id}: ${entity.state}${unit}`);
      });

      return tempSensors;
    } catch (error) {
      console.error('❌ Error getting temperature sensors:', error.message);
      return [];
    }
  }

  async callService(domain, service, entityId, serviceData = {}) {
    try {
      const response = await this.client.post(`/api/services/${domain}/${service}`, {
        entity_id: entityId,
        ...serviceData
      });
      console.log(`✅ Service called: ${domain}.${service} on ${entityId}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error calling service ${domain}.${service}:`, error.message);
      return null;
    }
  }

  async setClimateTemperature(entityId, temperature) {
    return await this.callService('climate', 'set_temperature', entityId, { temperature });
  }

  async setClimateMode(entityId, hvacMode) {
    return await this.callService('climate', 'set_hvac_mode', entityId, { hvac_mode: hvacMode });
  }

  async validateClimateSystem() {
    console.log('🧪 Validating climate system...');
    
    // Test connection
    const connected = await this.testConnection();
    if (!connected) return false;

    // Get key entities
    const climateEntities = await this.getClimateEntities();
    const tempSensors = await this.getTemperatureSensors();

    // Check for required entities
    const requiredEntities = [
      'climate.2354_climate_controller',
      'climate.2354_ecobee_thermostat', 
      'climate.2354_dining_room_heat_pump',
      'climate.2354_kitchen_heat_pump'
    ];

    const foundEntities = climateEntities.map(e => e.entity_id);
    const missingEntities = requiredEntities.filter(e => !foundEntities.includes(e));

    if (missingEntities.length > 0) {
      console.log('⚠️ Missing expected entities:', missingEntities);
    } else {
      console.log('✅ All expected climate entities found');
    }

    return {
      connected,
      climateEntities,
      tempSensors,
      missingEntities
    };
  }

  async monitorClimateChanges(duration = 30000) {
    console.log(`👀 Monitoring climate changes for ${duration/1000} seconds...`);
    
    const startStates = await this.getClimateEntities();
    
    setTimeout(async () => {
      const endStates = await this.getClimateEntities();
      console.log('📊 Climate monitoring complete');
      
      // Compare states
      startStates.forEach(startEntity => {
        const endEntity = endStates.find(e => e.entity_id === startEntity.entity_id);
        if (endEntity && (startEntity.state !== endEntity.state || 
                         startEntity.attributes.temperature !== endEntity.attributes.temperature)) {
          console.log(`🔄 ${startEntity.entity_id} changed:`);
          console.log(`   ${startEntity.state} (${startEntity.attributes.temperature}°F) → ${endEntity.state} (${endEntity.attributes.temperature}°F)`);
        }
      });
    }, duration);
  }
}

module.exports = HomeAssistantAPI;