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

  const createGame = async () => {
    if (!game || !keypair) return;
    try {
      const gameKeypair = Keypair.generate();
      console.log('Creating game with account:', gameKeypair.publicKey.toString());
      
      await game.methods
        .createGame()
        .accounts({
          game: gameKeypair.publicKey,
          playerOne: keypair.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([keypair, gameKeypair])
        .rpc();
      
      setGameAddress(gameKeypair.publicKey.toString());
      setStatus('Game created! Share this address with player 2');
    } catch (error) {
      console.error('Error creating game:', error);
      setStatus('Error creating game');
    }
  };

  const joinGame = async () => {
    if (!game || !keypair || !joinGameInput) return;
    try {
      await game.methods
        .joinGame()
        .accounts({
          game: new PublicKey(joinGameInput),
          playerTwo: keypair.publicKey,
        })
        .signers([keypair])
        .rpc();
      
      setStatus('Joined game successfully!');
    } catch (error) {
      console.error('Error joining game:', error);
      setStatus('Error joining game');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h1 className="text-3xl font-bold text-center mb-8">Tic Tac Toe</h1>
                <div className="space-y-4">
                  {keypair && (
                    <div className="text-sm text-gray-600 break-all">
                      Public Key: {keypair.publicKey.toString()}
                    </div>
                  )}
                  <div className="text-center">{status}</div>
                  {gameAddress && (
                    <div className="text-sm text-gray-600 break-all">
                      Game Address: {gameAddress}
                    </div>
                  )}
                  {game && (
                    <>
                      <button
                        onClick={createGame}
                        className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
                      >
                        Create New Game
                      </button>
                      <div className="space-y-2">
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
                      <div className="grid grid-cols-3 gap-2">
                        {board.map((row, i) =>
                          row.map((cell, j) => (
                            <button
                              key={`${i}-${j}`}
                              className="w-20 h-20 border-2 border-gray-300 flex items-center justify-center text-2xl"
                              onClick={() => {}}
                            >
                              {cell === 0 ? '' : cell === 1 ? 'X' : 'O'}
                            </button>
                          ))
                        )}
                      </div>
                    </>
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