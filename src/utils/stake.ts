import * as anchor from "@project-serum/anchor";
import {TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID,Token} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  Transaction,
  ConfirmOptions,
  SYSVAR_CLOCK_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { 
  getParsedNftAccountsByOwner
} from "@nfteyez/sol-rayz";
import {
  COLLECTION_NAME,
  TOKEN_METADATA_PROGRAM_ID,
  PROGRAM_ID,
  POOL_ADDRESS,
  REWARD_TOKEN_ADDRESS
} from './constant'

const tokenMetadataProgramId = new anchor.web3.PublicKey(TOKEN_METADATA_PROGRAM_ID)
const programId = new PublicKey(PROGRAM_ID)
const idl = require('./idl.json')
const confirmOption : ConfirmOptions = {
    commitment : 'finalized',
    preflightCommitment : 'finalized',
    skipPreflight : false
}

const REWARD_TOKEN = new PublicKey(REWARD_TOKEN_ADDRESS)
let POOL = new PublicKey(POOL_ADDRESS)

const createAssociatedTokenAccountInstruction = (
  associatedTokenAddress: anchor.web3.PublicKey,
  payer: anchor.web3.PublicKey,
  walletAddress: anchor.web3.PublicKey,
  splTokenMintAddress: anchor.web3.PublicKey
    ) => {
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
    { pubkey: walletAddress, isSigner: false, isWritable: false },
    { pubkey: splTokenMintAddress, isSigner: false, isWritable: false },
    {
      pubkey: anchor.web3.SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    {
      pubkey: anchor.web3.SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  return new anchor.web3.TransactionInstruction({
    keys,
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    data: Buffer.from([]),
  });
}

const getMetadata = async (
  mint: anchor.web3.PublicKey
    ): Promise<anchor.web3.PublicKey> => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        tokenMetadataProgramId.toBuffer(),
        mint.toBuffer(),
      ],
      tokenMetadataProgramId
    )
  )[0];
};

const getTokenWallet = async (
  wallet: anchor.web3.PublicKey,
  mint: anchor.web3.PublicKey
    ) => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  )[0];
};

async function sendTransaction(transaction : Transaction,signers : Keypair[], wallet: any, conn: any) {
  transaction.feePayer = wallet.publicKey
  transaction.recentBlockhash = (await conn.getRecentBlockhash('max')).blockhash;
  await transaction.setSigners(wallet.publicKey,...signers.map(s => s.publicKey));
  if(signers.length !== 0)
    await transaction.partialSign(...signers)
  const signedTransaction = await wallet.signTransaction(transaction);
  let hash = await conn.sendRawTransaction(await signedTransaction.serialize());
  await conn.confirmTransaction(hash);
}

export async function claim(wallet:any, conn: any) {
  console.log("+ claim")
  let total = false;

  let provider = new anchor.Provider(conn, wallet as any, confirmOption)
  let program = new anchor.Program(idl,programId,provider)

  let transaction = new Transaction();
  
  let destRewardAccount = await getTokenWallet(wallet.publicKey,REWARD_TOKEN)

  console.log(await conn.getAccountInfo(destRewardAccount))
  if((await conn.getAccountInfo(destRewardAccount)) == null)
    transaction.add(createAssociatedTokenAccountInstruction(destRewardAccount,wallet.publicKey,wallet.publicKey,REWARD_TOKEN))

  const nfts:any = await getParsedNftAccountsByOwner({
    publicAddress: wallet.publicKey,
    connection: conn,
    sanitize: true
  });
  let myNfts = [];
  for (let i = 0; i < nfts.length; i ++) {
    if (nfts[i].data.symbol === COLLECTION_NAME) {
      myNfts.push(nfts[i]);
    }
  }
  if (myNfts.length === 0) {
    return {result: false, number:1}
  }

  if (transaction.instructions.length > 0) {
    try {
      total = true
      await sendTransaction(transaction,[], wallet, conn)
    } catch (error) {
      console.log(error)
      return {result:false, number:2}
    }
  }

  let j=0
  let bigTx : TransactionInstruction[] = [];
  for (let i = 0; i < myNfts.length; i ++) {
    let nftMint = new PublicKey(myNfts[i].mint);
    let [nftData, bump] = await PublicKey.findProgramAddress([nftMint.toBuffer()],programId);
    if ((await conn.getAccountInfo(nftData)) == null) {
      bigTx.push(
        program.instruction.initNft(
          new anchor.BN(bump),
          {
            accounts:{
              owner : wallet.publicKey,
              nftMint : nftMint,
              nftData : nftData,
              systemProgram : anchor.web3.SystemProgram.programId,
            }
          }
        )
      )
      total = true
      j++
    }
    if(j===7 || i === myNfts.length-1){
      if (j === 0) break
      let big = new Transaction()
      bigTx.map(item => big.add(item))
      try {
        await sendTransaction(big,[], wallet, conn)
      } catch (error) {
        console.log(error)
        return {result:false, number:2}
      }
      bigTx = []
      j=0
    }
  }

  j = 0;
  bigTx = [];
  for (let i = 0; i < myNfts.length; i ++) {
    let nftAccount = await getTokenWallet(wallet.publicKey, new PublicKey(myNfts[i].mint));
    let nftMetadata = await getMetadata(new PublicKey(myNfts[i].mint));
    let nftMint = new PublicKey(myNfts[i].mint);
    let [nftData, ] = await PublicKey.findProgramAddress([nftMint.toBuffer()],programId);
    let info = await program.account.nftData.fetch(nftData)
    if (Date.now() >= (info.lastClaimTime.toNumber() + 24*60*60)*1000 ) {
      bigTx.push(
        program.instruction.claim(
          {
            accounts : {
              owner : wallet.publicKey,
              nftAccount : nftAccount,
              nftMint : nftMint,
              metadata : nftMetadata,
              pool : POOL,
              nftData : nftData,
              rewardMint : REWARD_TOKEN,
              rewardAccount : destRewardAccount,
              tokenProgram : TOKEN_PROGRAM_ID,
              clock : SYSVAR_CLOCK_PUBKEY
            }
          }
        )
      )
      total = true;
      j++
    }
    
    if(j===5 || i === myNfts.length-1){
      if (j === 0) break
      let big = new Transaction()
      bigTx.map(item => big.add(item))
      try {
        await sendTransaction(big,[], wallet, conn)
      } catch (error) {
        console.log(error)
        return {result:false, number:2}
      }
      bigTx = []
      j = 0
    }
  }
  if (total) return {result: true, number:0}
  return {result:false, number:0}
}