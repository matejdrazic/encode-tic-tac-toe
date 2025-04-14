use anchor_lang::prelude::*;

declare_id!("C5zQNGqYy3m7aTB9xrKFLwxY77wC2JKKGccXn5E1qmX5");

#[program]
pub mod encode_tic_tac_toe {
    use super::*;

    pub fn create_game(ctx: Context<CreateGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let player_one = &ctx.accounts.player_one;

        game.player_one = player_one.key();
        game.board = [[0; 3]; 3];  // 0 represents empty cell
        game.status = GameStatus::Waiting;
        
        msg!("New game created by {}", player_one.key());
        Ok(())
    }

    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let player_two = &ctx.accounts.player_two;

        require!(game.status == GameStatus::Waiting, CustomError::GameNotWaiting);
        require!(game.player_one != player_two.key(), CustomError::PlayerAlreadyJoined);

        game.player_two = player_two.key();
        game.status = GameStatus::Finished;
        msg!("Player {} joined the game", player_two.key());
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateGame<'info> {
    // init requires system_program to create new account and player_one needs to be mutable to pay for it
    #[account(init, payer = player_one, space = 8 + Game::SPACE)]
    pub game: Account<'info, Game>,
    // player_one marked as mut since they will pay for account creation
    #[account(mut)] 
    pub player_one: Signer<'info>,
    // system_program required by init to create the new game account
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub player_two: Signer<'info>,
}

#[account]
pub struct Game {
    player_one: Pubkey,     // 32 bytes
    player_two: Pubkey,     // 32 bytes
    board: [[u8; 3]; 3],    // 9 bytes
    status: GameStatus,     // 1 byte
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum GameStatus {
    Waiting,
    Finished,
}

#[error_code]
pub enum CustomError {
    #[msg("Game is not in waiting status")]
    GameNotWaiting,
    #[msg("Player already joined this game")]
    PlayerAlreadyJoined,
}

impl Game {
    const SPACE: usize = 32 + // player_one
                        32 + // player_two
                        9 + // board
                        1;   // status
}
