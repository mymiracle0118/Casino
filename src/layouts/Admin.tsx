/* eslint-disable */
import React from 'react'
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom'
// @material-ui/core components
import withStyles from '@material-ui/core/styles/withStyles'
import Box from '@material-ui/core/Box'

// core components
import Home from '../views/Home/Home'

import dashboardStyle from '../assets/jss/material-dashboard-react/layouts/dashboardStyle'

import image from '../assets/img/sidebar-2.jpg'
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


const wallets = [
  getPhantomWallet(),
  getSlopeWallet(),
  getSolflareWallet(),
  getLedgerWallet(),
  getSolletWallet(),
  getSolletExtensionWallet()
];
const switchRoutes = (
  <Switch>
    <Route exact path="/">
      <Home />
    </Route>
  </Switch>
)
interface Props {
  classes: any
  location: any
}

interface State {
  image: string
  color: string
  hasImage: boolean
  fixedClasses: string
  mobileOpen: boolean
}

class Dashboard extends React.Component<Props, State> {
  refs: any
  constructor(props: Props) {
    super(props)
    this.state = {
      image: image,
      color: 'blue',
      hasImage: true,
      fixedClasses: 'dropdown show',
      mobileOpen: false,
    }
  }

  handleDrawerToggle = () => {
    this.setState({ mobileOpen: !this.state.mobileOpen })
  }

  resizeFunction = () => {
    if (window.innerWidth >= 960) {
      this.setState({ mobileOpen: false })
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.resizeFunction)
  }

  render() {
    const { classes, ...rest } = this.props
    return (
      <>
          <Box>{switchRoutes}</Box>
      </>
    )
  }
}

const HomeWithProvider = () => (
  <ConnectionProvider endpoint="https://solana-api.projectserum.com">
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        <Home />
      </WalletModalProvider>
    </WalletProvider>
  </ConnectionProvider>
);

export default withStyles(dashboardStyle)(HomeWithProvider)
