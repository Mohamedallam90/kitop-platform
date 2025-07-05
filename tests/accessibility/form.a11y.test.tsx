import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';

import { AccessibleForm, FormFieldProps } from '../../frontend/components/forms/AccessibleForm';

expect.extend(toHaveNoViolations);

describe('AccessibleForm Accessibility Tests', () => {
  const mockOnSubmit = jest.fn();
  
  const basicFormFields: FormFieldProps[] = [
    {
      id: 'firstName',
      name: 'firstName',
      label: 'First Name',
      type: 'text',
      required: true,
      validation: { required: 'First name is required' },
    },
    {
      id: 'email',
      name: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      validation: {
        required: 'Email is required',
        pattern: {
          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
          message: 'Invalid email address',
        },
      },
    },
    {
      id: 'message',
      name: 'message',
      label: 'Message',
      type: 'textarea',
      description: 'Please provide a detailed message',
      required: false,
    },
    {
      id: 'category',
      name: 'category',
      label: 'Category',
      type: 'select',
      options: [
        { value: 'general', label: 'General Inquiry' },
        { value: 'support', label: 'Technical Support' },
        { value: 'billing', label: 'Billing Question' },
      ],
      required: true,
      validation: { required: 'Please select a category' },
    },
  ];

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  describe('Accessibility Compliance', () => {
    it('should not have any accessibility violations', async () => {
      const { container } = render(
        <AccessibleForm
          fields={basicFormFields}
          onSubmit={mockOnSubmit}
          aria-label="Contact form"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper form landmarks', () => {
      render(
        <AccessibleForm
          fields={basicFormFields}
          onSubmit={mockOnSubmit}
          aria-label="Contact form"
        />
      );

      const form = screen.getByRole('form', { name: 'Contact form' });
      expect(form).toBeInTheDocument();
    });

    it('should have properly associated labels', () => {
      render(
        <AccessibleForm
          fields={basicFormFields}
          onSubmit={mockOnSubmit}
        />
      );

      // Check that all inputs have associated labels
      const firstNameInput = screen.getByLabelText('First Name *');
      const emailInput = screen.getByLabelText('Email Address *');
      const messageInput = screen.getByLabelText('Message');
      const categorySelect = screen.getByLabelText('Category *');

      expect(firstNameInput).toBeInTheDocument();
      expect(emailInput).toBeInTheDocument();
      expect(messageInput).toBeInTheDocument();
      expect(categorySelect).toBeInTheDocument();
    });

    it('should indicate required fields to screen readers', () => {
      render(
        <AccessibleForm
          fields={basicFormFields}
          onSubmit={mockOnSubmit}
        />
      );

      const firstNameInput = screen.getByLabelText('First Name *');
      const emailInput = screen.getByLabelText('Email Address *');
      const messageInput = screen.getByLabelText('Message');

      // Required fields should have aria-required="true"
      expect(firstNameInput).toHaveAttribute('aria-required', 'true');
      expect(emailInput).toHaveAttribute('aria-required', 'true');
      expect(messageInput).toHaveAttribute('aria-required', 'false');
    });

    it('should have proper field descriptions', () => {
      render(
        <AccessibleForm
          fields={basicFormFields}
          onSubmit={mockOnSubmit}
        />
      );

      const messageInput = screen.getByLabelText('Message');
      const description = screen.getByText('Please provide a detailed message');
      
      expect(description).toBeInTheDocument();
      expect(messageInput).toHaveAttribute('aria-describedby', expect.stringContaining('message-description'));
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support tab navigation through all form fields', async () => {
      const user = userEvent.setup();
      
      render(
        <AccessibleForm
          fields={basicFormFields}
          onSubmit={mockOnSubmit}
        />
      );

      const firstNameInput = screen.getByLabelText('First Name *');
      const emailInput = screen.getByLabelText('Email Address *');
      const messageInput = screen.getByLabelText('Message');
      const categorySelect = screen.getByLabelText('Category *');
      const submitButton = screen.getByRole('button', { name: 'Submit' });

      // Focus should move through form fields in order
      await user.tab();
      expect(firstNameInput).toHaveFocus();

      await user.tab();
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(messageInput).toHaveFocus();

      await user.tab();
      expect(categorySelect).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();
    });

    it('should support form submission via Enter key', async () => {
      const user = userEvent.setup();
      
      render(
        <AccessibleForm
          fields={[basicFormFields[0]]} // Single field for simplicity
          onSubmit={mockOnSubmit}
        />
      );

      const input = screen.getByLabelText('First Name *');
      const submitButton = screen.getByRole('button', { name: 'Submit' });

      await user.type(input, 'John Doe');
      await user.tab(); // Move to submit button
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({ firstName: 'John Doe' });
      });
    });

    it('should support form submission via Space key on submit button', async () => {
      const user = userEvent.setup();
      
      render(
        <AccessibleForm
          fields={[basicFormFields[0]]}
          onSubmit={mockOnSubmit}
        />
      );

      const input = screen.getByLabelText('First Name *');
      const submitButton = screen.getByRole('button', { name: 'Submit' });

      await user.type(input, 'John Doe');
      submitButton.focus();
      await user.keyboard(' ');

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({ firstName: 'John Doe' });
      });
    });
  });

  describe('Error Handling and Announcements', () => {
    it('should announce validation errors to screen readers', async () => {
      const user = userEvent.setup();
      
      render(
        <AccessibleForm
          fields={[basicFormFields[0]]} // Required field
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: 'Submit' });
      
      // Submit form without filling required field
      await user.click(submitButton);

      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should provide error summary for multiple validation errors', async () => {
      const user = userEvent.setup();
      
      render(
        <AccessibleForm
          fields={basicFormFields.slice(0, 2)} // First two required fields
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: 'Submit' });
      
      // Submit form without filling required fields
      await user.click(submitButton);

      await waitFor(() => {
        const errorSummary = screen.getByRole('alert');
        expect(errorSummary).toBeInTheDocument();
        expect(errorSummary).toHaveTextContent('Please correct the following errors:');
      });
    });

    it('should link error summary to actual form fields', async () => {
      const user = userEvent.setup();
      
      render(
        <AccessibleForm
          fields={[basicFormFields[0]]}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: 'Submit' });
      
      // Submit form without filling required field
      await user.click(submitButton);

      await waitFor(async () => {
        const errorLink = screen.getByRole('link', { name: /First Name:/ });
        expect(errorLink).toBeInTheDocument();
        
        // Click error link should focus the field
        await user.click(errorLink);
        const input = screen.getByLabelText('First Name *');
        expect(input).toHaveFocus();
      });
    });

    it('should indicate field validation state with aria-invalid', async () => {
      const user = userEvent.setup();
      
      render(
        <AccessibleForm
          fields={[basicFormFields[1]]} // Email field with validation
          onSubmit={mockOnSubmit}
        />
      );

      const emailInput = screen.getByLabelText('Email Address *');
      
      // Initially, field should not be invalid
      expect(emailInput).toHaveAttribute('aria-invalid', 'false');
      
      // Enter invalid email
      await user.type(emailInput, 'invalid-email');
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide progress indication for form completion', () => {
      render(
        <AccessibleForm
          fields={basicFormFields}
          onSubmit={mockOnSubmit}
        />
      );

      // Progress should be announced to screen readers
      const progressElement = screen.getByText(/Form progress:/);
      expect(progressElement).toHaveAttribute('aria-live', 'polite');
      expect(progressElement).toHaveAttribute('aria-atomic', 'true');
    });

    it('should announce form submission success', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);
      
      render(
        <AccessibleForm
          fields={[basicFormFields[0]]}
          onSubmit={mockOnSubmit}
        />
      );

      const input = screen.getByLabelText('First Name *');
      const submitButton = screen.getByRole('button', { name: 'Submit' });

      await user.type(input, 'John Doe');
      await user.click(submitButton);

      await waitFor(() => {
        const successMessage = screen.getByRole('status');
        expect(successMessage).toBeInTheDocument();
        expect(successMessage).toHaveTextContent('Form submitted successfully!');
      });
    });

    it('should announce form submission errors', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockRejectedValue(new Error('Network error'));
      
      render(
        <AccessibleForm
          fields={[basicFormFields[0]]}
          onSubmit={mockOnSubmit}
        />
      );

      const input = screen.getByLabelText('First Name *');
      const submitButton = screen.getByRole('button', { name: 'Submit' });

      await user.type(input, 'John Doe');
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveTextContent('Network error');
      });
    });
  });

  describe('Focus Management', () => {
    it('should focus first error field when validation fails', async () => {
      const user = userEvent.setup();
      
      render(
        <AccessibleForm
          fields={basicFormFields.slice(0, 2)}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: 'Submit' });
      
      // Submit form with validation errors
      await user.click(submitButton);

      await waitFor(() => {
        const firstNameInput = screen.getByLabelText('First Name *');
        expect(firstNameInput).toHaveFocus();
      });
    });

    it('should maintain focus on submit button after successful submission', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);
      
      render(
        <AccessibleForm
          fields={[basicFormFields[0]]}
          onSubmit={mockOnSubmit}
        />
      );

      const input = screen.getByLabelText('First Name *');
      const submitButton = screen.getByRole('button', { name: 'Submit' });

      await user.type(input, 'John Doe');
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toHaveFocus();
      });
    });
  });

  describe('Loading States', () => {
    it('should indicate loading state to screen readers', async () => {
      const user = userEvent.setup();
      let resolveSubmit: (value: any) => void;
      mockOnSubmit.mockReturnValue(new Promise(resolve => {
        resolveSubmit = resolve;
      }));
      
      render(
        <AccessibleForm
          fields={[basicFormFields[0]]}
          onSubmit={mockOnSubmit}
        />
      );

      const input = screen.getByLabelText('First Name *');
      const submitButton = screen.getByRole('button', { name: 'Submit' });

      await user.type(input, 'John Doe');
      await user.click(submitButton);

      // Check loading state
      expect(screen.getByRole('button', { name: 'Submitting...' })).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Resolve the promise
      resolveSubmit!(undefined);
    });
  });
});