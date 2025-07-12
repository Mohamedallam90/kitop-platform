import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input Component', () => {
  it('renders correctly with default props', () => {
    render(<Input />);
    
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('w-full');
    expect(input).toHaveClass('border-gray-300');
  });

  it('displays label when provided', () => {
    render(<Input label="Email Address" />);
    
    expect(screen.getByText('Email Address')).toBeInTheDocument();
  });

  it('displays error message when provided', () => {
    render(<Input error="This field is required" />);
    
    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.getByText('This field is required')).toHaveClass('text-red-600');
  });

  it('displays helper text when provided and no error', () => {
    render(<Input helperText="Enter your work email" />);
    
    expect(screen.getByText('Enter your work email')).toBeInTheDocument();
    expect(screen.getByText('Enter your work email')).toHaveClass('text-gray-500');
  });

  it('applies error styling when error is provided', () => {
    render(<Input error="This field is required" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-300');
  });

  it('handles value and onChange', () => {
    const handleChange = jest.fn();
    render(<Input value="test" onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('test');
    
    fireEvent.change(input, { target: { value: 'new value' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('passes through additional HTML input attributes', () => {
    render(
      <Input 
        type="email" 
        placeholder="Enter email" 
        required 
        aria-label="Email input"
        data-testid="email-input"
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('placeholder', 'Enter email');
    expect(input).toHaveAttribute('required');
    expect(input).toHaveAttribute('aria-label', 'Email input');
    expect(input).toHaveAttribute('data-testid', 'email-input');
  });

  it('merges custom className with default classes', () => {
    render(<Input className="custom-class" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
    expect(input).toHaveClass('w-full'); // Default class still present
  });

  it('supports disabled state', () => {
    render(<Input disabled />);
    
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });
});