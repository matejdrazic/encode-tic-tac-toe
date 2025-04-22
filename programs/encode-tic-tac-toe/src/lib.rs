use anchor_lang::prelude::*;

declare_id!("C5zQNGqYy3m7aTB9xrKFLwxY77wC2JKKGccXn5E1qmX5");

// Helper functions
fn find_winner(board: &[[u8; 3]; 3]) -> Option<u8> {
    // Check rows
    for row in 0..3 {
        if board[row][0] != 0 && board[row][0] == board[row][1] && board[row][0] == board[row][2] {
            return Some(board[row][0]);
        }
    }
    
    // Check columns
    for col in 0..3 {
        if board[0][col] != 0 && board[0][col] == board[1][col] && board[0][col] == board[2][col] {
            return Some(board[0][col]);
        }
    }
    
    // Check diagonals
    if board[0][0] != 0 && board[0][0] == board[1][1] && board[0][0] == board[2][2] {
        return Some(board[0][0]);
    }
    if board[0][2] != 0 && board[0][2] == board[1][1] && board[0][2] == board[2][0] {
        return Some(board[0][2]);
    }
    
    None
}

fn is_board_full(board: &[[u8; 3]; 3]) -> bool {
    for row in 0..3 {
        for col in 0..3 {
            if board[row][col] == 0 {
                return false;
            }
        }
    }
    true
}

#[program]
pub mod encode_tic_tac_toe {
    use super::*;

    pub fn check_winner(ctx: Context<CheckWinner>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        
        // Check if we have a winner
        if let Some(winner_value) = find_winner(&game.board) {
            // Update game status
            game.status = GameStatus::Finished;
            
            // Set winner field
            if winner_value == 1 {
                game.winner = game.player_one;
                msg!("Player One wins!");
            } else {
                game.winner = game.player_two;
                msg!("Player Two wins!");
            }
        } else if is_board_full(&game.board) {
            // If no winner but board is full, it's a draw
            game.status = GameStatus::Finished;
            // For draws, we could set winner to a default value or handle differently
            game.winner = Pubkey::default(); // Using default pubkey to indicate a draw
            msg!("Game ended in a draw!");
        }
        
        Ok(())
    }

    pub fn create_game(ctx: Context<CreateGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        let player_one = &ctx.accounts.player_one;

        game.player_one = player_one.key();
        game.board = [[0; 3]; 3];  // 0 represents empty cell
        game.status = GameStatus::Waiting;
        game.turn = player_one.key();  // Player one starts
        game.winner = Pubkey::default(); // Initialize winner to default
        
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

        // Check if the game is active
        require!(game.status == GameStatus::Active, CustomError::GameNotActive);
        
        // Check if it's the player's turn
        require!(game.turn == player.key(), CustomError::NotPlayerTurn);
        
        // Check if the cell is empty
        require!(game.board[row as usize][col as usize] == 0, CustomError::CellNotEmpty);

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

// Added missing account struct for CheckWinner
#[derive(Accounts)]
pub struct CheckWinner<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub player: Signer<'info>,
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
    turn: Pubkey,           // 32 bytes - stores the pubkey of whose turn it is
    winner: Pubkey,         // 32 bytes - stores the winner
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
    #[msg("Game is not active")]
    GameNotActive,
    #[msg("Not player's turn")]
    NotPlayerTurn,
    #[msg("Cell is not empty")]
    CellNotEmpty,
}

impl Game {
    const SPACE: usize = 32 + // player_one
                        32 + // player_two
                        9 +  // board
                        1 +  // status
                        32 + // turn
                        32;  // winner
}