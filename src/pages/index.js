import Head from 'next/head'
import React from 'react'
// import Image from 'next/image'
import { Inter } from 'next/font/google'
import styles from '@/styles/Home.module.css'
import {Card, CardHeader, CardBody, CardFooter, Button, Container, Flex, Text, Box, Textarea, Image, Alert, AlertDescription, AlertIcon, AlertTitle, DrawerOverlay, Drawer, DrawerBody, DrawerContent, useDisclosure, Spinner, Center, Grid, GridItem, Stack, Heading, Spacer, Tooltip, useMediaQuery, Menu, MenuButton, MenuList, MenuItem, IconButton} from '@chakra-ui/react'
import { HamburgerIcon } from '@chakra-ui/icons';
import { ethers, Contract, providers, utils } from "ethers";
import axios from 'axios'
import { useState, useEffect, use } from 'react'
const inter = Inter({ subsets: ['latin'] })
import { CONTRACT_ABI, CONTRACT_ADDRESS} from '../constants/contracts'
import date from 'date-and-time';
import { PARTICLE_PROJECT_ID, PARTICLE_CLIENT_KEY, PARTICLE_APP_ID, BICONOMY_API_KEY } from '@/constants/particleConstants'
import {ParticleProvider} from "@particle-network/provider"
import { ParticleNetwork, WalletEntryPosition } from "@particle-network/auth";
import {SmartAccount} from '@particle-network/biconomy'


