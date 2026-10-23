const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getAdbPath() {
  const localAppData = process.env.LOCALAPPDATA || '';
  const standardSdkAdb = path.join(localAppData, 'Android', 'Sdk', 'platform-tools', 'adb.exe');
  if (fs.existsSync(standardSdkAdb)) {
    return standardSdkAdb;
  }
  return 'adb';
}

const adb = getAdbPath();

try {
  console.log('🔄 Setting up USB port forwarding for CloudNotes...');
  execSync(`"${adb}" reverse tcp:8081 tcp:8081`, { stdio: 'inherit' });
  execSync(`"${adb}" reverse tcp:8090 tcp:8090`, { stdio: 'inherit' });
  console.log('\n✅ USB Reverse SUCCESS!');
  console.log('📱 On your phone, you can now connect via:');
  console.log('   - Metro Bundler:     http://localhost:8081');
  console.log('   - PocketBase Server: http://localhost:8090');
  console.log('💡 No need to check Wi-Fi or ipconfig ever again!\n');
} catch {
  console.warn('\n⚠️ Could not reverse ports automatically. Make sure:');
  console.warn('1. Your Android phone is plugged into laptop via USB cable.');
  console.warn('2. "USB Debugging" is enabled in Developer Options on your phone.\n');
}
