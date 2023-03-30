import Head from 'next/head'
import React from 'react'
// import Image from 'next/image'
import { Inter } from 'next/font/google'
import styles from '@/styles/Home.module.css'
import {Card, CardHeader, CardBody, CardFooter, Button, Container, Flex, Text, Box, Textarea, Image, Alert, AlertDescription, AlertIcon, AlertTitle, DrawerOverlay, Drawer, DrawerBody, DrawerContent, useDisclosure, Spinner, Center, Grid, GridItem, Stack, Heading, Spacer, Tooltip, useMediaQuery, Menu, MenuButton, MenuList, MenuItem, IconButton} from '@chakra-ui/react'
import { HamburgerIcon } from '@chakra-ui/icons';
import { ethers, Contract, providers, utils } from "ethers";
import axios from 'axios'
import { GaslessOnboarding} from "@gelatonetwork/gasless-onboarding"
import { useState, useEffect, use } from 'react'
const inter = Inter({ subsets: ['latin'] })
import { CONTRACT_ABI, CONTRACT_ADDRESS} from '../constants/contracts'
import date from 'date-and-time';


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
  const [mynfts, setMynfts] = useState(null)
  const [myNftsLoading, setMynftsLoading] = useState(true)

  //States - Wallet
  const [loginLoding, setLoginLoading] = useState(false)
  const [walletAddress, setWalletAddress] = useState();
  const [gobMethod, setGOBMethod] = useState(null);
  const [web3AuthProvider, setWeb3AuthProvider] = useState(null)
  const [tokens, setTokens] = useState([]);
  const [gw, setGW] = useState();
  const [size, setSize] = useState('md')
  const { isOpen, onOpen, onClose } = useDisclosure()
  const obj = useDisclosure()
  // console.log("closure", obj.isOpen)
  let isOpenM = obj.isOpen, onOpenM = obj.onOpen, onCloseM = obj.onClose;

  const [show, setShow] = useState(false);
  const toggleMenu = () => setShow(!show);

  const [isLargerThan800] = useMediaQuery('(min-width: 800px)')
  const iter = 2;

  //Functions --------
  let handlePromptChange = (e) => {
    let promptValue = e.target.value
    setPrompt(promptValue);
  }

  let submitPrompt = async () => {
    console.log("gen is", generated)
    setGeneratingImg(true);
    await generateImage();
    // setGenerated(false);


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
  setImageUrl('')
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
    const now = new Date();
    let timestamp = date.format(now, 'YYYY/MM/DD HH:mm:ss'); 
    var data = JSON.stringify({
      "pinataContent": {
          "url": imageUrl,
          "owner": walletAddress,
          "iteration": iter,
          "timestamp": timestamp
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
      domains: [window.location.origin],
      chain : {
        id: 84531,
        rpcUrl: "https://goerli.base.org"
      },
      openLogin: {
        redirectUrl: [window.location.origin],
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
            const now = new Date();
            let timestamp = date.format(now, 'YYYY/MM/DD HH:mm:ss'); 
            if(task.task.taskState == 'ExecSuccess'){
              let obj = {tokenId: 0, url: imageUrl, iteration:iter, owner: walletAddress, timestamp: timestamp}
              setMynfts(oldNfts => [...oldNfts, obj])
            }
            setTimeout(()=>{
              setTaskStatus('')
            }, [3000])
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
      return <Alert margin='15px 0px' borderRadius='3px'  status='info'>
              <AlertIcon />
              <AlertTitle>Minting!</AlertTitle>
              <AlertDescription>Minting of your NFT has been Initialised</AlertDescription>
            </Alert>
    case 'CheckPending':
      return <Alert margin='15px 0px' borderRadius='3px' status='info'>
              <AlertIcon />
              <AlertTitle>Your request is being processed!</AlertTitle>
              <AlertDescription>Transaction check in progress</AlertDescription>
            </Alert>
    case 'ExecPending':
      return <Alert  margin='15px 0px' borderRadius='3px' status='info'>
              <AlertIcon />
              <AlertTitle>Your request is being processed!</AlertTitle>
              <AlertDescription>Executing mint transaction</AlertDescription>
            </Alert>
    case 'WaitingForConfirmation':
      return <Alert margin='15px 0px' borderRadius='3px' status='info'>
              <AlertIcon />
              <AlertTitle>Your request is being processed!</AlertTitle>
              <AlertDescription>Waiting for block confirmation</AlertDescription>
            </Alert>
    case 'ExecSuccess':
      return <Alert margin='15px 0px'  borderRadius='3px' status='success'>
                <AlertIcon />
                <AlertTitle>NFT minted!</AlertTitle>
                <AlertDescription>Your AI image has been ArtDropped to your wallet</AlertDescription>
              </Alert>
    case 'Cancelled':
      return <Alert margin='15px 0px' borderRadius='3px' status='error'>
              <AlertIcon />
              <AlertTitle>NFT minting failed!</AlertTitle>
              <AlertDescription>Your request was cancelled, please try again</AlertDescription>
            </Alert>
    case 'ExecReverted':
      return <Alert margin='15px 0px' borderRadius='3px' status='error'>
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

const showMyNfts = async () => {
  onOpenM();
}

const renderNftCards = () => {

  // const  = [{test:'test'}, {test:'test'}, {test:'test'}, {test:'test'}]
  if(mynfts!=null)return mynfts.map((nft, index) => 
          
      <div key={index}>
          <GridItem w='80%'>
        <Card maxW='sm'>
          <CardBody>
            <Image
              src={nft.url}
              alt='Your NFT'
              borderRadius='md'
            />
            <Stack mt='6' spacing='3'>
              <Text size='md' color='blue.600'><b color='black'>Created at: </b>{nft.timestamp}</Text>
              <Text size='md'><b color='black'>Created by: </b>{nft.owner}</Text>
            </Stack>
          </CardBody>
        </Card>
        </GridItem>
      </div>
  )
}


const fetchNfts = async () => {
      try{
      if(web3AuthProvider != undefined){
        const nfts = [];
        const provider = new ethers.providers.Web3Provider(web3AuthProvider);
        console.log(provider);
        const signer = await provider.getSigner();
        console.log(CONTRACT_ABI);
        console.log(CONTRACT_ADDRESS)
        console.log(signer)
        const nftContract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        let bal = await nftContract.balanceOf(walletAddress);
        console.log('Balance is', bal.toNumber());

        for(var i=0; i<bal;++i){
          const tokenId = await nftContract.tokenOfOwnerByIndex(walletAddress, i);
          const tokenURI = await nftContract.tokenURI(tokenId);
          console.log(tokenURI);
          // const metadata = await fetch(`https://ipfs.io/ipfs/${tokenURI.substr(7)}`).then(response => response.json());
          let res = await fetch(tokenURI);
          res = await res.json()
          if(res.iteration==iter)nfts.push({tokenId, url: res.url, iteration:res.iteration, timestamp: res.timestamp, owner: res.owner});
        }
        console.log("My NFTs are", nfts);
        if(nfts.length)nfts.reverse();
        setMynfts(nfts);
        setMynftsLoading(false)

      }
    }catch(err){
      console.log(err);
    }

}
//useEffects ----------

useEffect(()=>{
  login();
}, [])

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

useEffect(()=>{
  if(walletAddress){
    setMynfts([])
    fetchNfts();
  }
}, [walletAddress])
const Header = () => {
  if(isLargerThan800)return (
 
    <Flex
      mb={8}
      p={6} 
      as="nav"
      align="center"
      justify="space-around"
      wrap="wrap"
      w="100%"
      h="76px"
    >
      <Box w='50'>
        <Flex justifyItems='center' alignItems='center'>
          <Image src="logo.svg" width='50px' height='50px' /> 
          <Text color="white" fontWeight="bold"> ArtDrop</Text>
        </Flex>
      </Box>
      
      <Box display={{ base: 'block', md: 'none' }} onClick={toggleMenu}>
        {show ? <Image boxSize='30px' src="close.svg" /> : <Image src="hamburger.svg" />}
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
          {walletAddress &&  <Tooltip label='Click to copy address'><Button margin='2px' variant="link" colorScheme='white' bgColor="transparent" onClick={() => navigator.clipboard.writeText(`${walletAddress}`)}>{walletAddress} </Button></Tooltip> }
          &nbsp; &nbsp;
          {walletAddress &&  <Button variant="link" colorScheme='white' bgColor="transparent" onClick={() => showMyNfts()} isLast> View NFTs </Button> }         
        </Flex>
      </Box>
    </Flex>
  );
  else{
    return (

    <Flex
    mb={8}
    p={6} 
    as="nav"
    align="center"
    justify="space-around"
    wrap="wrap"
    w="100%"
    h="75px"
  >
    <Box w='50'>
      <Flex justifyItems='center' alignItems='center'>
        <Image src="logo.svg" width='50px' height='50px' /> 
        <Text color="white" fontWeight="bold"> ArtDrop</Text>
      </Flex>
    </Box>
    <Menu>
        <MenuButton
          as={IconButton}
          aria-label='Options'
          icon={<HamburgerIcon />}
          variant='outline'
          color='white'
        />
        <MenuList>
          <MenuItem onClick={() => showMyNfts()} height = '50px'>
            {walletAddress &&  <Button variant="link" color='#212732' fontSize='15px'  bgColor="transparent"> View NFTs </Button> }         
          </MenuItem>
          <MenuItem onClick={() => navigator.clipboard.writeText(`${walletAddress}`)} height='50px'>
          {walletAddress &&  <Button  variant="link" color='#212732' fontSize='15px' >Copy Wallet Address</Button> }
          </MenuItem>
        </MenuList>
      </Menu>
  </Flex>


  
    )
  }
  
};

  return (
    <>
      <Head>
        <title>ArtDrop</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/logo.svg" />
      </Head>
      <main className={styles.main}>
        <Header />
        <Spacer />
      <Container marginTop='20px' maxW='550px' bg='#f5f5f5'   borderRadius='5px' > 
          <Flex direction='column' justifyContent='center'  minH='50vh'  >
          {imageUrl?<Image
            boxSize='300px'
            margin= '10px auto'
            objectFit='cover'
            src={imageUrl}
            alt='Generate Image'
            border='1px solid #1876F0'
            borderRadius= '3px'
          />:
          <Center
                boxSize='300px'
                margin= '10px auto'
                border='1px solid #1876F0'
                borderRadius= '3px'
           >
            {generatingImg?<Spinner color = 'black' size='xl'></Spinner>: 
                <Text fontWeight='500' margin='10px'> Enter any prompt to generate a customised AI image </Text> 
           }
            </Center>}

          <Textarea placeholder='Enter prompt to generate AI image' width='90%'margin = '10px auto' value={prompt} onChange = {handlePromptChange} disabled = {generatingImg || minting} />
          <Flex direction='row' padding="20px 0  20px 0"  justifyContent='space-around'>
            <Button width='40%' background= {grad1} variant='solid' color='white' _hover={{color:'white', opacity:'70%'}} 
            onClick={submitPrompt}
            isLoading={generatingImg}
            isDisabled={minting}
            >
              Generate Image
            </Button>
            {/* <Spacer /> */}
            <Button width='40%' background= {grad2} variant='solid' color='white'
            _hover={{color:'white', opacity:'70%'}}
              isDisabled = {!generated}
              onClick={mintNFT}
              isLoading={minting}
            >
              Mint NFT
            </Button>
         </Flex>
         {renderAlert()}

         </Flex>
          
         
         
      </Container>
      {/* <Button
          onClick={() => handleLogOut()}
          m={4}
        >Logout</Button>
        <Button
          onClick={() => showMyNfts()}
          m={4}
        >My NFTs</Button> */}
          <Drawer placement='top' onClose={onCloseM} isOpen = {isOpenM} size='full'>
                  <DrawerOverlay />
                  <DrawerContent>
                    {/* <DrawerHeader>{`${size} drawer contents`}</DrawerHeader> */}
                    <DrawerBody  background={grad1}>
                      <Button
                          onClick={() => onCloseM()}
                          m={4}
                        >Back to Minting!
                        </Button>
                      {/* <Center margin='auto' height='100vh' > */}
                      <Container>
                        {myNftsLoading?<Center margin='auto' height='100vh' >
                          <Stack alignContent='center' spacing='3'><Spinner size='xl' height='200px' width='200px' color = 'white' marginBottom='20px'/>
                        <Text display='block' color='white' textAlign='center'>Loading your NFTs...</Text></Stack>
                        
                        </Center>:<Grid gap = {3} templateColumns= {isLargerThan800? 'repeat(2, 1fr)' : 'repeat(1, 1fr)'}>
                                  {renderNftCards()}
                            </Grid>}
                            
                      </Container>
                      
                    </DrawerBody>
                  </DrawerContent>
                </Drawer>
      <Drawer placement='top' onClose={onClose} isOpen={isOpen} size='full'>
        <DrawerOverlay />
        <DrawerContent>
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

  - Add logout option and send to landing page 
  - Error handling
  - Add fallback URLs for nft images saying: taking time to fetch from ipfs
  - Flow chart
  - What to show in case of no NFTs minted yet
*/