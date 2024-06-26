import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

import { contractABI, contractAddress } from "../utils/constants";

export const TransactionContext = React.createContext();

const { ethereum } = window;
const getEthereumContract = async () => {
  const provider = new ethers.providers.Web3Provider(ethereum);
  const signer = await provider.getSigner();
  const transactionContract = new ethers.Contract(contractAddress, contractABI, signer);

  return transactionContract;
};

export const TransactionProvider = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState("");
  const [formData, setformData] = useState({ addressTo: "", amount: "", keyword: "", message: "" });
  const [transactions, setTransactions] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [transactionCount, setTransactionCount] = useState(localStorage.getItem("transactionCount"));

  const handleChange = (e, name) => {
    setformData((prevState) => ({ ...prevState, [name]: e.target.value }));
  };

  const sendTransaction = async () => {
    try {
      if (!ethereum) return alert("Please install metamask");
      const { addressTo, amount, keyword, message } = formData;
      const transactionContract = await getEthereumContract();

      const parsedAmount = ethers.utils.parseEther(amount);
      console.log("amm", parsedAmount._hex);
      await ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: currentAccount,
            to: addressTo,
            gas: "0x5208",
            value: parsedAmount._hex,
          },
        ],
      });
      const transactionHash = await transactionContract.addToBlockchain(addressTo, parsedAmount, message, keyword);
      setIsLoading(true);
      console.log(`Loading - ${transactionHash.hash}`);
      await transactionHash.wait();
      console.log(`Success - ${transactionHash.hash}`);
      setIsLoading(false);

      const transactionCount = await transactionContract.getTransactionCount();

      setTransactionCount(transactionCount.toNumber());
    } catch (error) {
      console.log(error);
      throw new Error("No ethereum object");
    }
  };
  const getAllTransactions = async () => {
    try {
      if (!ethereum) return alert("Please install metamask");
      const transactionContract = await getEthereumContract();
      const availableTransactions = await transactionContract.getAllTransactions();

      const structuredTransactions = availableTransactions.map((transaction) => ({
        addressTo: transaction.receiver,
        addressFrom: transaction.sender,
        timestamp: new Date(transaction.timestamp.toNumber() * 1000).toLocaleString(),
        message: transaction.message,
        keyword: transaction.keyword,
        amount: parseInt(transaction.amount._hex) / 10 ** 18,
      }));

      console.log(structuredTransactions);

      setTransactions(structuredTransactions);
    } catch (error) {
      throw new Error("No ethereum object");
    }
  };

  const checkIfWalletIsConnected = async () => {
    try {
      if (!ethereum) return alert("Please install metamask");
      const accounts = await ethereum.request({ method: "eth_accounts" });
      if (accounts.length) {
        setCurrentAccount(accounts[0]);
        getAllTransactions();
      } else {
        console.log("no accounts found !");
      }
    } catch (error) {
      throw new Error("No ethereum object");
    }
  };

  const connectWallet = async () => {
    try {
      if (!ethereum) return alert("Please install metamask");
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      console.log(accounts);
      setCurrentAccount(accounts[0]);

      console.log("connected");
    } catch (error) {
      throw new Error("No ethereum object");
    }
  };

  const checkIfTransactionsExists = async () => {
    try {
      const transactionContract = await getEthereumContract();
      const transactionCount = await transactionContract.getTransactionCount();
      window.localStorage.setItem("transactionCount", currentTransactionCount);
    } catch (error) {
      throw new Error("No ethereum object");
    }
  };

  useEffect(() => {
    checkIfWalletIsConnected();
    checkIfTransactionsExists();
  }, [transactionCount]);

  return (
    <TransactionContext.Provider
      value={{ connectWallet, currentAccount, formData, setformData, handleChange, sendTransaction, transactions, isLoading }}
    >
      {children}
    </TransactionContext.Provider>
  );
};
