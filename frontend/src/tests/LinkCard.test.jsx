import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LinkCard } from '../features/links/LinkCard';

const link = {
  id: 'link-1',
  title: 'Protheus',
  description: 'ERP corporativo.',
  url: 'https://protheus.conasa.com',
  icon: 'Database',
  color: '#00A8CC',
  visibility: 'PUBLIC',
  isFavorite: false,
};

describe('LinkCard', () => {
  it('abre o link em nova aba sem expor a janela de origem', () => {
    render(<LinkCard link={link} />);

    const ancora = screen.getByRole('link', { name: /Protheus/ });
    expect(ancora).toHaveAttribute('href', 'https://protheus.conasa.com');
    expect(ancora).toHaveAttribute('target', '_blank');
    expect(ancora).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('esconde os controles de edição de quem não pode editar', () => {
    render(<LinkCard link={link} />);

    expect(screen.queryByRole('button', { name: /Editar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Excluir/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Favoritar/ })).toBeInTheDocument();
  });

  it('mostra editar e excluir para curadores', () => {
    render(<LinkCard link={link} podeEditar aoEditar={vi.fn()} aoRemover={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Editar Protheus' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir Protheus' })).toBeInTheDocument();
  });

  it('avisa quando o link é restrito ao setor', () => {
    render(<LinkCard link={{ ...link, visibility: 'HUB_ONLY' }} />);

    expect(screen.getByLabelText('Restrito ao setor')).toBeInTheDocument();
  });

  it('reflete o estado do favorito no botão', () => {
    render(<LinkCard link={{ ...link, isFavorite: true }} />);

    const botao = screen.getByRole('button', { name: 'Remover Protheus dos favoritos' });
    expect(botao).toHaveAttribute('aria-pressed', 'true');
  });

  it('informa o link e o estado atual ao alternar o favorito', async () => {
    const aoAlternar = vi.fn();
    render(<LinkCard link={link} aoAlternarFavorito={aoAlternar} />);

    await userEvent.click(screen.getByRole('button', { name: 'Favoritar Protheus' }));

    expect(aoAlternar).toHaveBeenCalledWith(link);
  });

  it('mostra o setor de origem quando o card vem da lista de favoritos', () => {
    render(<LinkCard link={{ ...link, hubName: 'Tecnologia da Informação' }} />);

    expect(screen.getByText('Tecnologia da Informação')).toBeInTheDocument();
  });
});
