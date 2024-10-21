import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
  ComputeBudgetProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import base58 from "bs58";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import axios from 'axios';
import { Buffer } from 'buffer'; // 引入 Buffer 模块
import {Wallet,  } from "@coral-xyz/anchor";




async function getKeyPairFromPrivateKey(key: string) {
  return Keypair.fromSecretKey(
    new Uint8Array(base58.decode(key))
  );
}

async function createTransaction(
  connection: Connection,
  instructions: TransactionInstruction[],
  payer: PublicKey,
  priorityFeeInSol: number = 0
): Promise<Transaction> {
  const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
    units: 1400000,
  });
  const transaction = new Transaction().add(modifyComputeUnits);


  if (priorityFeeInSol > 0) {
    const microLamports = priorityFeeInSol * 1_000_000_000; // convert SOL to microLamports
    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports,
    });
    transaction.add(addPriorityFee);
  }
  transaction.add(...instructions);
  transaction.feePayer = payer;
  transaction.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
  return transaction;
}

const buyDuck = async (payerPrivateKey: string,) => {
  console.log('开始mintDuck');
  const DUCK_PROGRAM = new PublicKey('pvwX4B67eRRjBGQ4jJUtiUJEFQbR4bvG6Wbe6mkCjtt')
  const payer = await getKeyPairFromPrivateKey(payerPrivateKey);
  const owner = payer.publicKey;
  const mint = new PublicKey('4ALKS249vAS3WSCUxXtHJVZN753kZV6ucEQC41421Rka');
  const txBuilder = new Transaction();
  const tokenAccountAddress = await getAssociatedTokenAddress(
    mint,
    owner,
    false
  );
  const wallet = new Wallet(payer)
  const tokenAccountInfo = await connection.getAccountInfo(tokenAccountAddress);

  let tokenAccount: PublicKey;
  if (!tokenAccountInfo) {
    txBuilder.add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        tokenAccountAddress,
        payer.publicKey,
        mint
      )
    );
    tokenAccount = tokenAccountAddress;
  } else {
    tokenAccount = tokenAccountAddress;
  }
  const [userState] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("user_state"),
      payer.publicKey.toBuffer(),
    ],
    DUCK_PROGRAM
  );
  const configPublicKey = new PublicKey('EEQGqAnxRoF7jixtxsLJk8o52JhBoDGtjmWAwvt6EJQE');

  const [mintAuthority] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("mint_authority"),
      configPublicKey.toBuffer(),
    ],
    DUCK_PROGRAM
  );

  const keys = [
    { pubkey: mint, isSigner: false, isWritable: true },
    { pubkey: configPublicKey, isSigner: false, isWritable: true },
    { pubkey: tokenAccount, isSigner: false, isWritable: true },
    { pubkey: userState, isSigner: false, isWritable: true },
    { pubkey: payer.publicKey, isSigner: true, isWritable: true }, 
    { pubkey: mintAuthority, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, 
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ];
  const instructionData = Buffer.from([59, 132, 24, 246, 122, 39, 8, 243]); 
  const instruction = new TransactionInstruction({
    keys: keys,
    programId: DUCK_PROGRAM,
    data: instructionData,
  });
  txBuilder.add(instruction);
  const transaction = await createTransaction(connection, txBuilder.instructions, payer.publicKey, priorityFeeInSol);

  transaction.add(SystemProgram.transfer({
    fromPubkey: wallet.publicKey,
    toPubkey: new PublicKey('DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL'),
    lamports: JitoTipAmount * 1e9,
  }))

  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer.publicKey;

  const signedTransaction = await wallet.signTransaction(transaction);
  // 下面2行代码可以注释。
  const simulationResult = await connection.simulateTransaction(signedTransaction);
  console.log('模拟交易结果：', JSON.stringify(simulationResult));

  // 发送交易
  const serializedTransaction = signedTransaction.serialize();
  const base58Transaction = base58.encode(serializedTransaction);

  const bundle_data = {
    jsonrpc: "2.0",
    id: 1,
    method: "sendBundle",
    params: [[base58Transaction]]
  };
  const bundle_resp = await axios.post(`https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles`, bundle_data, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  const bundle_id = bundle_resp.data.result
  console.log(`sent to frankfurt, bundle id: ${bundle_id}`)
}

// 钱包密钥
const secretKeyString = ''

// gas费
const priorityFeeInSol = 0.0015
// jito的小费
const JitoTipAmount = 0.0001

const RPC = 'https://purple-icy-wildflower.solana-mainnet.quiknode.pro/${your rpc token}'
const connection = new Connection(RPC, { commitment: 'processed', });

buyDuck(secretKeyString)