describe('Production Workflow E2E', () => {
  beforeEach(() => {
    // Reset database state
    cy.task('db:seed');
    
    // Login with test user
    cy.login('test@example.com', 'password123');
  });

  it('Complete workflow: Create proposal → Get pricing → Send for signature → Collaborate', () => {
    // Step 1: Create a new proposal
    cy.visit('/proposals/new');
    
    cy.get('[data-cy=proposal-title]').type('Web Development Project');
    cy.get('[data-cy=client-email]').type('client@example.com');
    cy.get('[data-cy=industry-select]').select('web-development');
    cy.get('[data-cy=project-type-select]').select('website');
    
    // Step 2: Get market pricing suggestions
    cy.get('[data-cy=get-pricing-btn]').click();
    cy.get('[data-cy=pricing-loader]').should('be.visible');
    cy.get('[data-cy=pricing-results]').should('be.visible');
    cy.get('[data-cy=suggested-rate]').should('contain', '$');
    
    // Select competitive pricing
    cy.get('[data-cy=pricing-option-competitive]').click();
    
    // Step 3: Generate AI contract
    cy.get('[data-cy=generate-contract-btn]').click();
    cy.get('[data-cy=ai-generation-loader]').should('be.visible');
    cy.get('[data-cy=contract-preview]', { timeout: 10000 }).should('be.visible');
    
    // Step 4: Save proposal
    cy.get('[data-cy=save-proposal-btn]').click();
    cy.get('[data-cy=success-message]').should('contain', 'Proposal created successfully');
    
    // Get the proposal ID from URL
    cy.url().then((url) => {
      const proposalId = url.split('/').pop();
      
      // Step 5: Send for signature
      cy.get('[data-cy=send-signature-btn]').click();
      cy.get('[data-cy=signer-email]').type('client@example.com');
      cy.get('[data-cy=signer-name]').type('John Client');
      cy.get('[data-cy=send-for-signature-confirm]').click();
      
      cy.get('[data-cy=signature-success]').should('be.visible');
      cy.get('[data-cy=envelope-id]').should('exist');
      
      // Step 6: Test collaboration features
      cy.visit(`/contracts/${proposalId}`);
      
      // Add a comment to a clause
      cy.get('[data-cy=clause-1]').click();
      cy.get('[data-cy=add-comment-btn]').click();
      cy.get('[data-cy=comment-input]').type('Please review this clause carefully');
      cy.get('[data-cy=submit-comment-btn]').click();
      
      cy.get('[data-cy=comment-list]').should('contain', 'Please review this clause carefully');
      
      // Test real-time updates (simulate another user)
      cy.window().its('socket').invoke('emit', 'comment_added', {
        documentId: proposalId,
        clauseIdentifier: 'clause-1',
        comment: {
          id: 'test-comment-2',
          content: 'I agree with this change',
          author: { name: 'Jane Doe' }
        }
      });
      
      cy.get('[data-cy=comment-list]').should('contain', 'I agree with this change');
    });
  });

  it('Offline functionality test', () => {
    // Test offline proposal creation
    cy.visit('/proposals/new');
    
    // Simulate going offline
    cy.window().then((win) => {
      win.navigator.onLine = false;
      win.dispatchEvent(new Event('offline'));
    });
    
    // Create proposal while offline
    cy.get('[data-cy=proposal-title]').type('Offline Proposal');
    cy.get('[data-cy=client-email]').type('offline@example.com');
    cy.get('[data-cy=description]').type('This proposal was created offline');
    
    cy.get('[data-cy=save-proposal-btn]').click();
    cy.get('[data-cy=offline-indicator]').should('be.visible');
    cy.get('[data-cy=offline-message]').should('contain', 'Saved locally');
    
    // Simulate coming back online
    cy.window().then((win) => {
      win.navigator.onLine = true;
      win.dispatchEvent(new Event('online'));
    });
    
    // Verify sync
    cy.get('[data-cy=sync-indicator]').should('be.visible');
    cy.get('[data-cy=sync-success]', { timeout: 5000 }).should('be.visible');
  });

  it('Language switching and RTL support', () => {
    // Test English (default)
    cy.visit('/dashboard');
    cy.get('[data-cy=navigation-proposals]').should('contain', 'Proposals');
    
    // Switch to Arabic
    cy.get('[data-cy=language-switcher]').click();
    cy.get('[data-cy=language-ar]').click();
    
    // Verify Arabic content and RTL layout
    cy.get('[data-cy=navigation-proposals]').should('contain', 'العروض');
    cy.get('html').should('have.attr', 'dir', 'rtl');
    cy.get('body').should('have.css', 'direction', 'rtl');
    
    // Test form in Arabic
    cy.visit('/proposals/new');
    cy.get('[data-cy=proposal-title-label]').should('contain', 'عنوان العرض');
    cy.get('[data-cy=client-email-label]').should('contain', 'بريد العميل');
    
    // Switch back to English
    cy.get('[data-cy=language-switcher]').click();
    cy.get('[data-cy=language-en]').click();
    
    cy.get('[data-cy=proposal-title-label]').should('contain', 'Proposal Title');
    cy.get('html').should('have.attr', 'dir', 'ltr');
  });

  it('PWA installation and offline capabilities', () => {
    // Test PWA manifest
    cy.visit('/');
    cy.get('head link[rel="manifest"]').should('exist');
    
    // Test service worker registration
    cy.window().its('navigator.serviceWorker').should('exist');
    
    // Simulate PWA install prompt
    cy.window().then((win) => {
      const event = new Event('beforeinstallprompt');
      win.dispatchEvent(event);
    });
    
    // Test offline functionality
    cy.visit('/proposals');
    
    // Go offline
    cy.window().then((win) => {
      win.navigator.onLine = false;
      win.dispatchEvent(new Event('offline'));
    });
    
    // Verify offline indicator
    cy.get('[data-cy=offline-banner]').should('be.visible');
    cy.get('[data-cy=offline-banner]').should('contain', 'Working Offline');
    
    // Try to create proposal offline
    cy.get('[data-cy=new-proposal-btn]').click();
    cy.url().should('include', '/proposals/new');
    
    // Verify offline storage is working
    cy.get('[data-cy=proposal-title]').type('Offline Test Proposal');
    cy.get('[data-cy=save-proposal-btn]').click();
    cy.get('[data-cy=offline-save-indicator]').should('be.visible');
  });

  it('Real-time collaboration stress test', () => {
    cy.visit('/proposals/new');
    
    // Create a proposal first
    cy.get('[data-cy=proposal-title]').type('Collaboration Test');
    cy.get('[data-cy=client-email]').type('collab@example.com');
    cy.get('[data-cy=save-proposal-btn]').click();
    
    cy.url().then((url) => {
      const proposalId = url.split('/').pop();
      
      // Navigate to contract view
      cy.visit(`/contracts/${proposalId}`);
      
      // Simulate multiple users joining
      cy.window().its('socket').invoke('emit', 'join_document', {
        documentId: proposalId,
        userId: 'user-1'
      });
      
      cy.window().its('socket').invoke('emit', 'join_document', {
        documentId: proposalId,
        userId: 'user-2'
      });
      
      // Verify active users indicator
      cy.get('[data-cy=active-users]').should('contain', '3'); // Current user + 2 simulated
      
      // Test rapid commenting
      for (let i = 0; i < 5; i++) {
        cy.get('[data-cy=clause-1]').click();
        cy.get('[data-cy=add-comment-btn]').click();
        cy.get('[data-cy=comment-input]').type(`Rapid comment ${i + 1}`);
        cy.get('[data-cy=submit-comment-btn]').click();
        cy.wait(100);
      }
      
      // Verify all comments are displayed
      cy.get('[data-cy=comment-list] .comment').should('have.length', 5);
      
      // Test typing indicators
      cy.get('[data-cy=comment-input]').focus().type('T');
      cy.get('[data-cy=typing-indicator]').should('be.visible');
      
      // Simulate other user typing
      cy.window().its('socket').invoke('emit', 'user_typing', {
        userId: 'user-1',
        clauseIdentifier: 'clause-1',
        isTyping: true
      });
      
      cy.get('[data-cy=user-typing-indicator]').should('contain', 'user-1 is typing');
    });
  });

  it('Market pricing integration accuracy', () => {
    cy.visit('/proposals/new');
    
    // Test different industry/project combinations
    const testCases = [
      { industry: 'web-development', project: 'website', expectedRange: [50, 150] },
      { industry: 'ai-ml', project: 'model-training', expectedRange: [80, 200] },
      { industry: 'design', project: 'branding', expectedRange: [40, 120] }
    ];
    
    testCases.forEach((testCase, index) => {
      cy.get('[data-cy=industry-select]').select(testCase.industry);
      cy.get('[data-cy=project-type-select]').select(testCase.project);
      cy.get('[data-cy=get-pricing-btn]').click();
      
      cy.get('[data-cy=pricing-results]').should('be.visible');
      
      // Verify pricing is within expected range
      cy.get('[data-cy=hourly-rate-min]').invoke('text').then((minText) => {
        const min = parseInt(minText.replace(/\D/g, ''));
        expect(min).to.be.gte(testCase.expectedRange[0]);
      });
      
      cy.get('[data-cy=hourly-rate-max]').invoke('text').then((maxText) => {
        const max = parseInt(maxText.replace(/\D/g, ''));
        expect(max).to.be.lte(testCase.expectedRange[1]);
      });
      
      // Test experience level adjustments
      cy.get('[data-cy=experience-level]').select('senior');
      cy.get('[data-cy=get-pricing-btn]').click();
      
      cy.get('[data-cy=suggested-rate]').invoke('text').then((seniorRate) => {
        // Reset to mid level
        cy.get('[data-cy=experience-level]').select('mid');
        cy.get('[data-cy=get-pricing-btn]').click();
        
        cy.get('[data-cy=suggested-rate]').invoke('text').then((midRate) => {
          const seniorPrice = parseInt(seniorRate.replace(/\D/g, ''));
          const midPrice = parseInt(midRate.replace(/\D/g, ''));
          expect(seniorPrice).to.be.gt(midPrice);
        });
      });
    });
  });

  it('Error handling and recovery', () => {
    // Test network error handling
    cy.intercept('POST', '/api/market-pricing/rates', { forceNetworkError: true });
    
    cy.visit('/proposals/new');
    cy.get('[data-cy=industry-select]').select('web-development');
    cy.get('[data-cy=project-type-select]').select('website');
    cy.get('[data-cy=get-pricing-btn]').click();
    
    // Verify error handling
    cy.get('[data-cy=pricing-error]').should('be.visible');
    cy.get('[data-cy=pricing-error]').should('contain', 'Unable to fetch current rates');
    cy.get('[data-cy=retry-pricing-btn]').should('be.visible');
    
    // Test recovery
    cy.intercept('POST', '/api/market-pricing/rates', { fixture: 'market-pricing.json' });
    cy.get('[data-cy=retry-pricing-btn]').click();
    cy.get('[data-cy=pricing-results]').should('be.visible');
    
    // Test signature error handling
    cy.intercept('POST', '/api/documents/*/send-for-signature', { statusCode: 500 });
    
    cy.get('[data-cy=proposal-title]').type('Error Test');
    cy.get('[data-cy=save-proposal-btn]').click();
    cy.get('[data-cy=send-signature-btn]').click();
    cy.get('[data-cy=signer-email]').type('error@example.com');
    cy.get('[data-cy=send-for-signature-confirm]').click();
    
    cy.get('[data-cy=signature-error]').should('be.visible');
    cy.get('[data-cy=signature-error]').should('contain', 'Failed to send for signature');
  });

  afterEach(() => {
    // Clean up any test data
    cy.task('db:cleanup');
  });
});