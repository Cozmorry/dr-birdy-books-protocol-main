import * as fs from "fs";
import * as path from "path";

/**
 * Clear OpenZeppelin upgrades cache
 */
async function main() {
  const openZeppelinDir = path.join(process.cwd(), ".openzeppelin");
  
  console.log("🧹 Clearing OpenZeppelin upgrades cache...");
  console.log("   Path:", openZeppelinDir);
  
  if (fs.existsSync(openZeppelinDir)) {
    try {
      // Delete all files and folders recursively
      const deleteRecursive = (dir: string) => {
        if (fs.existsSync(dir)) {
          fs.readdirSync(dir).forEach((file) => {
            const curPath = path.join(dir, file);
            if (fs.lstatSync(curPath).isDirectory()) {
              deleteRecursive(curPath);
            } else {
              fs.unlinkSync(curPath);
            }
          });
          fs.rmdirSync(dir);
        }
      };
      deleteRecursive(openZeppelinDir);
      console.log("✅ Cache cleared successfully");
    } catch (err: any) {
      console.error("❌ Failed to clear cache:", err.message);
      process.exit(1);
    }
  } else {
    console.log("ℹ️  No cache to clear (.openzeppelin folder doesn't exist)");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
