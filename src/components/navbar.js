import { useState } from 'react';
import { Flex, Box, Text, Image} from '@chakra-ui/react';
import { CloseIcon, HamburgerIcon } from '@chakra-ui/icons';
import Link from 'next/Link';

const MenuItem = ({ children, isLast, to = '/' }) => {
  return (
    <Text
      mb={{ base: isLast ? 0 : 8, sm: 0 }}
      mr={{ base: 0, sm: isLast ? 0 : 8 }}
      display="block" _hover={{ bg: "white", color: "blue" }} padding="2%" fontWeight='bold'
    >
      <Link href={to}>{children}</Link>
    </Text>
  );
};

const Header = (props) => {
  const [show, setShow] = useState(false);
  const toggleMenu = () => setShow(!show);
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
          {props.walletAddress &&  <MenuItem >{props.walletAddress} </MenuItem> }
          {props.walletAddress &&  <MenuItem onClick={props.logout} isLast> Log Out </MenuItem> }
          {!props.walletAddress && <MenuItem isLast onClick={props.login}> SignIn </MenuItem>}
         
        </Flex>
      </Box>
    </Flex>
  );
};

export default Header;