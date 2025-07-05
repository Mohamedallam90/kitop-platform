'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useForm, FieldErrors } from 'react-hook-form';
import { clsx } from 'clsx';

export interface FormFieldProps {
  id: string;
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'number' | 'textarea' | 'select';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  description?: string;
  options?: { value: string; label: string }[];
  validation?: any;
  className?: string;
  'aria-describedby'?: string;
  'data-testid'?: string;
}

export interface AccessibleFormProps {
  fields: FormFieldProps[];
  onSubmit: (data: any) => Promise<void> | void;
  submitText?: string;
  className?: string;
  isLoading?: boolean;
  validationMode?: 'onChange' | 'onBlur' | 'onSubmit';
  'aria-label'?: string;
  'data-testid'?: string;
}

interface FormFieldComponentProps extends FormFieldProps {
  register: any;
  errors: FieldErrors;
  isSubmitting: boolean;
}

const FormField: React.FC<FormFieldComponentProps> = ({
  id,
  name,
  label,
  type = 'text',
  placeholder,
  required,
  disabled,
  autoComplete,
  description,
  options,
  register,
  errors,
  isSubmitting,
  className,
  'aria-describedby': ariaDescribedBy,
  'data-testid': dataTestId,
}) => {
  const error = errors[name];
  const errorId = `${id}-error`;
  const descriptionId = description ? `${id}-description` : undefined;
  const fieldAriaDescribedBy = [
    ariaDescribedBy,
    error ? errorId : undefined,
    descriptionId,
  ].filter(Boolean).join(' ') || undefined;

  const baseInputClasses = clsx(
    'w-full px-3 py-2 border rounded-md shadow-sm transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
    {
      'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500': error,
      'border-gray-300': !error,
    },
    className
  );

  const labelClasses = clsx(
    'block text-sm font-medium text-gray-700 mb-1',
    {
      'text-red-700': error,
    }
  );

  const renderInput = () => {
    const commonProps = {
      id,
      ...register(name),
      disabled: disabled || isSubmitting,
      'aria-describedby': fieldAriaDescribedBy,
      'aria-invalid': error ? 'true' : 'false',
      'aria-required': required,
      'data-testid': dataTestId || `field-${name}`,
      autoComplete,
      placeholder,
    };

    switch (type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={4}
            className={clsx(baseInputClasses, 'resize-vertical')}
          />
        );

      case 'select':
        return (
          <select
            {...commonProps}
            className={clsx(baseInputClasses, 'cursor-pointer')}
          >
            <option value="">Choose an option</option>
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            {...commonProps}
            type={type}
            className={baseInputClasses}
          />
        );
    }
  };

  return (
    <div className="mb-4">
      <label htmlFor={id} className={labelClasses}>
        {label}
        {required && (
          <span 
            className="text-red-500 ml-1" 
            aria-label="required"
            title="This field is required"
          >
            *
          </span>
        )}
      </label>
      
      {description && (
        <p
          id={descriptionId}
          className="text-sm text-gray-600 mb-2"
          aria-live="polite"
        >
          {description}
        </p>
      )}
      
      {renderInput()}
      
      {error && (
        <div
          id={errorId}
          role="alert"
          aria-live="polite"
          className="mt-1 text-sm text-red-600"
          data-testid={`${name}-error`}
        >
          {error.message || 'This field has an error'}
        </div>
      )}
    </div>
  );
};

export const AccessibleForm: React.FC<AccessibleFormProps> = ({
  fields,
  onSubmit,
  submitText = 'Submit',
  className,
  isLoading = false,
  validationMode = 'onChange',
  'aria-label': ariaLabel,
  'data-testid': dataTestId,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm({
    mode: validationMode,
    defaultValues: fields.reduce((acc, field) => {
      acc[field.name] = '';
      return acc;
    }, {} as Record<string, string>),
  });

  // Focus management for form submission
  useEffect(() => {
    if (submitSuccess && submitButtonRef.current) {
      submitButtonRef.current.focus();
    }
  }, [submitSuccess]);

  // Scroll to first error when validation fails
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0];
      const errorElement = document.getElementById(firstErrorField);
      if (errorElement) {
        errorElement.focus();
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [errors]);

  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await onSubmit(data);
      setSubmitSuccess(true);
      
      // Announce success to screen readers
      const successMessage = 'Form submitted successfully!';
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = successMessage;
      document.body.appendChild(announcement);
      
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
      
      reset();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while submitting the form';
      setSubmitError(errorMessage);
      
      // Announce error to screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'assertive');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = `Error: ${errorMessage}`;
      document.body.appendChild(announcement);
      
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasErrors = Object.keys(errors).length > 0;
  const totalFields = fields.length;
  const completedFields = fields.filter(field => {
    const value = formRef.current?.elements[field.name as any]?.value;
    return value && value.length > 0;
  }).length;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit(handleFormSubmit)}
      className={clsx('space-y-4', className)}
      aria-label={ariaLabel || 'Contact form'}
      data-testid={dataTestId || 'accessible-form'}
      noValidate
    >
      {/* Progress indicator for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Form progress: {completedFields} of {totalFields} fields completed
      </div>

      {/* Form errors summary */}
      {hasErrors && (
        <div
          role="alert"
          aria-labelledby="error-summary-title"
          className="p-4 bg-red-50 border border-red-200 rounded-md"
          data-testid="form-errors"
        >
          <h2 id="error-summary-title" className="text-lg font-semibold text-red-800 mb-2">
            Please correct the following errors:
          </h2>
          <ul className="list-disc pl-5 text-red-700">
            {Object.entries(errors).map(([fieldName, error]) => {
              const field = fields.find(f => f.name === fieldName);
              return (
                <li key={fieldName}>
                  <a
                    href={`#${fieldName}`}
                    className="underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-red-500"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(fieldName)?.focus();
                    }}
                  >
                    {field?.label}: {error?.message || 'This field has an error'}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Submit error */}
      {submitError && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700"
          data-testid="submit-error"
        >
          {submitError}
        </div>
      )}

      {/* Success message */}
      {submitSuccess && (
        <div
          role="status"
          className="p-4 bg-green-50 border border-green-200 rounded-md text-green-700"
          data-testid="submit-success"
        >
          Form submitted successfully!
        </div>
      )}

      {/* Form fields */}
      {fields.map((field) => (
        <FormField
          key={field.id}
          {...field}
          register={register}
          errors={errors}
          isSubmitting={isSubmitting}
        />
      ))}

      {/* Submit button */}
      <div className="pt-4">
        <button
          ref={submitButtonRef}
          type="submit"
          disabled={isSubmitting || isLoading}
          className={clsx(
            'w-full px-4 py-2 text-white font-medium rounded-md transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            {
              'bg-blue-600 hover:bg-blue-700': !isSubmitting && !isLoading,
              'bg-gray-400 cursor-not-allowed': isSubmitting || isLoading,
            }
          )}
          aria-describedby={submitError ? 'submit-error' : undefined}
          data-testid="submit-button"
        >
          {isSubmitting || isLoading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Submitting...
            </span>
          ) : (
            submitText
          )}
        </button>
      </div>
    </form>
  );
};