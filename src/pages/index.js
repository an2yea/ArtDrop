import Head from 'next/head'
// import Image from 'next/image'
import { Inter } from 'next/font/google'
import styles from '@/styles/Home.module.css'
import { Button, Container, Flex, Text, Box, Textarea, Image, Alert, AlertDescription, AlertIcon, AlertTitle, DrawerOverlay, Drawer, DrawerBody, DrawerContent, DrawerHeader, useDisclosure, Spinner, Center} from '@chakra-ui/react'
import { CloseIcon, HamburgerIcon } from '@chakra-ui/icons';
import Link from 'next/Link';
import { ethers, Contract, providers, utils } from "ethers";
import axios from 'axios'
import { GaslessOnboarding} from "@gelatonetwork/gasless-onboarding"
import { useState, useEffect, use } from 'react'
const inter = Inter({ subsets: ['latin'] })
import { CONTRACT_ABI, CONTRACT_ADDRESS} from '../constants/contracts'


export default function Home() {

  //variables

  let replicate_private_key = process.env.NEXT_PUBLIC_REPLICATE_PVT_KEY;
  let pinata_jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
  let grad1 = 'linear-gradient(90deg, rgba(10,116,255,1) 0%, rgba(52,122,202,1) 38%, rgba(0,228,173,1) 100%)'
  let grad2 = 'linear-gradient(90deg,rgba(0,228,173,1) 0%, rgba(52,122,202,1) 38%, rgba(10,116,255,1) 100%)'
  //States - Minting ----------
  const [prompt, setPrompt] = useState('')
  const [generated, setGenerated] = useState(false)
  const [generatingImg, setGeneratingImg] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [minting, setMinting] = useState(false)
  const [taskId, setTaskId] = useState('')
  const [taskStatus, setTaskStatus] = useState('')

  //States - Wallet
  const [loginLoding, setLoginLoading] = useState(false)
  const [walletAddress, setWalletAddress] = useState();
  const [gobMethod, setGOBMethod] = useState(null);
  const [web3AuthProvider, setWeb3AuthProvider] = useState(null)
  const [tokens, setTokens] = useState([]);
  const [gw, setGW] = useState();
  const [size, setSize] = useState('md')
  const { isOpen, onOpen, onClose } = useDisclosure()
  

  const [show, setShow] = useState(false);
  const toggleMenu = () => setShow(!show);

  //Functions --------
  let handlePromptChange = (e) => {
    let promptValue = e.target.value
    setPrompt(promptValue);
  }

  let submitPrompt = async () => {
    setGeneratingImg(true);
    setGenerated(false);
    await generateImage();

  }

let checkStatus = async (clear, id) =>{

  const response = await fetch("/api/generation/" + id);
  let responseData = await response.json();

    console.log(responseData.status)
    if(responseData.status =='succeeded'){
          clearInterval(clear);
          setImageUrl(responseData.output[0])
          setGeneratingImg(false);
          setGenerated(true);
          setPrompt('')
        console.log(responseData.output[0]);
    //     // genIpfsHash(st.data.output[0])
    }
}
let generateImage = async() => {

  const body = {
    prompt: `${prompt}`,
    image_dimensions: '512x512'
  };
  let bod = JSON.stringify(body)

  const response = await fetch("/api/generation", {
    method: "POST",
    headers: {
      'Content-Type': "application/json",
    },
    body: bod,
  });
  const responseData = await response.json();
  console.log(responseData.status)
  let clear = setInterval(() => {
    checkStatus(clear, responseData.id)
  }, 2000);
}

const genIpfsHash = async() => {
  try{
    var data = JSON.stringify({
      "pinataContent": {
          "url": imageUrl
      }
      });
  
      var config = {
      method: 'post',
      url: 'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${pinata_jwt}`
      },
      data : data
      };
  
      const res = await axios(config);
      return res.data.IpfsHash;
  }
  catch(err){
    console.log(err)
  }
  
}
const mintNFT = async () => {

  //gen ipfs hash
  setMinting(true)
  setGenerated(false)
  setTaskStatus('Initialised')
  // setGeneratingImg(true)
  let ipfsHash = await genIpfsHash();
  console.log(ipfsHash)

  //Gasless transaction
      let iface = new ethers.utils.Interface(CONTRACT_ABI);
      let tokenURI = `https://ipfs.io/ipfs/${ipfsHash}`
      let recipient = walletAddress;
      let tx = iface.encodeFunctionData("mintNFT", [ recipient,  tokenURI])
      
      const temp = await gw.sponsorTransaction(
        CONTRACT_ADDRESS,
        tx
      );
      console.log(temp)
      setTaskId(temp.taskId);
}

