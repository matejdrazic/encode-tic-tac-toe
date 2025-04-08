use anchor_lang::prelude::*;

declare_id!("DR5UupfCnFyr28T3CKaVpZr4477Qmn1JhGnUD2jveSLQ");

#[program]
pub mod encode_tic_tac_toe {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
