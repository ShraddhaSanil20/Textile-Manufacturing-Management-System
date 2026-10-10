"""add dispatch delivery workflow fields

Revision ID: e58129a04101
Revises: d49390902932
Create Date: 2026-10-11 02:55:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e58129a04101'
down_revision: Union[str, Sequence[str], None] = 'd49390902932'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Safely add columns if not already added
    conn = op.get_bind()
    columns = [c['name'] for c in sa.inspect(conn).get_columns('dispatches')]
    
    if 'delivered_at' not in columns:
        op.add_column('dispatches', sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True))
    if 'delivered_by_user_id' not in columns:
        op.add_column('dispatches', sa.Column('delivered_by_user_id', sa.Integer(), nullable=True))
        op.create_foreign_key('fk_dispatches_delivered_by_user_id', 'dispatches', 'users', ['delivered_by_user_id'], ['id'], ondelete='SET NULL')
    
    # Indexes
    op.create_index('ix_dispatches_status', 'dispatches', ['status'], unique=False, if_not_exists=True)
    op.create_index('ix_dispatches_delivered_by', 'dispatches', ['delivered_by_user_id'], unique=False, if_not_exists=True)

def downgrade() -> None:
    op.drop_index('ix_dispatches_delivered_by', table_name='dispatches', if_exists=True)
    op.drop_index('ix_dispatches_status', table_name='dispatches', if_exists=True)
    op.drop_constraint('fk_dispatches_delivered_by_user_id', 'dispatches', type_='foreignkey')
    op.drop_column('dispatches', 'delivered_by_user_id')
    op.drop_column('dispatches', 'delivered_at')
