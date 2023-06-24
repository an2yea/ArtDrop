const CONTRACT_ADDRESS = "0xEf9C6EE4BD29955c8cFAb7A89D65aB9185B7F108"
const META_DATA_URL = "https://aqua-criminal-marlin-878.mypinata.cloud/ipfs/QmU3f2LENQ1TyMwb1vGCfEoEkRhTSad7wgiC3KSuZf3iDq"
const WALLET_ADDRESS = "0xa2D1Daa954A71C7049792ebF5F86d469D847c43B"

async function mintNFT(contractAddress, metaDataURL) {
   const ExampleNFT = await ethers.getContractFactory("ExampleNFT")
   const [owner] = await ethers.getSigners()
//    const tokenID = await ExampleNFT.attach(contractAddress).mintNFT(owner.address, metaDataURL)
   console.log("NFT minted to: ", owner.address)
   const balance = await ExampleNFT.attach(contractAddress).balanceOf(WALLET_ADDRESS);
   const totalSupply = await ExampleNFT.attach(contractAddress).totalSupply();
//    console.log("Token Id minted ", tokenID);
   console.log("Balance of owner", balance);
   console.log("Tokens total", totalSupply);
}

mintNFT(CONTRACT_ADDRESS, META_DATA_URL)
   .then(() => process.exit(0))
   .catch((error) => {
       console.error(error);
       process.exit(1);
   });