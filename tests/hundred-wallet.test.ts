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

    console.log("Bitcoin deposit results:");
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

    console.log("Pre-factory buy-up-to results:");
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

    // Check pre-faktory contract state
    try {
      console.log("\nChecking pre-faktory contract state...");

      // Check market open state
      const marketOpenState = simnet.callReadOnlyFn(
        "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.bouncr-pre-faktory",
        "is-market-open",
        [],
        wallet_1
      );
      console.log("Pre-faktory market open state:", marketOpenState.result);
    } catch (error) {
      console.error("Error checking pre-faktory contract state:", error);
    }

    // Step 1: Make sure we have a buyer with enough SBTC for DEX purchase
    console.log("\n=== DEX PURCHASE TEST ===");

    // Select a buyer from our wallet accounts
    const buyerPrivateKey = wallet.accounts[0].stxPrivateKey;
    const buyerAddress = privateKeyToAddress(buyerPrivateKey);
    console.log("Buyer address:", buyerAddress);

    // Check buyer's token balance
    try {
      const tokenBalance = simnet.callReadOnlyFn(
        "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
        "get-balance",
        [principalCV(buyerAddress)],
        buyerAddress
      );
      console.log("Buyer token balance:", tokenBalance.result);

      // If needed, fund the buyer with more SBTC for the DEX purchase
      const amount = 22000000; // Slightly more than the required 21630000

      console.log(
        "Topping up buyer's SBTC balance to ensure enough for purchase..."
      );
      const fundBlock = simnet.mineBlock([
        tx.callPublicFn(
          "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-deposit",
          "complete-deposit-wrapper",
          [
            bufferCV(randomBytes(32)),
            uintCV(1),
            uintCV(amount), // Amount needed for DEX
            principalCV(buyerAddress),
            burnHash.value,
            uintCV(blockHeight),
            bufferCV(
              hexToBytes(
                "52500d11cabf1049ebb139a82b439d08bd3a8e867a41fb3f368dfa125e043989"
              )
            ),
          ],
          "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4"
        ),
      ]);
      console.log("Top-up result:", fundBlock[0].result);

      // Verify balance after top-up
      const newBalance = simnet.callReadOnlyFn(
        "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
        "get-balance",
        [principalCV(buyerAddress)],
        buyerAddress
      );
      console.log("Buyer token balance after top-up:", newBalance.result);
    } catch (error) {
      console.error("Error managing buyer token balance:", error);
    }

    // Step 2: Try to open the DEX market
    try {
      console.log("\nTrying to open the DEX market...");
      const dexOpenState = simnet.callReadOnlyFn(
        "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.bouncr-faktory-dex",
        "get-open",
        [],
        wallet_1
      );
      console.log("DEX open state:", dexOpenState.result);

      // Try to open the market if not already open
      if (
        dexOpenState.result.value === false ||
        (dexOpenState.result.value &&
          dexOpenState.result.value.type === "false")
      ) {
        console.log("Opening DEX market...");
        const openMarketBlock = simnet.mineBlock([
          tx.callPublicFn(
            "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.bouncr-faktory-dex",
            "open-market",
            [],
            wallet_1
          ),
        ]);
        console.log("Open market result:", openMarketBlock[0].result);

        // Log events from open-market if any
        if (openMarketBlock[0].events && openMarketBlock[0].events.length > 0) {
          const openEvents = openMarketBlock[0].events.filter(
            (e) => e.event === "print_event"
          );
          console.log("\nPrint events from open-market:");
          openEvents.forEach((event, index) => {
            console.log(`Print Event ${index + 1}:`, event.data.value);
          });
        }
      }
    } catch (error) {
      console.error("Error opening DEX market:", error);
    }

    // Step 3: Buy from DEX
    try {
      console.log("\nBuying from DEX...");
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

      // Log events from DEX buy transaction
      if (dexBuyBlock[0].events && dexBuyBlock[0].events.length > 0) {
        console.log("\nEvents from DEX buy transaction:");

        // Get all print events
        const dexPrintEvents = dexBuyBlock[0].events.filter(
          (e) => e.event === "print_event"
        );
        console.log(`Found ${dexPrintEvents.length} print events`);

        dexPrintEvents.forEach((event, index) => {
          console.log(`\nPrint Event ${index + 1}:`);
          console.log("Topic:", event.data.topic);
          console.log("Value:", event.data.value);
        });

        // Also log ft_transfer events to see token movement
        const transferEvents = dexBuyBlock[0].events.filter(
          (e) => e.event === "ft_transfer_event"
        );
        console.log(`\nFound ${transferEvents.length} token transfer events`);

        transferEvents.forEach((event, index) => {
          console.log(`\nTransfer Event ${index + 1}:`, event.data);
        });
      }
    } catch (error) {
      console.error("Error buying from DEX:", error);
    }

    // Step 4: Buy from the pool
    try {
      console.log("\n=== POOL PURCHASE TEST ===");

      // Check if the pool exists and is initialized
      console.log("Checking pool status...");
      const poolInfo = simnet.callReadOnlyFn(
        "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.bouncr-faktory-pool",
        "get-details",
        [],
        wallet_1
      );
      console.log("Pool details:", poolInfo.result);

      // Now buy from the pool
      console.log("\nBuying from pool...");
      const poolBuyBlock = simnet.mineBlock([
        tx.callPublicFn(
          "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.bouncr-faktory-pool",
          "buy",
          [uintCV(5000000)], // Amount to buy (adjust as needed)
          buyerAddress
        ),
      ]);

      console.log("Pool Buy Result:", poolBuyBlock[0].result);

      // Log events from pool buy transaction
      if (poolBuyBlock[0].events && poolBuyBlock[0].events.length > 0) {
        console.log("\nEvents from pool buy transaction:");

        // Get all print events
        const poolPrintEvents = poolBuyBlock[0].events.filter(
          (e) => e.event === "print_event"
        );
        console.log(`Found ${poolPrintEvents.length} print events`);

        poolPrintEvents.forEach((event, index) => {
          console.log(`\nPrint Event ${index + 1}:`);
          console.log("Topic:", event.data.topic);
          console.log("Value:", event.data.value);
        });

        // Also log ft_transfer events to see token movement
        const transferEvents = poolBuyBlock[0].events.filter(
          (e) => e.event === "ft_transfer_event"
        );
        console.log(`\nFound ${transferEvents.length} token transfer events`);

        transferEvents.forEach((event, index) => {
          console.log(`\nTransfer Event ${index + 1}:`, event.data);
        });
      }
    } catch (error) {
      console.error("Error buying from pool:", error);
    }

    console.log(
      "\nTest completed. Transactions on pre-faktory, DEX, and pool have been executed and logged."
    );
  });
});
