#!/usr/bin/env node

const HomeAssistantAPI = require('./ha-api');

async function main() {
  console.log('🚀 Testing Home Assistant connection...\n');
  
  const ha = new HomeAssistantAPI();
  
  if (!ha.token) {
    console.log('\n📋 Next steps:');
    console.log('1. Go to http://homeassistant.local:8123');
    console.log('2. Click your profile (bottom left)');
    console.log('3. Scroll to "Long-Lived Access Tokens"');
    console.log('4. Click "Create Token"');
    console.log('5. Copy the token');
    console.log('6. Create .env file: cp .env.example .env');
    console.log('7. Edit .env and paste your token');
    console.log('8. Run this script again');
    return;
  }

  // Test basic connection
  const connected = await ha.testConnection();
  if (!connected) {
    console.log('\n❌ Could not connect to Home Assistant');
    return;
  }

  console.log('\n🔍 Discovering your climate system...');
  
  // Validate the climate system
  const validation = await ha.validateClimateSystem();
  
  if (validation.missingEntities.length === 0) {
    console.log('\n✅ Ready for development!');
    console.log('\nYou can now:');
    console.log('• Test climate changes: node test-climate.js');
    console.log('• Monitor system: node monitor-climate.js');
    console.log('• Deploy changes and test live');
  } else {
    console.log('\n⚠️ Some entities are missing from your configuration');
    console.log('This might be normal if you\'re still setting up');
  }
}

if (require.main === module) {
  main().catch(console.error);
}