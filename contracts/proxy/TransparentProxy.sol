// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";

// These contracts are just wrappers to make OpenZeppelin proxies compilable and deployable
// No additional logic needed - they're just for Hardhat to find and compile them