const login = async() => {

  try{
     onOpen();
    setLoginLoading(true);
    const gaslessWalletConfig = { apiKey: process.env.NEXT_PUBLIC_GASLESSWALLET_KEY};
    const loginConfig = {
      domains: ["http://localhost:3000/"],
      chain : {
        id: 80001,
        rpcUrl: "https://wiser-alien-morning.matic-testnet.discover.quiknode.pro/c2f6cfc05517853e094ad7ea47188326625f20b5/"
      },
      openLogin: {
        redirectUrl: `http://localhost:3000/`,
      },
    };
    const gaslessOnboarding = new GaslessOnboarding(
      loginConfig,
      gaslessWalletConfig
    );
    
    await gaslessOnboarding.init();
    const web3AP = await gaslessOnboarding.login();
    setWeb3AuthProvider(web3AP);
    setLoginLoading(false);
    // console.log("Web3 Auth Provider", web3AP);
    setGOBMethod(gaslessOnboarding);

    const gaslessWallet = gaslessOnboarding.getGaslessWallet();
    setGW(gaslessWallet);
    // console.log("Wallet is", gaslessWallet)

    const address = gaslessWallet.getAddress();
    setWalletAddress(address);
    console.log("Address is", address)
    onClose();

    const result = await fetch(`https://api.covalenthq.com/v1/80001/address/${address}/balances_v2/?key=${process.env.NEXT_PUBLIC_COVALENT_APIKEY}`);
    const balance = await result.json();
    setTokens(balance.data.items);


  } catch (err){
    console.error(err);
  }
}

const fetchStatus = async(clear) => {
  try{
    fetch(`https://relay.gelato.digital/tasks/status/${taskId}`)
      .then(response => response.json())
      .then(task => {
        if(task.task != undefined){
          setTaskStatus(task.task.taskState)
          console.log(task.task.taskState);
          if(task.task.taskState == 'Cancelled' || task.task.taskState == 'ExecSuccess'){
            clearInterval(clear)
            setMinting(false)
            setGenerated(true)
          }
        }
      });
  }
  catch(err){
    setTaskStatus('Initialised')
  }
}

const renderAlert = () => {
  // console.log("TaskStatus is", taskStatus);
  // console.log("here in renderAlert")
  switch(taskStatus){
    case 'Initialised':
      return <Alert status='info'>
              <AlertIcon />
              <AlertTitle>Minting!</AlertTitle>
              <AlertDescription>Minting of your NFT has been Initialised</AlertDescription>
            </Alert>
    case 'CheckPending':
      return <Alert status='info'>
              <AlertIcon />
              <AlertTitle>Your request is being processed!</AlertTitle>
              <AlertDescription>Transaction check in progress</AlertDescription>
            </Alert>
    case 'ExecPending':
      return <Alert status='info'>
              <AlertIcon />
              <AlertTitle>Your request is being processed!</AlertTitle>
              <AlertDescription>Executing mint transaction</AlertDescription>
            </Alert>
    case 'WaitingForConfirmation':
      return <Alert status='info'>
              <AlertIcon />
              <AlertTitle>Your request is being processed!</AlertTitle>
              <AlertDescription>Waiting for block confirmation</AlertDescription>
            </Alert>
    case 'ExecSuccess':
      return <Alert status='success'>
                <AlertIcon />
                <AlertTitle>NFT minted!</AlertTitle>
                <AlertDescription>Your AI image geNFT has been minted to your wallet</AlertDescription>
              </Alert>
    case 'Cancelled':
      return <Alert status='error'>
              <AlertIcon />
              <AlertTitle>NFT minting failed!</AlertTitle>
              <AlertDescription>Your request was cancelled, please try again</AlertDescription>
            </Alert>
    case 'ExecReverted':
      return <Alert status='error'>
                <AlertIcon />
                <AlertTitle>NFT minting failed!</AlertTitle>
                <AlertDescription>Your request was reverted, please try again</AlertDescription>
              </Alert>
    // default: return <Alert severity='info'> WAITTTTT</Alert>

  }
}



