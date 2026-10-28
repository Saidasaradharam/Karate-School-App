"""add_photo_faces_table

Revision ID: 1c86e4e24f1b
Revises: bc82715aba29
Create Date: 2026-10-28 ...
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1c86e4e24f1b'
down_revision = 'bc82715aba29'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- ONLY add the photo_faces table ---
    op.create_table(
        'photo_faces',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('photo_id', sa.Integer(), nullable=False),
        sa.Column('cluster_id', sa.Integer(), nullable=True),
        sa.Column('face_encoding', sa.Text(), nullable=True),
        sa.Column('thumbnail_url', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['photo_id'], ['photos.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_photo_faces_id'), 'photo_faces', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_photo_faces_id'), table_name='photo_faces')
    op.drop_table('photo_faces')