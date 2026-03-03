import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

/**
 * Script to upload NFT metadata folder to IPFS via Pinata
 * Usage: npx tsx scripts/upload-metadata.ts
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_API_URL = "https://api.pinata.cloud/pinning";

if (!PINATA_JWT) {
  console.error("Error: PINATA_JWT not found in .env file");
  console.error("Get your JWT from https://pinata.cloud and add it to .env");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${PINATA_JWT}`,
};

/**
 * Uploads the entire metadata folder to Pinata using pinFileToIPFS
 * This gives a single folder CID — each file is accessible as ipfs://CID/filename
 */
async function uploadFolder(
  metadataDir: string,
  folderName: string
): Promise<string> {
  const files = fs
    .readdirSync(metadataDir)
    .filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    throw new Error("No JSON files found in metadata directory");
  }

  const formData = new FormData();

  for (const fileName of files) {
    const filePath = path.join(metadataDir, fileName);
    const content = fs.readFileSync(filePath);
    const blob = new Blob([content], { type: "application/json" });
    formData.append("file", blob, `${folderName}/${fileName}`);
  }

  formData.append(
    "pinataMetadata",
    JSON.stringify({ name: folderName })
  );

  formData.append(
    "pinataOptions",
    JSON.stringify({ wrapWithDirectory: false })
  );

  const response = await fetch(`${PINATA_API_URL}/pinFileToIPFS`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload folder: ${error}`);
  }

  const result = (await response.json()) as { IpfsHash: string };
  return result.IpfsHash;
}

const metadataDir = path.join(__dirname, "..", "metadata");

if (!fs.existsSync(metadataDir)) {
  console.error("Error: metadata/ directory not found");
  process.exit(1);
}

const files = fs
  .readdirSync(metadataDir)
  .filter((f) => f.endsWith(".json"));

console.log(`Found ${files.length} metadata files to upload\n`);
console.log("=== Uploading metadata folder to IPFS ===\n");

const folderCID = await uploadFolder(metadataDir, "nft-metadata");

console.log("Folder CID:", folderCID);
console.log(`Gateway URL: https://gateway.pinata.cloud/ipfs/${folderCID}\n`);

console.log("Individual token URIs:");
for (const fileName of files) {
  console.log(`  ${fileName}: ipfs://${folderCID}/${fileName}`);
}

console.log("\n=== Update your mint script ===");
console.log(`Set baseURI in scripts/mint.ts to: ipfs://${folderCID}/`);
