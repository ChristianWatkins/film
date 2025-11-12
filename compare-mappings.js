import fs from 'fs';
import path from 'path';

const oldMappings = JSON.parse(fs.readFileSync('/tmp/old-mappings.json', 'utf-8'));
const newMappings = JSON.parse(fs.readFileSync('public/data/film-key-mappings.json', 'utf-8'));

const oldKeys = Object.keys(oldMappings.filmKeyToCode || {});
console.log(`Old mappings: ${oldKeys.length} films`);
console.log(`New mappings: ${Object.keys(newMappings.filmKeyToCode).length} films\n`);

// Check if mappings changed
let changed = 0;
let same = 0;
let missing = 0;

oldKeys.slice(0, 20).forEach(filmKey => {
  const oldCode = oldMappings.filmKeyToCode[filmKey];
  const newCode = newMappings.filmKeyToCode[filmKey];
  
  if (!newCode) {
    missing++;
    console.log(`✗ ${filmKey}: ${oldCode} -> NOT FOUND (MISSING)`);
  } else if (oldCode === newCode) {
    same++;
    console.log(`✓ ${filmKey}: ${oldCode} (SAME)`);
  } else {
    changed++;
    console.log(`✗ ${filmKey}: ${oldCode} -> ${newCode} (CHANGED)`);
  }
});

console.log(`\nSummary (first 20 films):`);
console.log(`  Same: ${same}`);
console.log(`  Changed: ${changed}`);
console.log(`  Missing: ${missing}`);

// Check all mappings
let totalChanged = 0;
let totalSame = 0;
oldKeys.forEach(filmKey => {
  const oldCode = oldMappings.filmKeyToCode[filmKey];
  const newCode = newMappings.filmKeyToCode[filmKey];
  if (oldCode === newCode) {
    totalSame++;
  } else {
    totalChanged++;
  }
});

console.log(`\nTotal comparison:`);
console.log(`  Same: ${totalSame}/${oldKeys.length}`);
console.log(`  Changed: ${totalChanged}/${oldKeys.length}`);

