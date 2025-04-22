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

        // Make the move
        game.board[row as usize][col as usize] = if player.key() == game.player_one { 1 } else { 2 };

        let player_mark = if player.key() == game.player_one { 1 } else { 2 };
        game.board[row as usize][col as usize] = player_mark;

        // Check for win
        if is_winner(&game.board, player_mark) {
            game.status = GameStatus::Win;
            game.winner = Some(player.key());
            msg!("Player {} wins!", player.key());
        } else if is_draw(&game.board) {
            game.status = GameStatus::Draw;
            game.winner = None;
            msg!("Game is a draw!");
        } else {
            // Update turn
            game.turn = if player.key() == game.player_one {
                game.player_two
            } else {
                game.player_one
            };
        }

        Ok(())
    }
}

fn is_winner(board: &[[u8; 3]; 3], mark: u8) -> bool {
    for i in 0..3 {
        // rows and columns
        if (board[i][0] == mark && board[i][1] == mark && board[i][2] == mark) ||
           (board[0][i] == mark && board[1][i] == mark && board[2][i] == mark) {
            return true;
        }
    }

    // diagonals
    (board[0][0] == mark && board[1][1] == mark && board[2][2] == mark) ||
    (board[0][2] == mark && board[1][1] == mark && board[2][0] == mark)
}

fn is_draw(board: &[[u8; 3]; 3]) -> bool {
    board.iter().all(|row| row.iter().all(|&cell| cell != 0))
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
    winner: Option<Pubkey>, // 32 bytes - stores the pubkey of the winner
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum GameStatus {
    Waiting = 0,
    Active = 1,
    Win = 2,
    Draw = 3,
}

#[error_code]
pub enum CustomError {
    #[msg("Game is not in waiting status")]
    GameNotWaiting,
    #[msg("Player already joined this game")]
    PlayerAlreadyJoined,
    #[msg("Invalid move coordinates")]
    InvalidMove,
    #[msg("It's not your turn")]
    NotYourTurn,
    #[msg("Cell already taken")]
    CellAlreadyTaken,
    #[msg("Game is not active")]
    GameNotActive,
}


impl Game {
    const SPACE: usize = 32 + // player_one
                        32 + // player_two
                        9 +  // board
                        1 +  // status
                        32 + 1 + 32;  // turn
}
