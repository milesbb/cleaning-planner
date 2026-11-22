import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { ART_KEYS } from './art-images';
import { ArtFrame } from './art-frame';

const WELCOME_IMAGE = { src: '/art/welcome-hero.png', width: 1352, height: 1104 };

describe('ArtFrame', () => {
  it('has no accessibility violations, with art and without', async () => {
    const { container } = render(
      <div>
        <ArtFrame artKey="welcomeHero" alt="Two housemates tidying a sunny kitchen" />
        <ArtFrame
          artKey="welcomeHero"
          alt="Two housemates tidying a sunny kitchen"
          images={{ welcomeHero: WELCOME_IMAGE }}
        />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows a calm room-coloured stand-in with the room icon until the art exists', () => {
    const { container } = render(
      <ArtFrame artKey="bathroomScene" alt="A tidy bathroom with plants" images={{}} />,
    );
    const standIn = screen.getByRole('img', { name: 'A tidy bathroom with plants' });
    expect(standIn).toHaveClass('bg-bathroom');
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('shows the registered art with its alt text', () => {
    render(
      <ArtFrame
        artKey="welcomeHero"
        alt="Two housemates tidying a sunny kitchen"
        images={{ welcomeHero: WELCOME_IMAGE }}
      />,
    );
    const art = screen.getByRole('img', { name: 'Two housemates tidying a sunny kitchen' });
    expect(art.tagName).toBe('IMG');
    expect(art).toHaveAttribute('src', '/art/welcome-hero.png');
  });

  it('hides decorative art from screen readers', () => {
    const { container } = render(<ArtFrame artKey="allDone" alt="" images={{}} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it.each(ART_KEYS)('has a stand-in for %s', (artKey) => {
    render(<ArtFrame artKey={artKey} alt="Art" images={{}} />);
    expect(screen.getByRole('img', { name: 'Art' })).toBeInTheDocument();
  });
});
