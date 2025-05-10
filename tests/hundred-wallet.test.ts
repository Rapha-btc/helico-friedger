import { initSimnet, tx } from "@hirosystems/clarinet-sdk";
import {
  BufferCV,
  bufferCV,
  bufferCVFromString,
  principalCV,
  privateKeyToAddress,
  randomBytes,
  SomeCV,
  uintCV,
} from "@stacks/transactions";
import { generateNewAccount, generateWallet } from "@stacks/wallet-sdk";
import { describe, it } from "vitest";
import { hexToBytes } from "@stacks/common";
import { C } from "vitest/dist/chunks/reporters.d.DG9VKi4m.js";

const simnet = await initSimnet();
const accounts = simnet.getAccounts();

const testMnemonic =
  "square venue hand notice inmate mystery bulb pear busy screen prison digital fatal vendor ethics lemon mushroom lawn injury scatter confirm video kidney ethics";

const wallet_1 = accounts.get("wallet_1")!;
describe("hundred-wallet", () => {
  it("should be able to buy up to 2 seats for 100 users", async () => {
    let wallet = await generateWallet({
      secretKey: testMnemonic,
      password: "",
    });

    for (let i = 0; i < 100; i++) {
      wallet = generateNewAccount(wallet);
    }

    let block: any;
    const blockHeight = 3;
    console.log("block height", blockHeight);

    const burnHash = simnet.callReadOnlyFn(
      "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-deposit",
      "get-burn-header",
      [uintCV(blockHeight)],
      "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4"
    ).result as SomeCV<BufferCV>;

    console.log(burnHash);

    block = simnet.mineBlock(
      wallet.accounts.map((account) => {
        const stxAddress = privateKeyToAddress(account.stxPrivateKey);
        return tx.callPublicFn(
          "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-deposit",
          "complete-deposit-wrapper",
          [
            bufferCV(randomBytes(32)),
            uintCV(1),
            uintCV(100000000), // 1 BTC
            principalCV(stxAddress),
            burnHash.value,
            uintCV(blockHeight),
            bufferCV(
              hexToBytes(
                "52500d11cabf1049ebb139a82b439d08bd3a8e867a41fb3f368dfa125e043989"
              )
            ),
          ],
          "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4"
        );
      })
    );

    console.log(block.map((r) => r.result));

    block = simnet.mineBlock(
      wallet.accounts.map((account) => {
        return tx.callPublicFn(
          "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.bouncr-pre-faktory",
          "buy-up-to",
          [uintCV(2)],
          privateKeyToAddress(account.stxPrivateKey)
        );
      })
    );

    console.log(block.map((r) => r.result));

    // Log events from the last transaction
    console.log("Events from last transaction:", block[99].events);

    // Log the value inside print events
    const printEvents = block[99].events.filter(
      (event) => event.event === "print_event"
    );
    console.log("\nPrint Event Values from buy-up-to:");
    printEvents.forEach((event, index) => {
      console.log(`Print Event ${index + 1}:`);
      console.log("Topic:", event.data.topic);
      console.log("Value:", event.data.value);
    });

    // Check if the DEX contract is deployed and accessible
    console.log("\nChecking DEX contract status...");

    try {
      // Try to call a read-only function to check if the contract is properly deployed
      const dexOpenState = simnet.callReadOnlyFn(
        "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.bouncr-faktory-dex",
        "get-open",
        [],
        wallet_1
      );
      console.log("DEX open state:", dexOpenState.result);

      // If we got here, try to open the market if needed
      if (dexOpenState.result.value === false) {
        console.log("Opening DEX market...");
        const openMarketBlock = simnet.mineBlock([
          tx.callPublicFn(
            "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.bouncr-faktory-dex",
            "open-market",
            [],
            wallet_1
          ),
        ]);
        console.log("Market open result:", openMarketBlock[0].result);
      }

      // Now try buying into the DEX
      const buyerPrivateKey = wallet.accounts[0].stxPrivateKey;
      const buyerAddress = privateKeyToAddress(buyerPrivateKey);

      console.log("\nAttempting to buy into DEX contract...");
      const dexBuyBlock = simnet.mineBlock([
        tx.callPublicFn(
          "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.bouncr-faktory-dex",
          "buy",
          [
            principalCV(
              "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.bouncr-faktory"
            ),
            uintCV(21630000),
          ],
          buyerAddress
        ),
      ]);

      console.log("DEX Buy Result:", dexBuyBlock[0].result);

      // Log all events from the DEX buy transaction
      console.log("\nEvents from DEX buy transaction:");
      console.log(dexBuyBlock[0].events);

      // Log just the print events from the DEX buy transaction
      const dexPrintEvents = dexBuyBlock[0].events.filter(
        (event) => event.event === "print_event"
      );
      console.log("\nPrint Event Values from DEX buy:");
      dexPrintEvents.forEach((event, index) => {
        console.log(`Print Event ${index + 1}:`);
        console.log("Topic:", event.data.topic);
        console.log("Value:", event.data.value);
      });
    } catch (error) {
      console.error("Error with DEX contract:", error);
      console.log(
        "\nThe DEX contract may not be properly deployed or initialized in the test environment."
      );
      console.log("Checking available contracts in simnet...");

      try {
        // List available contracts to check if the DEX is properly deployed
        const contracts = simnet.getContractsInfo();
        console.log(
          "Available contracts:",
          Object.keys(contracts).filter((c) => c.includes("bouncr"))
        );

        // Check if pre-faktory has a toggle-bonded function that might need to be called
        console.log("\nChecking if pre-faktory needs to be bonded...");
        const toggleBondedBlock = simnet.mineBlock([
          tx.callPublicFn(
            "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.bouncr-pre-faktory",
            "toggle-bonded",
            [],
            wallet_1
          ),
        ]);
        console.log("Toggle bonded result:", toggleBondedBlock[0].result);
      } catch (listError) {
        console.error("Error listing contracts:", listError);
      }
    }
  });
});
