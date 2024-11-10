#BitForward
BitForward is a decentralized trading platform built on the Stacks blockchain that enables users to create and manage forward contracts using STX tokens. The platform features a modern UI for position management, real-time price updates, and automated position settlement.


##Features
- Create and manage forward positions with STX tokens
- Real-time position monitoring and automated settlement
- Support for both long and hedge positions
- Position tracking across multiple blocks
- Persistent storage for position data
- Modern, responsive UI built with React and Tailwind CSS
- Integration with Stacks wallet for secure transactions

##Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A Stacks wallet (Hiro Wallet recommended)
- Access to Stacks testnet/devnet

##Installation

###Clone the repository:

```
{
Copygit clone https://github.com/yourusername/bitforward.git
cd bitforward
}
```

###Install dependencies:

```
{
npm install
}
```

###Create a .env file in the root directory with the following variables:

```
{
envCopyNETWORK=devnet
CONTRACT_ADDRESS=your_contract_address
CONTRACT_OWNER_KEY=your_contract_owner_key
PORT=3000
}
```

###Start the development server:

```
{
npm run dev
}
```

##Key Components

###Backend Services
- contract.js: Handles interactions with the Stacks smart contract
- monitor.js: Monitors positions and handles automated settlements
- storage.js: Manages persistent storage of position data
- routes.js: Express routes for the API endpoints

###Frontend Components
- Overview.jsx: Main dashboard showing position summary
- MarketOverview.jsx
- Positions.jsx: Detailed view of all positions
- PositionsDashboard.jsx
- PositionManagement.jsx
- StacksTrading.jsx
- PriceSetter.jsx: Admin interface for updating prices
- WalletConnect.jsx: Wallet connection management
  

##API Endpoints
###Positions

- 'POST /api/position/new' - Create a new position
- 'GET /api/positions' - Get all active positions
- 'GET /api/positions/history' - Get position history

###Price Management

- 'POST /api/price' - Update the current price (admin only)

##Configuration
The application can be configured to run on either the Stacks testnet or devnet. Update the 'NETWORK' environment variable accordingly:

- 'NETWORK=devnet' for local development
- 'NETWORK=testnet' for testnet deployment

#Development

###1. Start the backend server:

```
{
npm run server
}
```

###2. Start the frontend development server:

```
{
npm run dev
}
```

###3. Access the application at 'http://localhost:3000'

#Building for Production
```
{
npm run build
}
```
The built files will be available in the 'dist' directory.

#Testing
```
{
npm test
}
```

#Security Considerations
- Ensure proper private key management
- Use environment variables for sensitive data
- Implement proper access controls for admin functions
- Validate all input data
- Monitor for suspicious activities

#Contributing
1. Fork the repository
2. Create your feature branch ('git checkout -b feature/AmazingFeature')
3. Commit your changes ('git commit -m 'Add some AmazingFeature')
4. Push to the branch ('git push origin feature/AmazingFeature')
5. Open a Pull Request

#License
This project is licensed under the MIT License - see the LICENSE file for details.

#Acknowledgments
- Stacks blockchain team
- Hiro Wallet team
- shadcn/ui for UI components
