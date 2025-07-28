const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 开始部署 MagicWheel 合约到 Monad 测试网...");

  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  console.log("📝 部署账户:", deployer.address);
  console.log("💰 账户余额:", ethers.formatEther(await deployer.getBalance()), "MON");

  // 部署合约
  const MagicWheel = await ethers.getContractFactory("MagicWheel");
  const magicWheel = await MagicWheel.deploy();
  
  console.log("⏳ 等待合约部署...");
  await magicWheel.waitForDeployment();
  
  const contractAddress = await magicWheel.getAddress();
  console.log("✅ MagicWheel 合约已部署到:", contractAddress);

  // 验证合约
  console.log("🔍 验证合约...");
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });
    console.log("✅ 合约验证成功");
  } catch (error) {
    console.log("⚠️ 合约验证失败:", error.message);
  }

  // 初始化合约
  console.log("🔧 初始化合约...");
  
  // 设置转盘费用为 0.001 MON
  const spinFee = ethers.parseEther("0.001");
  await magicWheel.setSpinFee(spinFee);
  console.log("✅ 转盘费用设置为:", ethers.formatEther(spinFee), "MON");

  // 向合约发送一些MON作为初始奖池
  const initialPrizePool = ethers.parseEther("0.1");
  await deployer.sendTransaction({
    to: contractAddress,
    value: initialPrizePool
  });
  console.log("✅ 初始奖池设置为:", ethers.formatEther(initialPrizePool), "MON");

  // 输出部署信息
  console.log("\n🎉 部署完成！");
  console.log("=" * 50);
  console.log("📋 部署信息:");
  console.log("合约地址:", contractAddress);
  console.log("部署账户:", deployer.address);
  console.log("转盘费用:", ethers.formatEther(spinFee), "MON");
  console.log("初始奖池:", ethers.formatEther(initialPrizePool), "MON");
  console.log("=" * 50);

  // 保存部署信息到文件
  const deploymentInfo = {
    network: "Monad Testnet",
    contractAddress: contractAddress,
    deployer: deployer.address,
    spinFee: ethers.formatEther(spinFee),
    initialPrizePool: ethers.formatEther(initialPrizePool),
    deploymentTime: new Date().toISOString(),
    abi: MagicWheel.interface.formatJson()
  };

  const fs = require("fs");
  fs.writeFileSync(
    "deployment-info.json", 
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("📄 部署信息已保存到 deployment-info.json");

  return {
    contractAddress,
    deployer: deployer.address,
    spinFee: ethers.formatEther(spinFee),
    initialPrizePool: ethers.formatEther(initialPrizePool)
  };
}

main()
  .then((result) => {
    console.log("🎯 部署脚本执行完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 部署失败:", error);
    process.exit(1);
  }); 