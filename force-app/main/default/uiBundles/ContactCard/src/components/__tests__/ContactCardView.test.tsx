import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContactCardView } from '../ContactCardView';

const ADA = {
  id: '003000000000001AAA',
  name: 'Ada Lovelace',
  title: 'Analyst',
  email: 'ada@example.com',
  phone: '555-0100',
  accountName: 'Analytical Engines',
};

function detail(label: string) {
  return screen.getByText(label).nextElementSibling?.textContent;
}

describe('ContactCardView', () => {
  it('shows the name, title, account, email and phone', () => {
    render(<ContactCardView contact={ADA} />);

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Analyst')).toBeInTheDocument();
    expect(detail('Account')).toBe('Analytical Engines');
    expect(detail('Email')).toBe('ada@example.com');
    expect(detail('Phone')).toBe('555-0100');
    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  it('shows a dash for empty values', () => {
    render(
      <ContactCardView
        contact={{ ...ADA, name: 'Cher', title: '', email: '', phone: '', accountName: '' }}
      />
    );

    expect(screen.getByText('CH')).toBeInTheDocument();
    expect(detail('Account')).toBe('—');
    expect(detail('Email')).toBe('—');
    expect(detail('Phone')).toBe('—');
  });
});
