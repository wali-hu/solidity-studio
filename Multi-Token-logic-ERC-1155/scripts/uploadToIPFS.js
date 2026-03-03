const { PinataSDK } = require("pinata");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  // Initialize Pinata with JWT
  const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT,
  });

  // Test authentication
  try {
    const testUpload = await pinata.upload.public.file(new File(["test"], "test.txt"));
    console.log("Pinata authenticated successfully!\n");
  } catch (error) {
    console.error("Authentication failed:", error.message);
    console.error("\nPlease ensure PINATA_JWT is set in your .env file");
    console.error("Get your JWT from: https://app.pinata.cloud/developers/api-keys");
    process.exit(1);
  }

  // Read metadata files
  const metadataPath = path.join(__dirname, "../metadata");
  const fileNames = ["0.json", "1.json", "2.json"];

  console.log("Reading metadata files from:", metadataPath);

  const files = [];
  for (const fileName of fileNames) {
    const filePath = path.join(metadataPath, fileName);
    const fileContent = fs.readFileSync(filePath);
    const blob = new Blob([fileContent], { type: "application/json" });
    const file = new File([blob], fileName, { type: "application/json" });
    files.push(file);
    console.log(`- Loaded ${fileName}`);
  }

  // Upload folder to IPFS
  console.log("\nUploading metadata folder to IPFS...");
  const upload = await pinata.upload.public
    .fileArray(files)
    .name("GameInventory-Metadata");

  console.log("\nSuccess! IPFS CID:", upload.cid);
  console.log("Base URI for contract:", `ipfs://${upload.cid}/`);
  console.log("\nGateway URLs:");
  console.log(`- IPFS Gateway: https://ipfs.io/ipfs/${upload.cid}/`);
  console.log(`- Pinata Gateway: https://gateway.pinata.cloud/ipfs/${upload.cid}/`);
  console.log("\nToken URIs:");
  console.log(`- Gold (0): ipfs://${upload.cid}/0.json`);
  console.log(`- Founder Sword (1): ipfs://${upload.cid}/1.json`);
  console.log(`- Health Potion (2): ipfs://${upload.cid}/2.json`);

  // Save CID to file for deployment
  fs.writeFileSync(".ipfs-cid", upload.cid);
  console.log("\nCID saved to .ipfs-cid file");

  console.log("\nNext steps:");
  console.log("1. Run: npm run deploy:localhost");
  console.log("2. The contract will automatically use the IPFS URI");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Upload failed:");
    console.error(error);
    process.exit(1);
  });