const handleLogOut = async() =>{
  await gobMethod.logout();
  setWalletAddress();
}
//useEffects ----------

// useEffect(()=>{
//   login();
// }, [])

useEffect(() => {
  if(taskId){

    let clear = setInterval(() => {
     fetchStatus(clear);
    }, 1500);
 }
}, [taskId])

useEffect(() => {
  console.log('Task status was changed', taskStatus);
  if(taskStatus)renderAlert();
}, [taskStatus]);

const Header = () => {
  
  return (
    <Flex
      mb={8}
      p={6} 
      as="nav"
      align="center"
      justify="space-around"
      wrap="wrap"
      w="100%"
    >
      <Box w="200px" h='75px'>
        <Image w='inherit' h='inherit' src="white_artdrop.svg"></Image>
      </Box>

      <Box display={{ base: 'block', md: 'none' }} onClick={toggleMenu}>
        {show ? <CloseIcon /> : <HamburgerIcon />}
      </Box>

      <Box
        display={{ base: show ? 'block' : 'none', md: 'block' }}
        flexBasis={{ base: '100%', md: 'auto' }}
      >
        <Flex
          align="center"
          justify={['center', 'space-between', 'flex-start', 'flex-end']}
          direction={['column', 'row', 'row', 'row']}
          pt={[4, 4, 0, 0]} color='white' fontWeight={8}
        >
          {walletAddress &&  <Button bgColor="transparent" onClick={() => navigator.clipboard.writeText(`${walletAddress}`)}>{walletAddress} </Button> }
          {walletAddress &&  <Button bgColor="transparent" onClick={() => handleLogOut()} isLast> Log Out </Button> }
          {!walletAddress && <Button bgColor="transparent" onClick={() => login()}> SignIn </Button>}
         
        </Flex>
      </Box>
    </Flex>
  );
};

  return (
    <>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <Header />
      <Container marginTop='20px' maxW='550px' bg='#f5f5f5'   borderRadius='5px' > 
          <Flex direction='column' justifyContent='center'  minH='50vh'  >
          <Image
            boxSize='300px'
            margin= '10px auto'
            objectFit='cover'
            src={imageUrl}
            alt='Generate Image'
            border='1px solid #1876F0'
            borderRadius= '3px'
          />
          <Textarea placeholder='Enter prompt to generate AI image' width='90%'margin = '10px auto' value={prompt} onChange = {handlePromptChange} disabled = {generatingImg} />
          <Flex direction='row' padding="20px 0  20px 0"  justifyContent='space-around'>
            <Button width='40%' background= {grad1} variant='solid' color='white' _hover={{color:'white', opacity:'70%'}} 
            onClick={submitPrompt}
            isLoading={generatingImg}
            >
              Generate Image
            </Button>
            {/* <Spacer /> */}
            <Button width='40%' background= {grad2} variant='solid' color='white'
            _hover={{color:'white', opacity:'70%'}}
              disabled={!generated}
              onClick={mintNFT}
              isLoading={minting}
            >
              Mint NFT
            </Button>
         </Flex>
         {walletAddress? <div>Logged In!</div> : <div></div>}

         </Flex>
         {renderAlert()}
         
         
      </Container>
      <Button
          onClick={() => handleLogOut()}
          m={4}
        >Logout</Button>
      <Drawer placement='top' onClose={onClose} isOpen={isOpen} size='full'>
        <DrawerOverlay />
        <DrawerContent>
          {/* <DrawerHeader>{`${size} drawer contents`}</DrawerHeader> */}
          <DrawerBody  background={grad1}>
            <Center margin='auto' height='100vh' >
            <Spinner size='xl' height='200px' width='200px' color = 'white'/>
            
            </Center>
            
          </DrawerBody>
        </DrawerContent>
      </Drawer>
      </main>
    </>
  )
}


/**
 

  ToDos

  - Add placeholder image pre-mint
  - Error handling
  - Send more data to pinata than just image url, maybe iter version
  - Add loading backdrop for login
*/