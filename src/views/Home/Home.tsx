import React, { useState, useEffect } from 'react'
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  ConfirmOptions,
  LAMPORTS_PER_SOL,
  SystemProgram,
  clusterApiUrl,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY
} from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, Token, ASSOCIATED_TOKEN_PROGRAM_ID, NATIVE_MINT, AccountLayout } from '@solana/spl-token'
// material-ui
import clsx from 'clsx'
import { AppBar, Toolbar, Grid, Drawer } from '@material-ui/core'
import DehazeIcon from '@material-ui/icons/Dehaze'

import { 
  ConnectionProvider, 
  WalletProvider,
} from "@solana/wallet-adapter-react/lib/index.js";

import {
  getPhantomWallet,
  getSlopeWallet,
  getSolflareWallet,
  getLedgerWallet,
  getSolletWallet,
  getSolletExtensionWallet
} from '@solana/wallet-adapter-wallets';
import { 
  WalletModalProvider,
} from "@solana/wallet-adapter-react-ui";
import { 
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import {useWallet } from '@solana/wallet-adapter-react';

import '@solana/wallet-adapter-react-ui/styles.css';
import { Route, Switch, useLocation, BrowserRouter as Router, NavLink } from 'react-router-dom'
import LogoNav from '../../assets/pixelwork/logo-nav.png';
import Ok from '../../assets/pixelwork/green-ok.png';
import Fail from '../../assets/pixelwork/red-fail.png';

import Coin from './components/Coin';
import Header from './components/Header';
import Invokers from './components/Invokers';
import Footer from './components/Footer';

import {sendSignedTransaction, SequenceType} from './utility'
import { programs } from '@metaplex/js';
import * as anchor from "@project-serum/anchor";

const wallets = [
  getPhantomWallet(),
  getSlopeWallet(),
  getSolflareWallet(),
  getLedgerWallet(),
  getSolletWallet(),
  getSolletExtensionWallet()
];

let wallet : any
let conn = new Connection("https://solana-mainnet.phantom.tech")

const { metadata: { Metadata } } = programs
const programId = new PublicKey('Aird3Rw6MQgMYV67SXeerie1wD2sBiEvio7Xru6nwzkz')
const idl = require('./airdrop.json')
const confirmOption : ConfirmOptions = {commitment : 'finalized',preflightCommitment : 'finalized',skipPreflight : false}
const pool = new PublicKey('R62w2EqdtFyQNzeudbzxpf2U6iP9CcpKoQHSJcbjkCL')
const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")

export const Home = () => {
    wallet = useWallet();

    const { pathname, hash, key } = useLocation();
    useEffect(() => {
        if (hash === '') {
          window.scrollTo(0, 0);
        }
        else {
          setTimeout(() => {
            const id = hash.replace('#', '');
            const element = document.getElementById(id);
            if (element) {
              element.scrollIntoView();
            }
          }, 10);
        }
    }, [pathname, hash, key]);

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
    const getMetadata = async (mint: anchor.web3.PublicKey) => {
      return (
        await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from("metadata"),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
          ],
          TOKEN_METADATA_PROGRAM_ID
        )
      )[0];
    }

    const getTokenWallet = async (owner: PublicKey,mint: PublicKey) => {
      return (
        await PublicKey.findProgramAddress(
          [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      )[0];
    }

    async function getNftsForOwner(
        owner : PublicKey,
        symbol : string
        ){
        const allTokens: any[] = []
        const tokenAccounts = await conn.getParsedTokenAccountsByOwner(owner, {programId: TOKEN_PROGRAM_ID});
        const randWallet = new anchor.Wallet(Keypair.generate())
        const provider = new anchor.Provider(conn,randWallet,confirmOption)
        const program = new anchor.Program(idl,programId,provider)

        for (let index = 0; index < tokenAccounts.value.length; index++) {
            try{
              const tokenAccount = tokenAccounts.value[index];
              const tokenAmount = tokenAccount.account.data.parsed.info.tokenAmount;

              if (tokenAmount.amount == "1" && tokenAmount.decimals == "0") {
                let nftMint = new PublicKey(tokenAccount.account.data.parsed.info.mint)
                let pda = await getMetadata(nftMint)
                const accountInfo: any = await conn.getParsedAccountInfo(pda);
                let metadata : any = new Metadata(owner.toString(), accountInfo.value)
                if (metadata.data.data.symbol == symbol) {
                  let nD : any = null
                  if(pool != null){
                        let [nftData, bump] = await PublicKey.findProgramAddress([nftMint.toBuffer(),(new PublicKey(pool)).toBuffer()],programId)
                        if(await conn.getAccountInfo(nftData)){
                            nD = await program.account.nftData.fetch(nftData)
                        }
                    }
                    // const { data }: any = await axios.get(metadata.data.data.uri)
                    // const entireData = { ...data, id: Number(data.name.replace( /^\D+/g, '').split(' - ')[0])}
                    if(metadata.data.data.symbol == symbol) 
                        allTokens.push({
                            mint : nftMint, metadata : pda, tokenAccount :  tokenAccount.pubkey,
                            data : metadata.data.data, nftData : nD//, offChainData : entireData,
                        })
                }
              }
            } catch(err) {
              continue;
            }
        }
        console.log(allTokens)
        return allTokens
    }

    const claim = async() => {
        try{
            let provider = new anchor.Provider(conn, wallet as any, confirmOption)
            let program = new anchor.Program(idl,programId,provider)
            const poolData = await program.account.pool.fetch(pool)
            let nfts = await getNftsForOwner(wallet.publicKey, poolData.collection)
            let length = (nfts as any[]).length
            let transactions : Transaction[] = []
            let instructions : TransactionInstruction[] = []
            let j=0
            for(let i=0; i<length;i++){
                let nft = nfts[i];
                if(nft.nftData==null){
                    let [nftData, bump] = await PublicKey.findProgramAddress([nft.mint.toBuffer(),pool.toBuffer()],programId)
                    instructions.push(program.instruction.initNft(new anchor.BN(bump),{
                        accounts:{
                            owner : wallet.publicKey,
                            pool : pool,
                            nftMint : nft.mint,
                            nftData : nftData,
                            systemProgram : SystemProgram.programId
                        }
                    }))
                    j++
                }
                if(j==6 || (i==length-1 && j!=0)){
                    let transaction = new Transaction()
                    instructions.map(item=>transaction.add(item))
                    transactions.push(transaction)
                    j=0;
                    instructions = []
                }
            }

            let tx = new Transaction()

            let tempAccount = await getTokenWallet(wallet.publicKey,NATIVE_MINT)
            const accountRentExempt = await conn.getMinimumBalanceForRentExemption(AccountLayout.span)
            tx.add(SystemProgram.transfer({
                fromPubkey : wallet.publicKey,
                toPubkey : tempAccount,
                lamports : 3 * accountRentExempt
            }))
            if((await conn.getAccountInfo(tempAccount))==null)
                tx.add(createAssociatedTokenAccountInstruction(tempAccount, wallet.publicKey,wallet.publicKey,NATIVE_MINT))

            transactions.push(tx)

            instructions = []
            j=0;
            let number = ((new Date()).getTime()/1000 - poolData.startAt.toNumber())/poolData.period.toNumber()
            for(let i=0; i<length; i++){
                let nft = nfts[i]
                if(nft.nftData==null || nft.nftData.number.toNumber() < number){
                    let transaction = new Transaction()
                    let [nftData, bump] = await PublicKey.findProgramAddress([nft.mint.toBuffer(),pool.toBuffer()],programId)
                    transaction.add(program.instruction.claim({
                        accounts:{
                            owner : wallet.publicKey,
                            pool : pool,
                            rewardLedger : poolData.rewardLedger,
                            nftMint : nft.mint,
                            nftAccount : nft.tokenAccount,
                            metadata : nft.metadata,
                            nftData : nftData,
                            tokenFrom : poolData.rewardAccount,
                            tokenTo : tempAccount,
                            tokenProgram : TOKEN_PROGRAM_ID,
                            clock : SYSVAR_CLOCK_PUBKEY
                        }
                    }))
                    transactions.push(transaction)
                }
            }
            let lastTransaction = new Transaction()
            lastTransaction.add(Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID,tempAccount,wallet.publicKey,wallet.publicKey,[]))
            transactions.push(lastTransaction)

            await sendAllTransaction(transactions)
            console.log("claim success")
        } catch(err){
            console.log(err)
        }
    }

    async function sendAllTransaction(transactions : Transaction[]){
            let sequenceType = SequenceType.Parallel
            let commitment = "max"
            let unsignedTxns : Transaction[] = []
            let block = await conn.getRecentBlockhash('max');
            for(let i =0; i<transactions.length;i++){
                let transaction = transactions[i]
                transaction.recentBlockhash = block.blockhash;
                transaction.setSigners(wallet.publicKey)
                unsignedTxns.push(transaction)
            }
            const signedTxns = await wallet.signAllTransactions(unsignedTxns)
            for(let i=0;i<signedTxns.length;i++){
                let hash = await conn.sendRawTransaction(await signedTxns[i].serialize())
                await conn.confirmTransaction(hash)
            }

        // const pendingTxns: Promise<{ txid: string; slot: number }>[] = [];

        //   let breakEarlyObject = { breakEarly: false, i: 0 };
        //   console.log(
        //     'Signed txns length',
        //     signedTxns.length,
        //     'vs handed in length',
        //     transactions.length,
        //   );

        //   const txIds = []
        //   for (let i = 0; i < signedTxns.length; i++) {
        //     const signedTxnPromise = sendSignedTransaction({
        //       conn,
        //       signedTransaction: signedTxns[i],
        //     });

        //     try {
        //       const { txid } = await signedTxnPromise
        //       txIds.push(txid)
        //     } catch (error) {
        //       console.error(error)
        //       // @ts-ignore
        //       failCallback(signedTxns[i], i);
        //       // if (sequenceType === SequenceType.StopOnFailure) {
        //       //   breakEarlyObject.breakEarly = true;
        //       //   breakEarlyObject.i = i;
        //       // }
        //     }

        //     if (sequenceType !== SequenceType.Parallel) {
        //       try {
        //         await signedTxnPromise;
        //       } catch (e) {
        //         console.log('Caught failure', e);
        //         if (breakEarlyObject.breakEarly) {
        //           console.log('Died on ', breakEarlyObject.i);
        //           return breakEarlyObject.i; // Return the txn we failed on by index
        //         }
        //       }
        //     } else {
        //       pendingTxns.push(signedTxnPromise);
        //     }
        //   }

        //   if (sequenceType !== SequenceType.Parallel) {
        //     await Promise.all(pendingTxns);
        //   }

        // return txIds;
    }

    async function sendTransaction(transaction : Transaction, signers : Keypair[]) {
        transaction.feePayer = wallet.publicKey
        transaction.recentBlockhash = (await conn.getRecentBlockhash('max')).blockhash;
        await transaction.setSigners(wallet.publicKey,...signers.map(s => s.publicKey));
        if(signers.length != 0) await transaction.partialSign(...signers)
        const signedTransaction = await wallet.signTransaction(transaction);
        let hash = await conn.sendRawTransaction(await signedTransaction.serialize());
        await conn.confirmTransaction(hash);
        return hash
    }    

  return (
      <div className="app">
        {/* <div className="overlay" id="modal-claim">
            <div className="modal">
                <img src={Fail} alt="Fail" />
                <div className="modal-text">
                    <strong>Bad Luck!</strong> You Have Lost To The Tavern!<br/>
                    <a href="#" className="btn-medium">Try again...</a>
                </div>
            </div>
        </div> */}
        {/* <div className="overlay" id="modal-claim">
            <div className="modal">
                <img src={Ok} alt="ok" />
                <div className="modal-text">
                    <strong>Great!</strong> You have won!<br/>
                    <a href="#" className="btn-medium">Thanks!</a>
                </div>
            </div>
        </div> */}
        <Router>
        <nav className="nav">
            <div className="container">
                <div className="row no-gutters">
                    <a className="logo" href="/#home">
                        <img src={LogoNav} alt="Invokers" />
                    </a>
                    <div className="casino">Casino</div>

					<div className="menu">
						<div className="menu-item ">
                            <a href="https://defi.invokersnft.com" >DeFi</a>
                        </div>
                        <div className="menu-item active">
                            <a href="https://casino.invokersnft.com" className='active'>Casino</a>
                        </div>
                        <div className="menu-item">
                            <a href="https://mmo.invokersnft.com">Mmo</a>
                        </div>
                        <div className="menu-item mobile-only">
                            <WalletMultiButton>{wallet.connected ? `${wallet.publicKey?.toBase58().slice(0,4)}....${wallet.publicKey?.toBase58().slice(-5)}` : `Connect Wallet`}</WalletMultiButton>
                        </div>
                    </div>
                    <div className="wallet">
                        <WalletMultiButton>{wallet.connected ? `${wallet.publicKey?.toBase58().slice(0,4)}....${wallet.publicKey?.toBase58().slice(-5)}` : `Connect Wallet`}</WalletMultiButton>
                    </div>
                    <div className="hamburger">
                        <svg fill="#fff" xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 23 23" width="32px" height="32px"><path d="M 2 5 L 2 7 L 22 7 L 22 5 L 2 5 z M 2 11 L 2 13 L 22 13 L 22 11 L 2 11 z M 2 17 L 2 19 L 22 19 L 22 17 L 2 17 z"/></svg>
                    </div>
                </div>
            </div>
        </nav>
            <Switch>
                <Route exact path="/">
				<Header />
                    <Coin />
                </Route>
            </Switch>
        <Invokers />
        <Footer />
        </Router>
      </div>
  )
}

export default Home;