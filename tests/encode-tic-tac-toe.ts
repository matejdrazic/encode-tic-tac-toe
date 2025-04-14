import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { EncodeTicTacToe } from "../target/types/encode_tic_tac_toe";

describe("encode-tic-tac-toe", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const program = anchor.workspace.EncodeTicTacToe as Program<EncodeTicTacToe>;

  it("Creates a game!", async () => {
    const gameKeypair = anchor.web3.Keypair.generate();
    const playerTwo = anchor.web3.Keypair.generate();

    const tx = await program.methods
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

    console.log("Your transaction signature", tx);
  });
});
