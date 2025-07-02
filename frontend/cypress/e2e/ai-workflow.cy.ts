describe('AI Workflow E2E Test', () => {
  beforeEach(() => {
    // Login and setup
    cy.visit('/auth/login');
    cy.get('[data-testid="email"]').type('test@example.com');
    cy.get('[data-testid="password"]').type('password123');
    cy.get('[data-testid="login-button"]').click();
    
    // Wait for login to complete
    cy.url().should('include', '/dashboard');
  });

  it('should complete the full AI workflow: generate draft → review → store result', () => {
    // Navigate to AI contract generation
    cy.get('[data-testid="nav-ai"]').click();
    cy.url().should('include', '/ai');

    // Step 1: Generate Contract Draft
    cy.get('[data-testid="contract-type"]').select('Service Agreement');
    cy.get('[data-testid="party-1"]').type('Company ABC Inc.');
    cy.get('[data-testid="party-2"]').type('Contractor XYZ LLC');
    cy.get('[data-testid="key-terms"]').type('payment terms, deliverables, intellectual property');
    cy.get('[data-testid="jurisdiction"]').select('New York');
    cy.get('[data-testid="custom-instructions"]').type('Include confidentiality clauses and termination procedures');

    // Submit contract generation request
    cy.get('[data-testid="generate-contract"]').click();

    // Wait for contract generation to complete
    cy.get('[data-testid="contract-content"]', { timeout: 30000 }).should('be.visible');
    cy.get('[data-testid="contract-content"]').should('contain', 'Service Agreement');
    cy.get('[data-testid="contract-content"]').should('contain', 'Company ABC Inc.');
    
    // Verify contract metadata
    cy.get('[data-testid="word-count"]').should('be.visible');
    cy.get('[data-testid="generated-at"]').should('be.visible');
    cy.get('[data-testid="token-usage"]').should('be.visible');

    // Save the generated contract text for review
    cy.get('[data-testid="contract-content"]').invoke('text').as('contractText');

    // Step 2: Review Contract with LawGeex
    cy.get('[data-testid="review-contract"]').click();

    // Configure review options
    cy.get('[data-testid="document-type"]').select('contract');
    cy.get('[data-testid="priority"]').select('high');
    cy.get('[data-testid="include-suggestions"]').check();

    // Submit for review
    cy.get('[data-testid="submit-review"]').click();

    // Wait for review to complete
    cy.get('[data-testid="review-results"]', { timeout: 60000 }).should('be.visible');
    
    // Verify review results
    cy.get('[data-testid="overall-score"]').should('be.visible');
    cy.get('[data-testid="issues-list"]').should('be.visible');
    cy.get('[data-testid="issues-summary"]').should('be.visible');

    // Check for different types of issues
    cy.get('[data-testid="high-risk-count"]').should('be.visible');
    cy.get('[data-testid="medium-risk-count"]').should('be.visible');
    cy.get('[data-testid="low-risk-count"]').should('be.visible');

    // Step 3: Store Result
    cy.get('[data-testid="save-results"]').click();

    // Fill in document metadata
    cy.get('[data-testid="document-name"]').type('AI Generated Service Agreement - Test');
    cy.get('[data-testid="document-description"]').type('Generated and reviewed contract for testing purposes');

    // Save to document library
    cy.get('[data-testid="save-document"]').click();

    // Verify success message
    cy.get('[data-testid="success-message"]').should('contain', 'Contract saved successfully');

    // Step 4: Verify Storage in Documents
    cy.visit('/documents');
    
    // Check that the document appears in the list
    cy.get('[data-testid="documents-list"]').should('contain', 'AI Generated Service Agreement - Test');
    
    // Click on the document to view details
    cy.get('[data-testid="document-item"]').first().click();
    
    // Verify document details
    cy.get('[data-testid="document-content"]').should('be.visible');
    cy.get('[data-testid="review-data"]').should('be.visible');
    cy.get('[data-testid="generation-metadata"]').should('be.visible');

    // Step 5: Test Analytics Tracking
    cy.visit('/analytics');
    
    // Verify that AI operations are tracked
    cy.get('[data-testid="ai-operations-count"]').should('contain', '2'); // Generation + Review
    cy.get('[data-testid="contracts-generated"]').should('contain', '1');
    cy.get('[data-testid="contracts-reviewed"]').should('contain', '1');
  });

  it('should handle API errors gracefully', () => {
    // Navigate to AI contract generation
    cy.visit('/ai');

    // Mock API error for contract generation
    cy.intercept('POST', '/api/v1/ai/draft-contract', {
      statusCode: 500,
      body: { message: 'OpenAI service temporarily unavailable' }
    }).as('generateContractError');

    // Fill form with invalid data
    cy.get('[data-testid="contract-type"]').select('Service Agreement');
    cy.get('[data-testid="party-1"]').type('Test Party');

    // Submit contract generation request
    cy.get('[data-testid="generate-contract"]').click();

    // Wait for error response
    cy.wait('@generateContractError');

    // Verify error handling
    cy.get('[data-testid="error-message"]').should('be.visible');
    cy.get('[data-testid="error-message"]').should('contain', 'OpenAI service temporarily unavailable');

    // Verify retry button is available
    cy.get('[data-testid="retry-button"]').should('be.visible');
  });

  it('should validate form inputs', () => {
    cy.visit('/ai');

    // Try to submit without required fields
    cy.get('[data-testid="generate-contract"]').click();

    // Verify validation errors
    cy.get('[data-testid="contract-type-error"]').should('contain', 'Contract type is required');
    cy.get('[data-testid="parties-error"]').should('contain', 'At least two parties are required');
    cy.get('[data-testid="key-terms-error"]').should('contain', 'Key terms are required');
    cy.get('[data-testid="jurisdiction-error"]').should('contain', 'Jurisdiction is required');
  });

  it('should support contract analysis workflow', () => {
    cy.visit('/ai');

    // Switch to analysis tab
    cy.get('[data-testid="analysis-tab"]').click();

    // Paste existing contract text
    const sampleContract = `
      This Service Agreement is entered into between Company ABC Inc. and Contractor XYZ LLC.
      The contractor agrees to provide software development services as outlined in Exhibit A.
      Payment shall be made within 30 days of invoice receipt.
    `;

    cy.get('[data-testid="contract-text"]').type(sampleContract);

    // Submit for analysis
    cy.get('[data-testid="analyze-contract"]').click();

    // Wait for analysis results
    cy.get('[data-testid="analysis-results"]', { timeout: 30000 }).should('be.visible');

    // Verify analysis components
    cy.get('[data-testid="clarity-score"]').should('be.visible');
    cy.get('[data-testid="suggestions-list"]').should('be.visible');
    cy.get('[data-testid="risk-factors-list"]').should('be.visible');
    cy.get('[data-testid="analysis-summary"]').should('be.visible');

    // Verify score is a number between 1-10
    cy.get('[data-testid="clarity-score"]').invoke('text').then((score) => {
      const numericScore = parseFloat(score);
      expect(numericScore).to.be.at.least(1);
      expect(numericScore).to.be.at.most(10);
    });
  });

  it('should show loading states during AI operations', () => {
    cy.visit('/ai');

    // Fill form
    cy.get('[data-testid="contract-type"]').select('Service Agreement');
    cy.get('[data-testid="party-1"]').type('Company A');
    cy.get('[data-testid="party-2"]').type('Company B');
    cy.get('[data-testid="key-terms"]').type('payment, delivery');
    cy.get('[data-testid="jurisdiction"]').select('California');

    // Submit and verify loading state
    cy.get('[data-testid="generate-contract"]').click();
    
    // Check loading indicators
    cy.get('[data-testid="loading-spinner"]').should('be.visible');
    cy.get('[data-testid="loading-message"]').should('contain', 'Generating contract');
    cy.get('[data-testid="generate-contract"]').should('be.disabled');

    // Wait for completion
    cy.get('[data-testid="contract-content"]', { timeout: 30000 }).should('be.visible');
    cy.get('[data-testid="loading-spinner"]').should('not.exist');
    cy.get('[data-testid="generate-contract"]').should('be.enabled');
  });

  it('should allow cancellation of long-running operations', () => {
    cy.visit('/ai');

    // Fill form
    cy.get('[data-testid="contract-type"]').select('Service Agreement');
    cy.get('[data-testid="party-1"]').type('Company A');
    cy.get('[data-testid="party-2"]').type('Company B');
    cy.get('[data-testid="key-terms"]').type('payment, delivery');
    cy.get('[data-testid="jurisdiction"]').select('California');

    // Submit operation
    cy.get('[data-testid="generate-contract"]').click();
    
    // Verify cancel button appears
    cy.get('[data-testid="cancel-operation"]').should('be.visible');
    
    // Cancel the operation
    cy.get('[data-testid="cancel-operation"]').click();
    
    // Verify cancellation
    cy.get('[data-testid="operation-cancelled"]').should('be.visible');
    cy.get('[data-testid="loading-spinner"]').should('not.exist');
    cy.get('[data-testid="generate-contract"]').should('be.enabled');
  });
});