/**
 * Copies the compiled B20Token ABI + bytecode into the web app so the browser
 * can deploy the contract directly. Run after `hardhat compile`.
 */
const fs = require("fs");
const path = require("path");

const artifactPath = path.join(
  __dirname,
  "..",
  "artifacts",
  "contracts",
  "B20Token.sol",
  "B20Token.json"
);

if (!fs.existsSync(artifactPath)) {
  console.error("Artifact not found. Run `npm run compile` first.");
  process.exit(1);
}

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const out = {
  contractName: artifact.contractName,
  abi: artifact.abi,
  bytecode: artifact.bytecode,
};

const targets = [
  path.join(__dirname, "..", "..", "web", "src", "contracts", "B20Token.json"),
];

for (const target of targets) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(out, null, 2));
  console.log("Wrote", path.relative(path.join(__dirname, "..", ".."), target));
}
