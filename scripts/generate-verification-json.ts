import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Generate Standard JSON Input for Basescan verification
 * This creates a JSON file with all contract sources and compiler settings
 */
async function main() {
  console.log("\n📝 Generating Standard JSON Input for ReflectiveToken verification...\n");

  // Read the flattened contract
  const flattenedPath = path.join(__dirname, '..', 'ReflectiveToken_flattened.sol');
  if (!fs.existsSync(flattenedPath)) {
    console.error("❌ ReflectiveToken_flattened.sol not found. Generating it...");
    execSync('npx hardhat flatten contracts/ReflectiveToken.sol > ReflectiveToken_flattened.sol', {
      cwd: path.join(__dirname, '..'),
    });
  }

  const flattenedCode = fs.readFileSync(flattenedPath, 'utf8');

  // Create Standard JSON Input
  const standardJsonInput = {
    language: "Solidity",
    sources: {
      "ReflectiveToken.sol": {
        content: flattenedCode
      }
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: "paris",
      outputSelection: {
        "*": {
          "*": [
            "abi",
            "evm.bytecode",
            "evm.deployedBytecode",
            "evm.bytecode.sourceMap",
            "evm.deployedBytecode.sourceMap"
          ]
        }
      },
      metadata: {
        bytecodeHash: "none"
      },
      libraries: {}
    }
  };

  // Write to file
  const outputPath = path.join(__dirname, '..', 'ReflectiveToken_verification.json');
  fs.writeFileSync(outputPath, JSON.stringify(standardJsonInput, null, 2));

  console.log("✅ Standard JSON Input generated successfully!");
  console.log(`   File: ${outputPath}`);
  console.log("\n📋 Instructions:");
  console.log("   1. Go to: https://sepolia.basescan.org/address/0xdEA33fCB6BDCaB788De398A636a1227122Ae3d7D#code");
  console.log("   2. Click 'Verify and Publish'");
  console.log("   3. Select 'Standard JSON Input'");
  console.log("   4. Compiler Version: v0.8.28+commit.7893614a");
  console.log("   5. License: MIT");
  console.log("   6. Upload the JSON file: ReflectiveToken_verification.json");
  console.log("   7. Click 'Verify and Publish'");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Failed to generate JSON:", error);
    process.exit(1);
  });

