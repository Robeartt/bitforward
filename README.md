<h1><span style="color: #22c55e;">Bit</span>Forward</h1>

<p>BitForward is a decentralized trading platform built on the Stacks blockchain that enables users to create and manage forward contracts using STX (With the aim to use sBTC in the future) tokens. The platform features a modern UI for position management, real-time price updates, and automated position settlement.</p>

<h2>Features</h2>

<ul>
  <li>Create and manage forward positions with sBTC tokens</li>
  <li>Real-time position monitoring and automated settlement</li>
  <li>Support for both long and short leveraged positions</li>
  <li>Position tracking across multiple blocks</li>
  <li>Persistent storage for position data</li>
  <li>Modern, responsive UI built with React and Tailwind CSS</li>
  <li>Integration with Stacks Leather wallet for secure transactions</li>
</ul>

<h2>Prerequisites</h2>

<ul>
  <li>Node.js (v20 or higher)</li>
  <li>npm or yarn</li>
  <li>A Stacks wallet (Leather Wallet recommended)</li>
  <li>Access to Stacks testnet/devnet</li>
</ul>

<h2>Installation</h2>

<ol>
  <li>Clone the repository:</li>
</ol>

<pre><code>git clone https://github.com/yourusername/bitforward.git
cd bitforward</code></pre>

<ol start="2">
  <li>Install dependencies:</li>
</ol>

<pre><code>npm install</code></pre>

<ol start="3">
  <li>Create a <code>.env</code> file in the root directory with the following variables:</li>
</ol>

<pre><code>NETWORK=devnet
CONTRACT_ADDRESS=your_contract_address
CONTRACT_OWNER_KEY=your_contract_owner_key
PORT=3000</code></pre>

<ol start="4">
  <li>Start the development server:</li>
</ol>

<pre><code>npm run dev</code></pre>

<h2>Key Components</h2>

<h2>API Endpoints</h2>

<h3>Positions</h3>

<ul>
  <li><code>POST /api/position/add</code> - add a position</li>
  <li><code>GET /api/positions</code> - Get all active positions</li>
  <li><code>GET /api/positions/delete</code> - delete a position</li>
</ul>

<h3>Price Management</h3>

<p> There are helper script in the <code>bitforward-scripts</code> directory to update the price

<h2>Configuration</h2>

<p>The application can be configured to run on either the Stacks testnet or devnet. Update the <code>NETWORK</code> environment variable accordingly:</p>

<ul>
  <li><code>NETWORK=devnet</code> for local development</li>
  <li><code>NETWORK=testnet</code> for testnet deployment</li>
</ul>

<h2>Development</h2>

<ol>
  <li>Start the backend server:</li>
</ol>

<pre><code>npm run dev</code></pre>

<ol start="2">
  <li>Start the frontend development server:</li>
</ol>

<pre><code>npm run dev</code></pre>

<ol start="3">
  <li>Access the application at <code>http://localhost:3000</code></li>
</ol>

<h2>Building for Production</h2>

<pre><code>npm run build</code></pre>

<p>The built files will be available in the <code>dist</code> directory.</p>

<h2>Testing</h2>

<pre><code>npm run test</code></pre>

<h2>License</h2>

<p>This project is licensed under the MIT License - see the LICENSE file for details.</p>

<h2>Acknowledgments</h2>

<ul>
  <li>Stacks blockchain team</li>
  <li>Hiro Wallet team</li>
  <li>shadcn/ui for UI components</li>
</ul>