export default function Home() {

  //variables
  const particle = new ParticleNetwork({
    projectId: PARTICLE_PROJECT_ID,
    clientKey: PARTICLE_CLIENT_KEY,
    appId: PARTICLE_APP_ID,
    chainName: "Polygon",
    chainId: 80001, 
    wallet: {   
      displayWalletEntry: true, 
      defaultWalletEntryPosition: WalletEntryPosition.BR, 
      uiMode: "light",  
      supportChains: [{id:80001, name:"Polygon"}], 
      customStyle: {}, 
    },
    securityAccount: { 
      promptSettingWhenSign: 1,
      promptMasterPasswordSettingWhenLogin: 1
    },
  });


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
  const [mynfts, setMynfts] = useState([])
  const [myNftsLoading, setMynftsLoading] = useState(true)

  //States - Wallet
  const [loginLoading, setLoginLoading] = useState(false)
  const [walletAddress, setWalletAddress] = useState();
  const [gobMethod, setGOBMethod] = useState(null);
  const [web3AuthProvider, setWeb3AuthProvider] = useState(null)
  const [tokens, setTokens] = useState([]);
  const [size, setSize] = useState('md')
  const { isOpen, onOpen, onClose } = useDisclosure()
  const obj = useDisclosure()
  const [smartAccount, setSmartAccount] = useState();
  // console.log("closure", obj.isOpen)
  let isOpenM = obj.isOpen, onOpenM = obj.onOpen, onCloseM = obj.onClose;

  const [show, setShow] = useState(false);
  const toggleMenu = () => setShow(!show);

  const [isLargerThan800] = useMediaQuery('(min-width: 800px)')
  const iter = 4;

  //Functions --------
  let handlePromptChange = (e) => {
    let promptValue = e.target.value
    setPrompt(promptValue);
  }

  let submitPrompt = async () => {
    try{
    console.log("gen is", generated)
    setGeneratingImg(true);
    await generateImage();
    setGenerated(false);
    } catch (err){
      console.error(err);
    }

  }

let checkStatus = async (clear, id) =>{
  try{
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
  } catch (err){
    console.error(err);
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
    console.log("error in creating hash")
    console.log(err);
  }
  
}
const mintNFT = async () => {
  try{
  setMinting(true)
  setGenerated(false)
  let ipfsHash = await genIpfsHash();
  console.log(ipfsHash);

  let tokenURI = `https://ipfs.io/ipfs/${ipfsHash}`
  const signer = web3AuthProvider.getSigner();
  let iface = new utils.Interface(CONTRACT_ABI);

  let x = iface.encodeFunctionData("mintNFT", [walletAddress, tokenURI]);
  const tx = {
    to: CONTRACT_ADDRESS,
    data:x
  }

  console.log(tx);
  console.log(smartAccount);

  setTaskStatus('Initialised');
  // smartAccount.on('txHashGenerated', (response) => {
  //   console.log('txHashGenerated event received via emitter', response);
  // });
  // smartAccount.on('onHashChanged', (response) => {
  //   console.log('onHashChanged event received via emitter', response);
  // });
  // // Event listener that gets triggered once a transaction is mined
  // smartAccount.on('txMined', (response) => {
  //   console.log('txMined event received via emitter', response);
  // });
  // // Event listener that gets triggered on any error
  // smartAccount.on('error', (response) => {
  //   console.log('error event received via emitter', response);
  // });

  const txHash = await smartAccount.sendGaslessTransaction(tx);
  console.log(txHash);
  setTaskStatus('ExecSuccess');
  setMinting(false);  

  // let contract = new Contract (
  //   CONTRACT_ADDRESS,
  //   CONTRACT_ABI, 
  //   signer
  // )
  // console.log(contract);
  // const tx = await contract.mintNFT(walletAddress, tokenURI);
  // const balance = await contract.balanceOf(walletAddress);
  // console.log("Balance in mintNFT" , balance);
  // const owner = await contract.owner();
  // console.log("owner is", owner)
  // setTaskStatus('Initialised')
  // console.log("Task status initialised", taskStatus)
  // await tx.wait();
  // setTaskStatus('ExecSuccess');
  // console.log("Task succeeded", taskStatus)
  // setMinting(false);  
  // console.log("hash of mint", tx);
  } catch (err){
    console.error(err);
  }
}

const initialiseSmartAccount= async () =>{
  console.log("In smartAccount" , web3AuthProvider.provider);
  const smartAccount = new SmartAccount(web3AuthProvider.provider, {
    projectId: PARTICLE_PROJECT_ID,
    clientKey: PARTICLE_CLIENT_KEY,
    appId: PARTICLE_APP_ID,
    networkConfig: [
        { dappAPIKey: BICONOMY_API_KEY, chainId: 80001 },
    ],
});
  console.log(smartAccount);
  const account = await smartAccount.getAddress();
  console.log("Smart Account Address" , account);
  setSmartAccount(smartAccount);
}

const initialiseParticleProvider = async () => {
  const particleProvider = new ParticleProvider(particle.auth);
  const provider = new ethers.providers.Web3Provider(particleProvider, "any");
  setWeb3AuthProvider(provider);
}

useEffect(() => {
  if(web3AuthProvider){
    console.log("Web2uath provid", web3AuthProvider);
    login();
  }
}, web3AuthProvider)
const login = async() => {

  try{
     onOpen();
    setLoginLoading(true);
    console.log("Actually signign")
    const userInfo = await particle.auth.login();
    setLoginLoading(false);
    const accounts = await web3AuthProvider.listAccounts();
    setWalletAddress(accounts[0]);
    initialiseSmartAccount();
    onClose();
  } catch (err){
    console.error(err);
  }
}

const renderAlert = () => {
  switch(taskStatus){
    case 'Initialised':
      return <Alert margin='15px 0px' borderRadius='3px'  status='info'>
              <AlertIcon />
              <AlertTitle>Minting!</AlertTitle>
              <AlertDescription> Minting of your NFT has been Initialised </AlertDescription>
            </Alert>
    case 'ExecSuccess':
      return <Alert margin='15px 0px'  borderRadius='3px' status='success'>
                <AlertIcon />
                <AlertTitle>NFT minted!</AlertTitle>
                <AlertDescription>Your AI image has been minted directly to your wallet. </AlertDescription>
              </Alert>
    case 'Cancelled':
      return <Alert margin='15px 0px' borderRadius='3px' status='error'>
              <AlertIcon />
              <AlertTitle>NFT minting failed!</AlertTitle>
              <AlertDescription>Your request was cancelled, please try again</AlertDescription>
            </Alert>
  }
}



const handleLogOut = async() =>{
  try{
    await particle.auth.logout();
    setWalletAddress('');
    login();
  } catch (err){
    console.error(err);
  }
}

const showMyNfts = async () => {
  onOpenM();
}

const renderNftCards = () => {
  if(mynfts.length)return mynfts.map((nft, index) => 
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
  else{
    return <GridItem><Alert margin='15px 0px' borderRadius='3px' status='info'>
    <AlertIcon />
    <AlertTitle>You don't have any NFTs yet</AlertTitle>
    <AlertDescription>Please go back to the minting screen to create your first NFT!</AlertDescription>
  </Alert></GridItem>
  }
}


const fetchNfts = async () => {
    console.log("fetching nfts");
      try{
      if(web3AuthProvider != undefined){
        console.log("provider is defined")
        // const nfts = []; //all of the nfts that you own
        // const signer = web3AuthProvider.getSigner();
        // const nftContract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        // let owner = await nftContract.owner();
        // console.log("owner", owner);
        // let bal = await nftContract.balanceOf(walletAddress);
        // console.log('Balance is', bal.toNumber());
        // for(var i=0; i<bal;++i){
        //   const tokenId = await nftContract.tokenOfOwnerByIndex(walletAddress, i);
        //   const tokenURI = await nftContract.tokenURI(tokenId);
        //   console.log(tokenURI);
        //   let res = await fetch(tokenURI); 
        //   res = await res.json()
        //   if(res.iteration==iter)nfts.push({tokenId, url: res.url, iteration:res.iteration, timestamp: res.timestamp, owner: res.owner});
        // }
        // console.log("My NFTs are", nfts);
        // if(nfts.length)nfts.reverse();
        // setMynfts(nfts);
        // setMynftsLoading(false)

      }
    } catch(err) {
      console.log("error fetching NFTs ")
      console.log(err);
    }
}
//useEffects ----------

useEffect(()=>{
  initialiseParticleProvider();
}, [])


useEffect(() => {
  console.log('Task status was changed', taskStatus);
  if(taskStatus)renderAlert();
}, [taskStatus]);

useEffect(()=>{
  if(walletAddress){
    console.log("Wallet address changed")
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
          <Image src="celitra.svg" width='50px' height='50px' /> 
          <Text color="white" fontWeight="bold"> &nbsp; Celitra </Text>
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
          gap={10}
        >
          {walletAddress &&  <Tooltip label='Click to copy address'><Button margin='2px' variant="link" colorScheme='white' bgColor="transparent" onClick={() => navigator.clipboard.writeText(`${walletAddress}`)}>{walletAddress} </Button></Tooltip> }
      
          {walletAddress &&  <Button  variant="link" colorScheme='white' bgColor="transparent" onClick={() => showMyNfts()}  margin='2px'> View NFTs </Button> }         
          {walletAddress &&  <Button  variant="link" colorScheme='white' bgColor="transparent" onClick={() => handleLogOut()}  margin='2px'> Logout </Button> }  
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
        <Image src="celitra.svg" width='50px' height='50px' /> 
        <Text color="white" fontWeight="bold"> Celitra </Text>
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
            {walletAddress &&  <Button  variant="link" color='#212732' fontSize='15px'  bgColor="transparent"> View NFTs </Button> }         
          </MenuItem>
          <MenuItem onClick={() => navigator.clipboard.writeText(`${walletAddress}`)} height='50px'>
          {walletAddress &&  <Button  variant="link" color='#212732' fontSize='15px' >Copy Wallet Address</Button> }
          </MenuItem>
          <MenuItem onClick={() => handleLogOut()} height = '50px'>
            {walletAddress &&  <Button  variant="link" color='#212732' fontSize='15px'  bgColor="transparent"> Logout </Button> }         
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
        <title> Celitra </title>
        <meta name="description" content=" Enter Web3 with a single click" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/celitra.svg" />
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
                        
                        </Center>:<Grid gap = {3} templateColumns= {mynfts.length?(isLargerThan800? 'repeat(2, 1fr)' : 'repeat(1, 1fr)'):'repeat(1, 1fr)'}>
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
  - Fix format of buidl, add demo link and video link
  - Add logout option and send to landing page 
  - Error handling
  - Add fallback URLs for nft images saying: taking time to fetch from ipfs
  - Flow chart
*/