import { Fragment, useRef, useState, useEffect } from 'react';
import { useWallet } from "@solana/wallet-adapter-react";
import Ok from '../../../assets/pixelwork/green-ok.png';
import Fail from '../../../assets/pixelwork/red-fail.png';
import LoadingImage from '../../../assets/pixelwork/invokers-flip-loader.png'
import SolanaLogo from '../../../assets/pixelwork/solana-logo.png'
import SucessParticle from './SucessParticle'
import Spinner from './Spinner';

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
import {AccountLayout,MintLayout,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID,Token, NATIVE_MINT} from "@solana/spl-token";
import * as bs58 from 'bs58'
import * as anchor from "@project-serum/anchor";
import { Container, Snackbar } from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import { CircularProgress, Modal, Box, Button } from '@mui/material'
import axios from 'axios'
let wallet : any
let conn = new Connection("https://solana-api.projectserum.com")

const SERVER_URL = "https://tavern.invokersnft.com/nodeserver/"

const programId = new PublicKey('f1ip66vevC2TVtJ4CBkjGp2ghEv3uczYbLLHFHg8Qrz')
const POOL = new PublicKey('7VsxSGfCd5jWRzyADcDsvZAhVLDEeXzxXMdF6Y61Hodk')

const AIRDROP_POOL = new PublicKey('R62w2EqdtFyQNzeudbzxpf2U6iP9CcpKoQHSJcbjkCL')
const AIRDROP_REWARD_LEDGER = new PublicKey('68KmxSYQUNjeW43u8BZD3YTaCy4v1fo1rqAKm6tsjhfo')
const AIRDROP_PROGRAM = new PublicKey('Aird3Rw6MQgMYV67SXeerie1wD2sBiEvio7Xru6nwzkz')

const idl = require('./betting.json')
const confirmOption : ConfirmOptions = {commitment : 'finalized',preflightCommitment : 'finalized',skipPreflight : false}
const PLAY_AUTHORITY = Keypair.fromSecretKey(Uint8Array.from([80,192,231,156,20,200,40,10,65,170,253,154,166,80,33,180,144,99,177,140,188,216,117,64,253,68,100,37,101,9,179,201,8,175,249,57,0,13,107,4,99,238,142,195,184,5,149,218,102,126,26,58,2,109,130,75,34,56,234,63,54,209,220,96]))
const constAmounts = [0.05, 0.1, 0.25, 0.50, 1, 2]

const INV_TOKEN_MINT = new PublicKey('invSTFnhB1779dyku9vKSmGPxeBNKhdf7ZfGL1vTH3u')
const INV_POOL = new PublicKey('B97oTaJMWFLvbGe1dfbLawYZQN4LA19CC4yKY2pPbQN6')
const INV_AIRDROP_POOL = new PublicKey('FTQe1wVM87qRjBMWAjsZdwfz2chsaJM3QAFFdgCMChKb')
const INV_REWARD_LEDGER = new PublicKey('FA3HJkzwT3D9gFQiXauqVVsQfXo9RPm7JeDsYuqewYf5')
const constInvAmounts = [100, 200, 500, 1000, 2000, 5000]

interface AlertState {
  open: boolean;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error' | undefined;
}

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    pt: 2,
    px: 4,
    pb: 3,
    
};

