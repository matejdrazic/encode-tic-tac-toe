# Build and Run

1. **Prerequisites**
   - Install Rust and Cargo: https://rustup.rs/
   - Install Solana CLI tools: https://docs.solana.com/cli/install-solana-cli-tools
   - Install Anchor: `cargo install --git https://github.com/coral-xyz/anchor avm --locked`
   - Install Node.js and npm: https://nodejs.org/
   - Configure Solana CLI for localhost or devnet:
     ```bash
     solana config set --url localhost  # for local development
     # OR
     solana config set --url devnet     # for devnet
     ```

2. **Build and Deploy the Anchor Program**
   ```bash
   # Build the program
   anchor build

   # Deploy the program
   anchor deploy
   ```

3. **Run the Frontend**
   ```bash
   # Navigate to the frontend directory (adjust path as needed)
   cd frontend/

   # Generate the IDL (Interface Description Language) file for your Anchor program
   node scripts/generate-idl.js

   # Install dependency
   npm install

   # Start the development server
   npm run dev
   ```

4. **Access the Application**
   - Open your browser and navigate to `http://localhost:3000` (or the port shown in your terminal)

# Common Issues

## Program Deployment Error: Account Data Too Small

When deploying your Solana program, you may encounter this error:

`Error: Deploying program failed: RPC response error -32002: Transaction simulation failed: Error processing Instruction 0: account data too small for instruction [3 log messages]
There was a problem deploying: Output { status: ExitStatus(unix_wait_status(256)), stdout: "", stderr: "" }.`

Remove `target/deploy/encode_tic_tac_toe.so` then use `solana program deploy --upgrade-authority /Users/<user_name>/.config/solana/id.json target/deploy/encode_tic_tac_toe.so` to re-deploy

