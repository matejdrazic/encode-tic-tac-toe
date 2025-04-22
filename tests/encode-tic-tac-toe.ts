import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { EncodeTicTacToe } from "../target/types/encode_tic_tac_toe";

describe("encode-tic-tac-toe", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  const program = anchor.workspace.EncodeTicTacToe as Program<EncodeTicTacToe>;

  it("Plays a full game where player one wins", async () => {
    const gameKeypair = anchor.web3.Keypair.generate();
    const playerTwo = anchor.web3.Keypair.generate();

    // Fund playerTwo
    const sig = await provider.connection.requestAirdrop(playerTwo.publicKey, 1_000_000_000);
    await provider.connection.confirmTransaction(sig);

    // Create game
    await program.methods
      .createGame()
      .accounts({
        game: gameKeypair.publicKey,
        playerOne: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([gameKeypair])
      .rpc();

    // Join game
    await program.methods
      .joinGame()
      .accounts({
        game: gameKeypair.publicKey,
        playerTwo: playerTwo.publicKey,
      })
      .signers([playerTwo])
      .rpc();

    // Moves:
    // Player 1 -> (0, 0)
    await program.methods.makeMove(0, 0).accounts({
      game: gameKeypair.publicKey,
      player: provider.wallet.publicKey,
    }).rpc();

    // Player 2 -> (1, 0)
    await program.methods.makeMove(1, 0).accounts({
      game: gameKeypair.publicKey,
      player: playerTwo.publicKey,
    }).signers([playerTwo]).rpc();

    // Player 1 -> (0, 1)
    await program.methods.makeMove(0, 1).accounts({
      game: gameKeypair.publicKey,
      player: provider.wallet.publicKey,
    }).rpc();

    // Player 2 -> (1, 1)
    await program.methods.makeMove(1, 1).accounts({
      game: gameKeypair.publicKey,
      player: playerTwo.publicKey,
    }).signers([playerTwo]).rpc();

    // Player 1 -> (0, 2) -> win
    await program.methods.makeMove(0, 2).accounts({
      game: gameKeypair.publicKey,
      player: provider.wallet.publicKey,
    }).rpc();

    const gameAccount = await program.account.game.fetch(gameKeypair.publicKey);
    console.log("Game status:", gameAccount.status); // Should be Finished
    console.log("Winner:", gameAccount.winner?.toBase58()); // Should match player one
  });
});
