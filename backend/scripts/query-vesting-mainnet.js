const { ethers } = require('ethers');

(async () => {
  try {
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    const distAddress = '0xE1bABA07752ce8bD574eEa5aBe494521B3028638';
    const abi = [
      'function getTeamMembers() external view returns (address[])',
      'function getVestingInfo(address) external view returns (uint256,uint256,uint256,uint256)',
      'function calculateClaimable(address) external view returns (uint256)',
      'function VESTING_CLIFF() external view returns (uint256)',
      'function VESTING_DURATION() external view returns (uint256)',
      'function token() external view returns (address)',
      'function getContractBalance() external view returns (uint256)',
    ];
    const dist = new ethers.Contract(distAddress, abi, provider);

    const net = await provider.getNetwork();
    console.log('Network:', net.name, net.chainId);

    const cliff = await dist.VESTING_CLIFF();
    const duration = await dist.VESTING_DURATION();
    console.log('Cliff (days):', Number(cliff) / 86400, 'Duration (days):', Number(duration) / 86400);

    const tokenAddress = await dist.token();
    console.log('Token address:', tokenAddress);

    const contractBalance = await dist.getContractBalance();
    console.log('Distribution contract balance:', ethers.formatEther(contractBalance));

    const teamMembers = [
      '0xf40df6189713FEc50AC39960e4874b75dfdeF35B', // joseph
      '0x4A44D33fb26F67348c4780aE286C736C5f0335C7', // aj
      '0x130678Ed1594929c02DA4c10ab11a848df727eEA', // dsign
      '0xC82D41C27b6c035aE8dad6218451A8Cea9f6dC6b', // developer
      '0xaD19c12098037b7d35009c7cc794769e1427cc2d', // birdy
    ];
    console.log('Team members count:', teamMembers.length);

    for (const member of teamMembers) {
      const [total, claimed, claimable, vestEnd] = await dist.getVestingInfo(member);
      const calcClaimable = await dist.calculateClaimable(member);
      console.log('---');
      console.log('Member:', member);
      console.log(' Total:', ethers.formatEther(total));
      console.log(' Claimed:', ethers.formatEther(claimed));
      console.log(' Claimable returned:', ethers.formatEther(claimable));
      console.log(' calculateClaimable:', ethers.formatEther(calcClaimable));
      console.log(' Vesting end:', new Date(Number(vestEnd) * 1000).toISOString());
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
