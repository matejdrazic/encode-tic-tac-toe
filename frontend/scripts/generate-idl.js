const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Run anchor build to generate the IDL
execSync('anchor build', { stdio: 'inherit' });

// Copy the IDL file to the frontend
const idlPath = path.join(__dirname, '../../target/idl/encode_tic_tac_toe.json');
const destPath = path.join(__dirname, '../idl/encode_tic_tac_toe.json');

// Create the idl directory if it doesn't exist
const idlDir = path.dirname(destPath);
if (!fs.existsSync(idlDir)) {
  fs.mkdirSync(idlDir, { recursive: true });
}

// Copy the file
fs.copyFileSync(idlPath, destPath);
console.log('IDL file copied successfully!'); 