import fs from 'fs';
import path from 'path';

const cfgPath = path.resolve(process.cwd(), 'config', 'hardware.json');

try {
  const raw = fs.readFileSync(cfgPath, 'utf8');
  const obj = JSON.parse(raw);
  const required = ['minRamGB', 'minCpuCores', 'storageGB'];
  const missing = required.filter((k) => !(k in obj));
  if (missing.length) {
    console.error('Hardware config missing keys:', missing.join(', '));
    process.exit(2);
  }
  console.log('Hardware config OK —', cfgPath);
  console.log('Values:', JSON.stringify(obj, null, 2));
  process.exit(0);
} catch (err) {
  console.error('Error reading or parsing hardware config:', err.message);
  process.exit(1);
}
