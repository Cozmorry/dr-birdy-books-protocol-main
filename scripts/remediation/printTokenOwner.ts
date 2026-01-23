import { ethers } from "hardhat";
import path from "path";
import fs from "fs";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Caller (signer):", signer.address);

  // Find token address
  const deploymentsDir = path.join(__dirname, "../deployments");
  let tokenAddr: string | undefined;
  if (fs.existsSync(deploymentsDir)) {
    const files = fs.readdirSync(deploymentsDir).filter((f) => f.endsWith('.json')).map(f=>({name:f,path:path.join(deploymentsDir,f),time:fs.statSync(path.join(deploymentsDir,f)).mtime.getTime()})).sort((a,b)=>b.time-a.time);
    if (files.length>0){
      try{
        const json = JSON.parse(fs.readFileSync(files[0].path,'utf8'));
        tokenAddr = json.token || json.Token || json.reflectiveToken;
      }catch(e){}
    }
  }
  tokenAddr = tokenAddr || process.env.TOKEN;
  if(!tokenAddr){
    console.error('Token address not found. Provide via deployments file or env TOKEN');
    process.exit(1);
  }

  const token = await ethers.getContractAt('ReflectiveToken', tokenAddr);
  try{
    const owner = await token.owner();
    console.log('Token owner:', owner);
    console.log('Is signer owner?:', owner.toLowerCase()===signer.address.toLowerCase());
  }catch(e:any){
    console.error('Could not call token.owner():', e.message || e);
  }
}

main().catch((e)=>{console.error(e); process.exitCode=1});