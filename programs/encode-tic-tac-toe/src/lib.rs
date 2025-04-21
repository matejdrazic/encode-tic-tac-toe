#![allow(unexpected_cfgs)]  //ignore unexpected `cfg` warnings
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
        game.turn = player_one.key();  // Player one starts
        
        msg!("New game created by {}", player_one.key());
        Ok(())
    }

    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let player_two = &ctx.accounts.player_two;

        require!(game.status == GameStatus::Waiting, CustomError::GameNotWaiting);
        require!(game.player_one != player_two.key(), CustomError::PlayerAlreadyJoined);

        game.player_two = player_two.key();
        game.status = GameStatus::Active;
        
        msg!("Player {} joined the game", player_two.key());
        Ok(())
    }

    pub fn make_move(ctx: Context<MakeMove>, row: u8, col: u8) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let player = &ctx.accounts.player;

        require!(game.status == GameStatus::Active, CustomError::GameNotActive);
        require!(player.key() == game.turn, CustomError::NotPlayersTurn);
        require!(row < 3 && col < 3, CustomError::InvalidMove);
        require!(game.board[row as usize][col as usize] == 0, CustomError::CellOccupied);

        // Make the move
        game.board[row as usize][col as usize] = if player.key() == game.player_one { 1 } else { 2 };

        // Update turn
        game.turn = if player.key() == game.player_one {
            game.player_two
        } else {
            game.player_one
        };

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

#[derive(Accounts)]
pub struct MakeMove<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub player: Signer<'info>,
}

#[account]
pub struct Game {
    player_one: Pubkey,     // 32 bytes
    player_two: Pubkey,     // 32 bytes
    board: [[u8; 3]; 3],    // 9 bytes
    status: GameStatus,     // 1 byte
    turn: Pubkey,          // 32 bytes - stores the pubkey of whose turn it is
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum GameStatus {
    Waiting = 0,
    Active = 1,
    Finished = 2,
}

#[error_code]
pub enum CustomError {
    #[msg("Game is not in waiting status")]
    GameNotWaiting,
    #[msg("Player already joined this game")]
    PlayerAlreadyJoined,
    #[msg("The game is not active")]
    GameNotActive,
    #[msg("It's not your turn")]
    NotPlayersTurn,
    #[msg("Invalid move")]
    InvalidMove,
    #[msg("The cell is already occupied. Select another one!")]
    CellOccupied
}

impl Game {
    const SPACE: usize = 32 + // player_one
                        32 + // player_two
                        9 +  // board
                        1 +  // status
                        32;  // turn
}
