import React from 'react';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card Component', () => {
  it('renders children correctly', () => {
    render(
      <Card>
        <h2>Card Title</h2>
        <p>Card content</p>
      </Card>
    );
    
    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies default classes', () => {
    render(<Card>Content</Card>);
    
    const card = screen.getByText('Content').parentElement;
    expect(card).toHaveClass('bg-white');
    expect(card).toHaveClass('rounded-xl');
    expect(card).toHaveClass('shadow-sm');
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('border-gray-200');
  });

  it('applies different padding based on padding prop', () => {
    const { rerender } = render(<Card padding="sm">Small padding</Card>);
    expect(screen.getByText('Small padding').parentElement).toHaveClass('p-4');
    
    rerender(<Card padding="md">Medium padding</Card>);
    expect(screen.getByText('Medium padding').parentElement).toHaveClass('p-6');
    
    rerender(<Card padding="lg">Large padding</Card>);
    expect(screen.getByText('Large padding').parentElement).toHaveClass('p-8');
  });

  it('merges custom className with default classes', () => {
    render(<Card className="custom-class">Content</Card>);
    
    const card = screen.getByText('Content').parentElement;
    expect(card).toHaveClass('custom-class');
    expect(card).toHaveClass('bg-white'); // Default class still present
  });

  it('applies medium padding by default', () => {
    render(<Card>Default padding</Card>);
    
    const card = screen.getByText('Default padding').parentElement;
    expect(card).toHaveClass('p-6');
  });
});