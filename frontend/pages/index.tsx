import { useState, useEffect } from 'react';
import { Connection, PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider } from '@project-serum/anchor';
import idl from '../idl/encode_tic_tac_toe.json';

const PROGRAM_ID = new PublicKey('C5zQNGqYy3m7aTB9xrKFLwxY77wC2JKKGccXn5E1qmX5');

export default function Home() {
  const [keypair, setKeypair] = useState<Keypair | null>(null);
  const [game, setGame] = useState<any>(null);
  const [board, setBoard] = useState<number[][]>([[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
  const [status, setStatus] = useState<string>('Generating key pair...');
  const [gameAddress, setGameAddress] = useState<string>('');
  const [joinGameInput, setJoinGameInput] = useState<string>('');
  const [gameStatus, setGameStatus] = useState<string>('');
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);

  useEffect(() => {
    // Only run on client-side
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('game-keypair');
      let kp: Keypair;
      
      if (stored) {
        const secretKey = new Uint8Array(JSON.parse(stored));
        kp = Keypair.fromSecretKey(secretKey);
      } else {
        kp = Keypair.generate();
        localStorage.setItem('game-keypair', JSON.stringify(Array.from(kp.secretKey)));
      }
      
      setKeypair(kp);
      setStatus('Key pair loaded! Create a game to start.');
    }
  }, []);

  useEffect(() => {
    if (keypair) {
      const connection = new Connection('http://localhost:8899');
      
      // Request airdrop for the keypair
      const requestAirdrop = async () => {
        try {
          const signature = await connection.requestAirdrop(
            keypair.publicKey,
            1000000000 // 1 SOL
          );

          const latestBlockHash = await connection.getLatestBlockhash();
          await connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: signature,
          });
          console.log('Airdrop successful');
        } catch (error) {
          console.error('Error requesting airdrop:', error);
        }
      };
      
      requestAirdrop();
      
      console.log('Provider setup with keypair:', keypair.publicKey.toString());
      const provider = new AnchorProvider(
        connection,
        { 
          publicKey: keypair.publicKey, 
          signTransaction: async (tx) => {
            console.log('Signing tx with:', keypair.publicKey.toString());
            tx.sign(keypair);
            return tx;
          }, 
          signAllTransactions: async (txs) => {
            txs.forEach(tx => tx.sign(keypair));
            return txs;
          }
        },
        { commitment: 'confirmed' }
      );
      const program = new Program(idl as any, PROGRAM_ID, provider);
      setGame(program);
    }
  }, [keypair]);

  const fetchGameStatus = async (gamePublicKey: string) => {
    if (!game) return;
    try {
      console.log('Fetching game status for:', gamePublicKey);
      const accountInfo = await game.provider.connection.getAccountInfo(new PublicKey(gamePublicKey));
      if (!accountInfo) {
        console.log('Account not found');
        return;
      }

      // Calculate correct offset for status byte:
      // 8 (anchor discriminator) + 32 (player_one) + 32 (player_two) + 9 (board) = 81
      const statusOffset = 8 + 32 + 32 + 9;
      const rawStatus = accountInfo.data[statusOffset];
      console.log('Raw status byte at offset', statusOffset, ':', rawStatus);

      const gameAccount = await game.account.game.fetch(new PublicKey(gamePublicKey));
      console.log('Game account data:', {
        playerOne: gameAccount.playerOne.toString(),
        playerTwo: gameAccount.playerTwo.toString(),
        board: gameAccount.board,
        status: gameAccount.status,
        rawStatus: rawStatus,
        turn: gameAccount.turn.toString()
      });
      
      // Create a new array to ensure React detects the change
      setBoard(gameAccount.board.map(row => [...row]));
      setCurrentTurn(gameAccount.turn.toString());
      
      // Match raw status byte to enum value
      let status = 'Unknown';
      if (rawStatus === 0) status = 'Waiting';
      if (rawStatus === 1) status = 'In Progress';
      if (rawStatus === 2) status = 'Finished';
      
      console.log('Interpreted status:', status);
      setGameStatus(status);
    } catch (error) {
      console.error('Fetch error:', error);
      setGameStatus('Error fetching game status');
    }
  };

  const createGame = async () => {
    if (!game || !keypair) return;
    try {
      const gameKeypair = Keypair.generate();
      console.log('Creating game with account:', gameKeypair.publicKey.toString());
      
      // Create the game and wait for confirmation
      const tx = await game.methods
        .createGame()
        .accounts({
          game: gameKeypair.publicKey,
          playerOne: keypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([keypair, gameKeypair])
        .rpc();
      
      // Wait for confirmation and fetch account info to ensure it exists
      await game.provider.connection.confirmTransaction(tx);
      
      const gamePublicKey = gameKeypair.publicKey.toString();
      setGameAddress(gamePublicKey);
      
      // Add a small delay to ensure the account is properly initialized
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fetch initial game status
      await fetchGameStatus(gamePublicKey);
      setStatus('Game created! Share this address with player 2');
    } catch (error) {
      console.error('Error creating game:', error);
      setStatus('Error creating game');
    }
  };

  const joinGame = async () => {
    if (!game || !keypair || !joinGameInput) return;
    try {
      console.log('=== Join Game Process Start ===');
      console.log('Attempting to join game at address:', joinGameInput);
      
      // First verify the account exists
      try {
        const accountInfo = await game.provider.connection.getAccountInfo(new PublicKey(joinGameInput));
        if (!accountInfo) {
          console.error('Game account does not exist');
          setStatus('Error: Game account not found');
          return;
        }
        console.log('Game account exists with size:', accountInfo.data.length);
      } catch (e) {
        console.error('Invalid game address:', e);
        setStatus('Error: Invalid game address');
        return;
      }
      
      // Rest of the join game logic...
      const gameAccount = await game.account.game.fetch(new PublicKey(joinGameInput));
      console.log('Found game account:', {
        playerOne: gameAccount.playerOne.toString(),
        status: gameAccount.status
      });

      // Continue with join...
      const tx = await game.methods
        .joinGame()
        .accounts({
          game: new PublicKey(joinGameInput),
          playerTwo: keypair.publicKey,
        })
        .signers([keypair])
        .rpc();
      
      await game.provider.connection.confirmTransaction(tx);
      setStatus('Joined game successfully!');
      await fetchGameStatus(joinGameInput);
    } catch (error) {
      console.error('Join game error:', error);
      setStatus(`Error joining game: ${error.message}`);
    }
  };

  // Modify the polling useEffect to use a longer interval
  useEffect(() => {
    const address = gameAddress || joinGameInput;
    if (address && game) {
      console.log('Setting up game status polling for address:', address);
      
      // Initial fetch
      fetchGameStatus(address);
      
      // Set up polling
      const interval = setInterval(() => {
        fetchGameStatus(address);
      }, 2000);

      return () => {
        console.log('Cleaning up game status polling');
        clearInterval(interval);
      };
    }
  }, [gameAddress, joinGameInput, game]);

  const makeMove = async (row: number, col: number) => {
    if (!game || !keypair) return;
    
    // Get the correct game address for both players
    const currentGameAddress = gameAddress || joinGameInput;
    if (!currentGameAddress) {
      console.error('No game address available');
      return;
    }

    try {
      console.log('Attempting move with:', {
        gameAddress: currentGameAddress,
        player: keypair.publicKey.toString(),
        row,
        col
      });

      // Check if it's player's turn
      const gameAccount = await game.account.game.fetch(new PublicKey(currentGameAddress));
      console.log('Current game state:', {
        turn: gameAccount.turn.toString(),
        playerOne: gameAccount.playerOne.toString(),
        playerTwo: gameAccount.playerTwo.toString(),
        currentPlayer: keypair.publicKey.toString()
      });

      const isPlayerTurn = gameAccount.turn.toString() === keypair.publicKey.toString();
      if (!isPlayerTurn) {
        console.log("Not your turn!");
        setStatus("Not your turn!");
        return;
      }

      console.log('Sending move transaction...');
      const tx = await game.methods
        .makeMove(row, col)
        .accounts({
          game: new PublicKey(currentGameAddress),
          player: keypair.publicKey,
        })
        .signers([keypair])
        .rpc();

      console.log('Transaction sent:', tx);
      await game.provider.connection.confirmTransaction(tx);
      console.log('Transaction confirmed');
      
      await fetchGameStatus(currentGameAddress);
    } catch (error) {
      console.error('Error making move:', error);
      console.error('Error details:', error.message);
      setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-3xl sm:mx-auto w-full">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="w-full">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h1 className="text-3xl font-bold text-center mb-8">Tic Tac Toe</h1>
                <div className="space-y-8">
                  {keypair && (
                    <div className="text-sm text-gray-600 break-all">
                      Public Key: {keypair.publicKey.toString()}
                    </div>
                  )}
                  <div className="text-center">{status}</div>
                  {(gameAddress || joinGameInput) && (
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600 break-all">
                        Game Address: {gameAddress || joinGameInput}
                      </div>
                      <div className="text-sm font-semibold text-blue-600">
                        Game Status: {gameStatus}
                      </div>
                    </div>
                  )}
                  {game && (
                    <div className="flex flex-col items-center gap-8">
                      <button
                        onClick={createGame}
                        className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
                      >
                        Create New Game
                      </button>
                      <div className="w-full space-y-2">
                        <input
                          type="text"
                          placeholder="Enter game address to join..."
                          className="w-full p-2 border rounded"
                          value={joinGameInput}
                          onChange={(e) => setJoinGameInput(e.target.value)}
                        />
                        <button
                          onClick={joinGame}
                          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                        >
                          Join Game
                        </button>
                      </div>
                      <div className="text-center mb-4">
                        {currentTurn === keypair?.publicKey.toString() 
                          ? "Your turn!" 
                          : "Opponent's turn"}
                      </div>
                      <div className="inline-grid grid-cols-3 gap-2">
                        {board.map((row, i) =>
                          row.map((cell, j) => (
                            <button
                              key={`${i}-${j}`}
                              className="w-24 h-24 border-4 border-gray-800 bg-white hover:bg-gray-50 flex items-center justify-center text-5xl font-bold"
                              onClick={() => makeMove(i, j)}
                              disabled={cell !== 0} // Also prevent moves on non-empty cells
                            >
                              {cell === 0 ? '' : cell === 1 ? 'X' : 'O'}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 