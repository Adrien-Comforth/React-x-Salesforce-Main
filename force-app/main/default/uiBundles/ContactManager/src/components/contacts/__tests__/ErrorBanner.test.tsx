import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ErrorBanner } from '../ErrorBanner';

describe('ErrorBanner', () => {
  it('renders nothing when there are no messages', () => {
    const { container } = render(
      <ErrorBanner title="Something failed." messages={[]} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows one message under its title, as an alert', () => {
    render(
      <ErrorBanner
        title="Salesforce couldn't save this contact."
        messages={['Email: invalid email address: x']}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent("Salesforce couldn't save this contact.");
    expect(alert).toHaveTextContent('Email: invalid email address: x');
  });

  it('lists several messages', () => {
    render(<ErrorBanner messages={['First problem', 'Second problem']} />);

    expect(
      screen.getAllByRole('listitem').map(item => item.textContent)
    ).toEqual(['First problem', 'Second problem']);
  });
});
