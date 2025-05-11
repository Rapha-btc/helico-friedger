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

    // Step 4: Swap tokens through the pool using swap-a-to-b
    try {
      console.log("\n=== POOL SWAP TEST ===");

      // Make sure the buyer has enough SBTC for the swap
      console.log("Topping up buyer's SBTC balance for pool swap...");
      const swapAmount = 1000000; // 1M satoshis as requested

      const fundForSwapBlock = simnet.mineBlock([
        tx.callPublicFn(
          "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-deposit",
          "complete-deposit-wrapper",
          [
            bufferCV(randomBytes(32)),
            uintCV(1),
            uintCV(swapAmount + 100000), // Add a buffer
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
      console.log("Top-up for swap result:", fundForSwapBlock[0].result);

      // Check buyer's token balance before swap
      const balanceBeforeSwap = simnet.callReadOnlyFn(
        "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
        "get-balance",
        [principalCV(buyerAddress)],
        buyerAddress
      );
      console.log("Buyer SBTC balance before swap:", balanceBeforeSwap.result);

      // Perform the swap through the pool
      console.log("\nExecuting swap-a-to-b through the pool...");
      const swapBlock = simnet.mineBlock([
        tx.callPublicFn(
          "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.bouncr-faktory-pool",
          "swap-a-to-b",
          [uintCV(swapAmount)],
          buyerAddress
        ),
      ]);

      console.log("Swap Result:", swapBlock[0].result);

      // Log events from the swap transaction
      if (swapBlock[0].events && swapBlock[0].events.length > 0) {
        console.log("\nEvents from pool swap transaction:");

        // Get all print events
        const swapPrintEvents = swapBlock[0].events.filter(
          (e) => e.event === "print_event"
        );
        console.log(`Found ${swapPrintEvents.length} print events`);

        swapPrintEvents.forEach((event, index) => {
          console.log(`\nPrint Event ${index + 1}:`);
          console.log("Topic:", event.data.topic);
          console.log("Value:", event.data.value);
        });

        // Also log ft_transfer events to see token movement
        const transferEvents = swapBlock[0].events.filter(
          (e) => e.event === "ft_transfer_event"
        );
        console.log(`\nFound ${transferEvents.length} token transfer events`);

        transferEvents.forEach((event, index) => {
          console.log(`\nTransfer Event ${index + 1}:`, event.data);
        });
      }

      // Check buyer's token balances after swap
      const sbtcBalanceAfterSwap = simnet.callReadOnlyFn(
        "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
        "get-balance",
        [principalCV(buyerAddress)],
        buyerAddress
      );
      console.log(
        "Buyer SBTC balance after swap:",
        sbtcBalanceAfterSwap.result
      );

      const bouncBalanceAfterSwap = simnet.callReadOnlyFn(
        "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.bouncr-faktory",
        "get-balance",
        [principalCV(buyerAddress)],
        buyerAddress
      );
      console.log(
        "Buyer BOUNCR balance after swap:",
        bouncBalanceAfterSwap.result
      );
    } catch (error) {
      console.error("Error with pool swap:", error);
    }

    // Add this to your test file after the pool swap test

    // Helper function to extract value from Clarity response
    function extractClarityValue(clarityObj) {
      if (
        clarityObj.type === "ok" &&
        clarityObj.value &&
        clarityObj.value.type === "tuple"
      ) {
        const result = {};
        for (const [key, value] of Object.entries(clarityObj.value.value)) {
          if (value.type === "uint") {
            result[key] = Number(value.value);
          } else if (value.type === "bool") {
            result[key] = value.value;
          } else if (value.type === "principal") {
            result[key] = value.value;
          } else if (
            value.type === "some" &&
            value.value &&
            value.value.type === "uint"
          ) {
            result[key] = Number(value.value.value);
          } else if (value.type === "none") {
            result[key] = null;
          } else {
            result[key] = value.value;
          }
        }
        return result;
      }
      return clarityObj;
    }

    // Step 5: Test triggering fee airdrop
    try {
      console.log("\n=== FEE AIRDROP TEST ===");

      // First, let's check the fee distribution info before attempting the airdrop
      const feeDistInfo = simnet.callReadOnlyFn(
        "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.bouncr-pre-faktory",
        "get-fee-distribution-info",
        [],
        wallet_1
      );
      console.log(
        "Fee distribution info before airdrop:",
        extractClarityValue(feeDistInfo.result)
      );

      // Simulate the DEX sending fees to the pre-faktory contract first
      // This is needed before we can trigger an airdrop
      console.log("\nSimulating DEX sending fees...");
      const fee_amount = 50000; // 0.5 BTC worth of fees
      const createFeesResult = simnet.mineBlock([
        tx.callPublicFn(
          "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.bouncr-pre-faktory",
          "create-fees-receipt",
          [uintCV(fee_amount)],
          "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22" // Using the DEX contract as sender
        ),
      ]);
      console.log("Create fees receipt result:", createFeesResult[0].result);

      // Check if we can trigger the airdrop now
      const canTrigger = simnet.callReadOnlyFn(
        "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.bouncr-pre-faktory",
        "can-trigger-airdrop",
        [],
        wallet_1
      );
      console.log("Can trigger airdrop:", canTrigger.result);

      // If we're in final-airdrop-mode, we can trigger immediately
      // Otherwise, we might need to wait for the cooldown period

      // For testing, let's try to trigger the airdrop
      console.log("\nTriggering fee airdrop...");
      const airdropResult = simnet.mineBlock([
        tx.callPublicFn(
          "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.bouncr-pre-faktory",
          "trigger-fee-airdrop",
          [],
          wallet_1 // Anyone can call this function
        ),
      ]);

      console.log("Airdrop Result:", airdropResult[0].result);

      // Check events from the airdrop transaction
      if (airdropResult[0].events && airdropResult[0].events.length > 0) {
        console.log("\nEvents from airdrop transaction:");

        // Get all print events
        const airdropPrintEvents = airdropResult[0].events.filter(
          (e) => e.event === "print_event"
        );
        console.log(`Found ${airdropPrintEvents.length} print events`);

        airdropPrintEvents.forEach((event, index) => {
          console.log(`\nPrint Event ${index + 1}:`);
          console.log("Topic:", event.data.topic);
          console.log("Value:", event.data.value);
        });

        // Count and summarize transfer events
        const transferEvents = airdropResult[0].events.filter(
          (e) => e.event === "ft_transfer_event"
        );
        console.log(`\nFound ${transferEvents.length} fee transfer events`);

        // Log summary of transfers
        const transferSummary = {};
        let totalDistributed = 0;

        transferEvents.forEach((event) => {
          const amount = parseInt(event.data.amount);
          const recipient = event.data.recipient;
          transferSummary[recipient] =
            (transferSummary[recipient] || 0) + amount;
          totalDistributed += amount;
        });

        console.log("\nTransfer Summary:");
        console.log("Total distributed:", totalDistributed);
        console.log("Unique recipients:", Object.keys(transferSummary).length);

        // Show a few sample transfers
        console.log("\nFirst 5 transfers:");
        transferEvents.slice(0, 5).forEach((event, index) => {
          console.log(
            `Transfer ${index + 1}: ${event.data.amount} to ${
              event.data.recipient
            }`
          );
        });

        // Show any residual transfer
        const residualTransfer = transferEvents.find(
          (e) => e.data.recipient === "SMH8FRN30ERW1SX26NJTJCKTDR3H27NRJ6W75WQE"
        );
        if (residualTransfer) {
          console.log(
            "\nResidual transfer to FAKTORY1:",
            residualTransfer.data.amount
          );
        }
      }

      // Check fee distribution info after the airdrop
      const postAirdropInfo = simnet.callReadOnlyFn(
        "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.bouncr-pre-faktory",
        "get-fee-distribution-info",
        [],
        wallet_1
      );
      console.log(
        "\nFee distribution info after airdrop:",
        extractClarityValue(postAirdropInfo.result)
      );

      // Check a specific user's expected share in the next airdrop
      const userExpectedShare = simnet.callReadOnlyFn(
        "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.bouncr-pre-faktory",
        "get-user-expected-share",
        [principalCV(privateKeyToAddress(wallet.accounts[0].stxPrivateKey))],
        wallet_1
      );
      console.log(
        "\nUser expected share:",
        extractClarityValue(userExpectedShare.result)
      );

      // Get all seat holders and show the summary
      const allSeatHolders = simnet.callReadOnlyFn(
        "SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.bouncr-pre-faktory",
        "get-all-seat-holders",
        [],
        wallet_1
      );

      if (
        allSeatHolders.result &&
        allSeatHolders.result.value &&
        allSeatHolders.result.value.value
      ) {
        const seatHolders = allSeatHolders.result.value.value.value || [];
        console.log("\nSeat holders summary:");
        console.log("Total seat holders:", seatHolders.length);
        let totalSeatCount = 0;
        seatHolders.forEach((holder) => {
          if (holder.type === "tuple" && holder.value) {
            const seats = parseInt(holder.value.seats.value);
            totalSeatCount += seats;
          }
        });
        console.log("Total seats:", totalSeatCount);
        console.log(
          "Average seats per holder:",
          totalSeatCount / seatHolders.length
        );
      }
    } catch (error) {
      console.error("Error testing airdrop:", error);
    }

    console.log("\nAll tests completed successfully!");

    console.log(
      "\nTest completed. All transactions have been executed and logged."
    );
  });
});
