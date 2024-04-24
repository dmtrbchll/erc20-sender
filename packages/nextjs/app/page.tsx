"use client";

import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { TransactionReceipt, formatUnits, isAddress, parseEther } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { getBalance } from "wagmi/actions";
import { abi } from "~~/abi/erc20TokenAbi";
import { TxReceipt } from "~~/components/contract/TxReceipt";
import { displayTxResult } from "~~/components/contract/utilsDisplay";
import { Address, AddressInput, IntegerInput, IntegerVariant } from "~~/components/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { useTransactor } from "~~/hooks/scaffold-eth/useTransactor";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import { notification } from "~~/utils/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress, chain } = useAccount();
  const { targetNetwork } = useTargetNetwork();

  const writeDisabled = !chain || chain?.id !== targetNetwork.id;
  const { data: writeResult, isPending, writeContractAsync } = useWriteContract();
  const writeTxn = useTransactor();

  const [displayedTxResult, setDisplayedTxResult] = useState<TransactionReceipt>();
  const { data: txResult } = useWaitForTransactionReceipt({
    hash: writeResult,
  });
  useEffect(() => {
    setDisplayedTxResult(txResult);
  }, [txResult]);

  const [tokenAddress, setTokenAddress] = useState<string>("");
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string | bigint>("");
  const [userBalance, setUserBalance] = useState<string>("");
  const [tokenSymbol, setTokenSymbol] = useState<string>("");
  const [isFetchingBalance, setIsFetchingBalance] = useState<boolean>(false);
  const [result, setResult] = useState<unknown>();
  const [exceedsAmount, setExceedsAmount] = useState<boolean>(false);

  const balance = getBalance(wagmiConfig, {
    address: (connectedAddress as string) || "0x0000000000000000000000000000000000000000",
    token: tokenAddress,
  });

  const handleFetchToken = async () => {
    setIsFetchingBalance(true);

    if (!isAddress(tokenAddress)) {
      notification.error(`Address ${tokenAddress} is invalid.`);
      setIsFetchingBalance(false);
      return;
    }

    const userBalanceAndTokenData = await balance;
    const formattedUserBalance = formatUnits(userBalanceAndTokenData.value, userBalanceAndTokenData.decimals);

    setTokenSymbol(userBalanceAndTokenData.symbol);
    setUserBalance(formattedUserBalance);
    setResult(`You have ${formattedUserBalance} ${userBalanceAndTokenData.symbol} tokens in your wallet`);
    setIsFetchingBalance(false);
  };

  const handleSendTokens = async () => {
    if (writeContractAsync) {
      try {
        const makeWriteWithParams = () =>
          writeContractAsync({
            address: tokenAddress,
            functionName: "transfer",
            abi: abi,
            args: [recipientAddress, parseEther(transferAmount as string)],
          });
        await writeTxn(makeWriteWithParams);
      } catch (e: any) {
        console.error("⚡️ ~ handleSendTokens ~ error", e);
      }
    }
  };

  useEffect(() => {
    setExceedsAmount(Number(transferAmount) > Number(userBalance));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferAmount]);

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-2xl mb-2">Welcome to</span>
            <span className="block text-4xl font-bold">Scaffold-ETH 2</span>
          </h1>
          <div className="flex justify-center items-center space-x-2">
            <p className="my-2 font-medium">Connected Address:</p>
            <Address address={connectedAddress} />
          </div>
          <div className="z-10">
            <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 flex flex-col mt-10 relative">
              <div className="h-[5rem] w-[5.5rem] bg-base-300 absolute self-start rounded-[22px] -top-[38px] -left-[1px] -z-10 py-[0.65rem] shadow-lg shadow-base-300">
                <div className="flex items-center justify-center space-x-2">
                  <p className="my-0 text-sm">Send Tokens</p>
                </div>
              </div>
              <div style={{ width: "470px" }} className="p-5 divide-y divide-base-300">
                <div className="flex flex-col gap-3 py-5 first:pt-0 last:pb-1">
                  <p className="font-medium my-0 break-words">Token Address</p>
                  <AddressInput
                    name="token_address"
                    value={tokenAddress}
                    placeholder="address token"
                    onChange={e => setTokenAddress(e)}
                  />
                  <div className="flex justify-between gap-2 flex-wrap">
                    <div className="flex-grow w-4/5">
                      {result !== null && result !== undefined && (
                        <div className="bg-secondary rounded-3xl text-sm px-4 py-1.5 break-words">
                          <p className="font-bold m-0 mb-1">Result:</p>
                          <pre className="whitespace-pre-wrap break-words">{displayTxResult(result)}</pre>
                        </div>
                      )}
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleFetchToken}
                      disabled={isFetchingBalance}
                    >
                      {isFetchingBalance && <span className="loading loading-spinner loading-xs"></span>}
                      Read 📡
                    </button>
                  </div>
                </div>
                {Number(userBalance) > 0 && (
                  <div className="flex flex-col gap-3 py-5 first:pt-0 last:pb-1">
                    <p className="font-medium my-0 break-words">Send {tokenSymbol} Tokens</p>
                    <AddressInput
                      name="recipient_address"
                      value={recipientAddress}
                      placeholder="address to"
                      onChange={e => setRecipientAddress(e)}
                    />
                    <IntegerInput
                      value={transferAmount}
                      onChange={e => setTransferAmount(e)}
                      name="transfer_amount"
                      placeholder={`uint256 value (Max. ${userBalance} ${tokenSymbol} tokens)`}
                      disabled={false}
                      variant={IntegerVariant.UINT256}
                      disableMultiplyBy1e18={true}
                    />
                    {exceedsAmount && <span className="text-xs text-error">Transfer amount exceeds user balance</span>}
                    <div className="flex justify-between gap-2">
                      <div className="flex-grow basis-0">
                        {displayedTxResult ? <TxReceipt txResult={displayedTxResult} /> : null}
                      </div>
                      <div
                        className={`flex ${
                          writeDisabled &&
                          "tooltip before:content-[attr(data-tip)] before:right-[-10px] before:left-auto before:transform-none"
                        }`}
                        data-tip={`${writeDisabled && "Wallet not connected or in the wrong network"}`}
                      >
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={writeDisabled || isPending || exceedsAmount}
                          onClick={handleSendTokens}
                        >
                          {isPending && <span className="loading loading-spinner loading-xs"></span>}
                          Send 💸
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