export default function Coin() {
    wallet = useWallet()   

    const [open, setOpen] = useState(false)
    const [alertState, setAlertState] = useState<AlertState>({open: false,message: '',severity: undefined})
    const [pool, setPool] = useState<PublicKey>(INV_POOL)
    const [poolLog, setPoolLog] = useState<any[]>([])
    const [solAmount, setSolAmount] = useState(0)
    const [poolData, setPoolData] = useState<any>(null)
    const [userData, setUserData] = useState<any>(null)    
    const [coinForm, setCoinForm] = useState(true)
    const [amount, setAmount] = useState('')
    const [selectAmount, setSelectAmount] = useState(0)
    const [tabPanel, setTabPanel] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isWaitingForReponse, setIsWaitingForReponse] = useState(false)
    const [isResponseLoaded, setIsResponseLoaded] = useState(false)
    const [isStoppedAnimation, setIsStoppedAnimation] = useState(false)
    const [isSelectedFirstCoin, setIsSelectedFirstCoin] = useState(true)
    const [isGettingData, setIsGettingData] = useState(false)

    const [invAmount, setInvAmount] = useState(0)

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
    const getTokenWallet = async (owner: PublicKey,mint: PublicKey) => {
      return (
        await PublicKey.findProgramAddress(
          [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      )[0];
    }
    // const getTokenAmount = async (pD : any) =>{
    //     try{
    //         let amount = ((await conn.getTokenAccountBalance(pD.tokenAccount)).value as any).uiAmount
    //         return amount
    //     }catch(err){
    //         return 0
    //     }
    // }
    useEffect(()=>{
        if(isSelectedFirstCoin)
            setPool(INV_POOL)
        else
            setPool(POOL)
    },[isSelectedFirstCoin])

    useEffect(()=>{
        getPoolData()
    },[pool])

    useEffect(()=>{
        if(wallet.publicKey!=null)
            getUserData()
    },[poolData, wallet, wallet.publicKey])
    
    const handleOpen = () => {
        setOpen(true);
    };
    const handleClose = () => {
        setOpen(false);
    };
    useEffect(()=>{
        const interval = setInterval(()=>{
            getPoolLog()
        },5000)
        return () => clearInterval(interval)
    }, [tabPanel])

    useEffect(()=>{
        getPoolLog()
    },[tabPanel,isSelectedFirstCoin])

    const getPoolLog = async() => {
        setIsGettingData(true)
        try{
            if(tabPanel==0){
                axios.get(SERVER_URL+"api/coinflip/recent").then((response)=>{
                    setPoolLog(response.data.data.reverse())
                })
            }else if(tabPanel==1){
                axios.get(SERVER_URL+"api/coinflip/winstreak").then((response)=>{
                    setPoolLog(response.data.data.reverse())
                })
            }else if(tabPanel==2){
                axios.get(SERVER_URL+"api/coinflip/top").then((response)=>{
                    if(isSelectedFirstCoin)
                        setPoolLog(response.data.data.iv.reverse())
                    else
                        setPoolLog(response.data.data.sol.reverse())
                })
            }
        }catch(err){

        }
        setIsGettingData(false)
    }

    const getPoolData = async() => {
        try{
            const poolAddress = new PublicKey(pool)
            const randWallet = new anchor.Wallet(Keypair.generate())
            const provider = new anchor.Provider(conn,randWallet,confirmOption)
            const program = new anchor.Program(idl,programId,provider)
            const pD = await program.account.pool.fetch(poolAddress)
            setPoolData(pD)
            if(pD.status){
                setOpen(true)
            }
        } catch(err){
            console.log(err)
            setPoolData(null)
        }
    }

    const getUserData = async(isFromClaim?: boolean) => {
        try{
            setSolAmount((await conn.getBalance(wallet.publicKey))/LAMPORTS_PER_SOL)
            let tokenAccount = await getTokenWallet(wallet.publicKey, INV_TOKEN_MINT)
            if((await conn.getAccountInfo(tokenAccount))==null) setInvAmount(0)
            else{
                let amount = ((await conn.getTokenAccountBalance(tokenAccount)).value as any).uiAmount
                setInvAmount(amount)
            }
            const [playerAddress,bump] = await PublicKey.findProgramAddress([wallet.publicKey.toBuffer(),pool.toBuffer()],programId)
            const randWallet = new anchor.Wallet(Keypair.generate())
            const provider = new anchor.Provider(conn,randWallet,confirmOption)
            const program = new anchor.Program(idl,programId,provider)
            const pD = await program.account.player.fetch(playerAddress)
            setUserData(pD)
            if (isFromClaim) {
                setIsWaitingForReponse(false);
            }
            return pD
        }catch(err){
            console.log(err)
            setUserData(null)
            if (isFromClaim) {
                setIsWaitingForReponse(false);
            }
        }
    }

    const flip = async() => {
        setIsPlaying(true)
        setIsLoading(true)
        setIsResponseLoaded(false)
        setIsStoppedAnimation(false)
        try{
            let provider = new anchor.Provider(conn, wallet as any, confirmOption)
            let program = new anchor.Program(idl,programId,provider)
            let transaction = new Transaction()

            let playAmount = 0
            if(selectAmount>=0){
                if(isSelectedFirstCoin)
                    playAmount = constInvAmounts[selectAmount] * LAMPORTS_PER_SOL
                else
                    playAmount = constAmounts[selectAmount] * LAMPORTS_PER_SOL
            }else{
                playAmount = Number(amount) * LAMPORTS_PER_SOL
            }
            if((playAmount > 3 * LAMPORTS_PER_SOL && isSelectedFirstCoin==false) || (playAmount > 7200 * LAMPORTS_PER_SOL && isSelectedFirstCoin==true)){
                setAlertState({open: true, message:"Invalid Amount! Maximum is 3 SOL and 7200 IV",severity:'error'})
                setIsLoading(false)
                setIsPlaying(false)
                return
            }
            let [player, bump] = await PublicKey.findProgramAddress([wallet.publicKey.toBuffer(),isSelectedFirstCoin ? INV_POOL.toBuffer() : pool.toBuffer()], programId)
            if((await conn.getAccountInfo(player)) == null){
                transaction.add(program.instruction.initPlayer(new anchor.BN(bump),{
                    accounts : {
                        owner : wallet.publicKey,
                        pool : pool,
                        player : player,
                        systemProgram : SystemProgram.programId,
                    }
                }))
            }
            let tempAccount = await getTokenWallet(wallet.publicKey, poolData.tokenMint)
            // if(await conn.getAccountInfo(tempAccount))
            //     transaction.add(Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID,tempAccount,wallet.publicKey,wallet.publicKey,[]))
            const accountRentExempt = await conn.getMinimumBalanceForRentExemption(AccountLayout.span)
            if(!isSelectedFirstCoin)
                transaction.add(SystemProgram.transfer({
                    fromPubkey : wallet.publicKey,
                    toPubkey : tempAccount,
                    lamports : playAmount + 3 * accountRentExempt
                }))
            if((await conn.getAccountInfo(tempAccount))==null)
                transaction.add(createAssociatedTokenAccountInstruction(tempAccount, wallet.publicKey,wallet.publicKey,poolData.tokenMint))
            let transferAuthority = Keypair.generate()
            // transaction.add(Token.createApproveInstruction(TOKEN_PROGRAM_ID,tempAccount,transferAuthority.publicKey,wallet.publicKey,[],playAmount))
            transaction.add(program.instruction.play(new anchor.BN(playAmount),coinForm,{
                accounts : {
                    owner : wallet.publicKey,
                    pool : pool,
                    player : player,
                    tokenFrom : tempAccount,
                    tokenTo : poolData.tokenAccount,
                    transferAuthority : transferAuthority.publicKey,
                    tokenProgram : TOKEN_PROGRAM_ID,
                    clock : SYSVAR_CLOCK_PUBKEY,
                    playAuthority : PLAY_AUTHORITY.publicKey,
                }
            }))
            // transaction.add(Token.createRevokeInstruction(TOKEN_PROGRAM_ID,tempAccount,wallet.publicKey,[]))
            if(!isSelectedFirstCoin)
                transaction.add(Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID,tempAccount,wallet.publicKey,wallet.publicKey,[]))
            await sendTransaction(transaction, [transferAuthority,PLAY_AUTHORITY])
            // setAlertState({open: true, message:"Congratulations!  All transaction Ended!",severity:'success'})
            let pD = await getUserData()
            setTimeout(() => {
                setIsResponseLoaded(true)
            }, 8 * 1000);
            
            if(pD != null)
                axios.post(SERVER_URL+"api/coinflip/play",{wallet : wallet.publicKey.toBase58(), coin : (isSelectedFirstCoin ? 1 : 0), amount : playAmount/LAMPORTS_PER_SOL, status : pD.status}).then(response=>{
                })
        }catch(err){
            setIsResponseLoaded(true)
            console.log(err)
            // setAlertState({open: true, message:"Failed! Please try again!",severity:'error'})
        }
        setIsLoading(false)
    }

    const claim = async() => {
        setIsWaitingForReponse(true)
        try {
            let provider = new anchor.Provider(conn, wallet as any, confirmOption)
            let program = new anchor.Program(idl,programId,provider)
            let transaction = new Transaction()
            let [player, bump] = await PublicKey.findProgramAddress([wallet.publicKey.toBuffer(),pool.toBuffer()], programId)
            let tempAccount = await getTokenWallet(wallet.publicKey, poolData.tokenMint)
            // if(await conn.getAccountInfo(tempAccount))
            //     transaction.add(Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID,tempAccount,wallet.publicKey,wallet.publicKey,[]))
            const accountRentExempt = await conn.getMinimumBalanceForRentExemption(AccountLayout.span)
            if(!isSelectedFirstCoin)
                transaction.add(SystemProgram.transfer({
                    fromPubkey : wallet.publicKey,
                    toPubkey : tempAccount,
                    lamports : 3 * accountRentExempt
                }))
            if((await conn.getAccountInfo(tempAccount))==null)
                transaction.add(createAssociatedTokenAccountInstruction(tempAccount, wallet.publicKey,wallet.publicKey,poolData.tokenMint))
            if(poolData.isInvoker) {
                transaction.add(program.instruction.claimInvoker({
                    accounts:{
                        owner : wallet.publicKey,
                        pool : pool,
                        player : player,
                        tokenFrom : poolData.tokenAccount,
                        tokenTo : tempAccount,
                        feeReceiver : poolData.feeReceiver,
                        tokenProgram : TOKEN_PROGRAM_ID,
                        airdropPool : isSelectedFirstCoin ? INV_AIRDROP_POOL : AIRDROP_POOL,
                        airdropRewardLedger : isSelectedFirstCoin ? INV_REWARD_LEDGER : AIRDROP_REWARD_LEDGER,
                        airdropProgram : AIRDROP_PROGRAM,
                        clock : SYSVAR_CLOCK_PUBKEY,
                    }
                }))
            } else {
                transaction.add(program.instruction.claim({
                    accounts:{
                        owner : wallet.publicKey,
                        pool : pool,
                        player : player,
                        tokenFrom : poolData.tokenAccount,
                        tokenTo : tempAccount,
                        feeReceiver : poolData.feeReceiver,
                        tokenProgram : TOKEN_PROGRAM_ID,
                    }
                }))
            }
            if(!isSelectedFirstCoin)
                transaction.add(Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID,tempAccount,wallet.publicKey,wallet.publicKey,[]))
            await sendTransaction(transaction, [])
            await getUserData(true)
            // setAlertState({open: true, message:"Congratulations!  All transaction Ended!",severity:'success'})
        } catch(err) {
            console.log(err)
            setIsWaitingForReponse(false)
            // setAlertState({open: true, message:"Failed! Please try again!",severity:'error'})
        }
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

    function roundValue(value : number, decimal:number){
        return Math.round(value * Math.pow(10,decimal)) / Math.pow(10, decimal)
    }

  return (
    <section className="casino-coin">
    {
        (poolData == null || userData == null || (isPlaying == false && userData.status == 0)) ?
    		<div className="container">
    			<div className="row">
                    <div className="col-xl-12">
                        <div className="subheading center">Double or nothing</div>
                        <div className="heading center">Tavern Coin Toss</div>
                        <div className="coin-content">
                            <div className='flip-options'>
                                <div className={isSelectedFirstCoin ? "flip-box active" : "flip-box"} onClick={()=> setIsSelectedFirstCoin(true)}>
                                    <img src={LoadingImage} alt="" />
                                    <div className='flip-box-text'>You have: <span>{roundValue(invAmount,4)} $IV</span></div>
                                </div>
                                <div className={!isSelectedFirstCoin ? "flip-box active" : "flip-box"} onClick={()=> setIsSelectedFirstCoin(false)}>
                                    <img src={SolanaLogo} alt="" />
                                    <div className='flip-box-text'>You have: <span>{roundValue(solAmount,4)} SOL</span></div>
                                </div>
                            </div>
                            <div className="coin-choose-text">I choose</div>
                            <div className="coin-choose-form">
                                <div className={coinForm ? "heads active" : "heads"} onClick={()=>setCoinForm(true)}></div>
                                <div className={coinForm ? "tails" : "tails active"} onClick={()=>setCoinForm(false)}></div>
                            </div>
                            <div className="coin-for-text">for</div>
                            { !isSelectedFirstCoin ?
                                <div className="coin-for-items">
                                {
                                    constAmounts.map((item, idx)=>{
                                        return <button className={idx==selectAmount && amount=='' ? "btn-medium active" : "btn-medium"}key={idx} onClick={()=>{
                                            setSelectAmount(idx)
                                            setAmount('')
                                        }}>{item+" SOL"}</button>
                                    })
                                }
                                </div> 
                                : 
                                <div className="coin-for-items">
                                {
                                    constInvAmounts.map((item, idx)=>{
                                        return <button className={idx==selectAmount && amount=='' ? "btn-medium active" : "btn-medium"}key={idx} onClick={()=>{
                                            setSelectAmount(idx)
                                            setAmount('')
                                        }}>{item+" $IV"}</button>
                                    })
                                }
                                </div> 
                            }
                            <div className="coin-value">
                                <input type="text" placeholder="Custom Value..." onChange={(event)=>{
                                    if(event.target.value==''){
                                        setAmount('')
                                        setSelectAmount(0)
                                    }else{
                                        setAmount(event.target.value)
                                        setSelectAmount(-1)
                                    }
                                }} value={amount}/>
                            </div>
                            <div className="coin-btn">
                                <button type="button" className="btn-large"
                                    onClick={ async () => {
                                        setIsPlaying(true)
                                        await flip()
                                    }}
                                    disabled={isLoading}>
                                    {isLoading ? <Spinner /> : ''} Flip!
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-12">
                        <div className="history-content">
                            <div className="history-nav">
                                <ul>
                                    <li className={tabPanel==0 ? "active" : ""} onClick={()=>{setTabPanel(0)}}>
                                        <a>Recent</a>
                                    </li>
                                    <li className={tabPanel==1 ? "active" : ""} onClick={()=>{setTabPanel(1)}}>
                                        <a>Winstreaks</a>
                                    </li>
                                    <li className={tabPanel==2 ? "active" : ""} onClick={()=>{setTabPanel(2)}}>
                                        <a>Top 10 (week)</a>
                                    </li>
                                    
                                </ul>
                            </div>
                            <div className="history-logs">
                            {
                                poolLog != null && poolLog.length!=0 && isGettingData==false &&
                                <>
                                {
                                    (poolLog as any[]).map((item,idx)=>{
                                        try{
                                            if(tabPanel==0)
                                                return <div key={idx} className={item.last_status ? "history-log type-1" : "history-log type-2"}>
                                                    <span>{"Wallet (" + item.wallet.substr(0,6) + ")"}</span> flipped <span>{roundValue(item.last_amount,6) + (item.last_coin ? " IV" : " SOL")}</span> and <span>{item.last_status==1 ? (item.last_winstreak > 1 ? "doubled "+ item.last_winstreak +" times!" : "doubled") : "Lost to the Tavern"}</span>
                                                </div>
                                            else if(tabPanel==1)
                                                return <div key={idx} className="history-log type-1">
                                                    <span>{"Wallet (" + item.wallet.substr(0,6) + ")"}</span> was on a <span>{item.max_winstreak}</span> streak.
                                                </div>
                                            else if(tabPanel==2)
                                                return <div key={idx} className="history-log type-2">
                                                    <span>{"Wallet (" + item.wallet.substr(0,6) + ")"}</span> earned <span>{isSelectedFirstCoin ? roundValue(item.iv_total,6)+" IV" : roundValue(item.sol_total,6)+" SOL"}</span> from the Tavern
                                                </div>
                                        }catch(err){
                                            console.log(err)
                                        }
                                    })
                                }
                                </>
                            }
                            </div>
                        </div>
                    </div>
    			</div>
    		</div>
        :
            <div className="overlay open" id="modal-claim">
                <div className="modal">
                {
                    isLoading ?
                        <div className="coin-content">
                            <div className="flipping-amount">Flipping for <span className="text-underline">{selectAmount >= 0 ? (isSelectedFirstCoin ? constInvAmounts[selectAmount] : constAmounts[selectAmount]) : amount} {isSelectedFirstCoin ? "IV" : "SOL"}</span></div>
                            <div className="flipping-img">
                                <img src={LoadingImage} alt="Loading..."></img>
                            </div>
                            <div className="flipping-note">
                                Note: Please wait for the transaction to be confirmed, <br /> it usually takes 15-60 seconds.
                            </div>
                        </div>
                    :
                    userData.status == 1 && userData.amount.toNumber() > 0 ?
                        <>
                            {isResponseLoaded ?
                                <>
                                    <div className="result-img">
                                        <img src={Ok} alt="Win" />
                                    </div>
                                    <div className='result-title'>We have a winner!</div>
                                    <div className='result-subtext'>You win in a <span className='white'>{(userData.amount.toNumber() / LAMPORTS_PER_SOL) + ''} {isSelectedFirstCoin ? "IV" : "SOL"}</span> streak!</div>
                                    <button type="button" className="btn-large btn-result" onClick={ async ()=> {
                                        await claim()
                                        setIsPlaying(false)
                                    }} disabled={isWaitingForReponse}>
                                    {isWaitingForReponse ? <><Spinner /> Please wait...</> : 'Claim!'}</button>
                                </>
                                : 
                                <>
                                { isStoppedAnimation ?
                                    '':
                                    <>
                                        {
                                            coinForm && userData.status == 1 ?
                                            <video src="/video/invokers-flip-heads_VP8.webm" muted={true} autoPlay={true} /> :
                                            <video src="/video/invokers-flip-tails_VP8.webm" muted={true} autoPlay={true} />
                                        }
                                        {!isResponseLoaded ? 
                                            <button type="button" className="btn-large btn-center" onClick={ async () => {
                                                setIsResponseLoaded(true)
                                                setIsStoppedAnimation(true)
                                            }}>Skip animation</button> : ''
                                        }
                                    </>
                                }
                                </>
                            }
                        </>
                    :
                    <>
                        {isResponseLoaded ?
                            <>
                                <div className="result-img">
                                    <img src={Fail} alt="Lost" />
                                </div>
                                <div className='result-title'>You have lost!</div>
                                <div className='result-subtext'>Don't worry and try again!</div>
                                <button type="button" className="btn-large" onClick={ async () => {
                                        setIsPlaying(false)
                                }}>Play again!</button>
                            </>
                            : 
                            <>
                            { isStoppedAnimation ?
                                '':
                                <>
                                    {
                                        coinForm ?
                                        <video src="/video/invokers-flip-tails_VP8.webm" muted={true} autoPlay={true} /> :
                                        <video src="/video/invokers-flip-heads_VP8.webm" muted={true} autoPlay={true} />
                                    }
                                    {!isResponseLoaded ? 
                                        <button type="button" className="btn-large btn-center" onClick={ async () => {
                                            setIsResponseLoaded(true)
                                            setIsStoppedAnimation(true)
                                        }}>Skip animation</button> : ''
                                    }
                                </>
                            }
                            </>
                        }
                    </>
                }
                </div>
            </div>
        }
        <Snackbar
            open={alertState.open}
            autoHideDuration={alertState.severity != 'warning' ? 6000 : 100000}
            onClose={() => setAlertState({ ...alertState, open: false })}>
            <Alert
              onClose={() => setAlertState({ ...alertState, open: false })}
              severity={alertState.severity}
            >
                {alertState.message}
            </Alert>
        </Snackbar>
	</section>
  )
}
