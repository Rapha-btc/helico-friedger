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

    // Add logging for events from the last transaction
    console.log("Events from last transaction:", block[99].events);
  });
});
