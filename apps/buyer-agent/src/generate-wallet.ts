import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

console.log("Generated Base Sepolia test wallet:");
console.log(`Address: ${account.address}`);
console.log(`EVM_PRIVATE_KEY=${privateKey}`);
console.log("");
console.log("Fund the address with Base Sepolia ETH and Base Sepolia USDC before tx:baseline.");
