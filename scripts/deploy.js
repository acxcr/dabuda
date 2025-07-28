const hre = require("hardhat");

async function main() {
  console.log("开始部署 MagicWheel 合约...");

  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);

  // 部署合约
  const MagicWheel = await ethers.getContractFactory("MagicWheel");
  const magicWheel = await MagicWheel.deploy();
  await magicWheel.waitForDeployment();

  const contractAddress = await magicWheel.getAddress();
  console.log("MagicWheel 合约已部署到:", contractAddress);

  // 保存合约地址到文件
  const fs = require('fs');
  const contractInfo = {
    address: contractAddress,
    network: hre.network.name,
    deployer: deployer.address
  };
  
  fs.writeFileSync(
    'contract-info.json', 
    JSON.stringify(contractInfo, null, 2)
  );
  
  console.log("合约信息已保存到 contract-info.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 