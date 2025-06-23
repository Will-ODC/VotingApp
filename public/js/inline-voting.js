/**
 * InlineVoting - Handles AJAX-based voting functionality for polls
 * Provides real-time voting without page refresh and manages UI updates
 */
class InlineVoting {
  constructor() {
    // DOM element references
    this.pollContainers = new Map();
    this.activeRequests = new Set();
    
    // Configuration
    this.config = {
      fadeInDuration: 300,
      errorDisplayTime: 5000,
      successDisplayTime: 3000,
      minSearchOptions: 5
    };
    
    // State management
    this.userAuthenticated = this.checkAuthStatus();
  }
  
  /**
   * Initialize the voting system and set up event listeners
   */
  init() {
    // Find all poll containers on the page
    const polls = document.querySelectorAll('[data-poll-id]');
    polls.forEach(poll => {
      const pollId = poll.dataset.pollId;
      this.pollContainers.set(pollId, poll);
      this.setupPollListeners(poll);
      
      // Initialize option search if many options
      const optionCount = poll.querySelectorAll('.option-item').length;
      if (optionCount >= this.config.minSearchOptions) {
        this.initOptionSearch(pollId);
      }
    });
    
    // Set up global event delegation for dynamically loaded content
    document.addEventListener('click', this.handleGlobalClick.bind(this));
  }
  
  /**
   * Check if user is authenticated based on page elements
   * @returns {boolean} Authentication status
   */
  checkAuthStatus() {
    // Check for user-specific elements or session indicators
    const userMenu = document.querySelector('.user-menu');
    const loginLink = document.querySelector('a[href="/login"]');
    return userMenu !== null && loginLink === null;
  }
  
  /**
   * Set up event listeners for a specific poll container
   * @param {HTMLElement} pollContainer - The poll container element
   */
  setupPollListeners(pollContainer) {
    // Handle vote button clicks
    const voteButtons = pollContainer.querySelectorAll('.vote-button');
    voteButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleVoteClick(e);
      });
    });
    
    // Handle radio input changes for form-based voting
    const radioInputs = pollContainer.querySelectorAll('input[type="radio"][name^="option"]');
    radioInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        this.updateVoteButton(e.target);
      });
    });
  }
  
  /**
   * Handle global click events for delegation
   * @param {Event} e - Click event
   */
  handleGlobalClick(e) {
    // Handle auth prompt links
    if (e.target.matches('.auth-prompt a')) {
      this.handleAuthPromptClick(e);
    }
  }
  
  /**
   * Handle vote button click
   * @param {Event} e - Click event
   */
  async handleVoteClick(e) {
    const button = e.target.closest('.vote-button');
    if (!button || button.disabled) return;
    
    const pollContainer = button.closest('[data-poll-id]');
    const pollId = pollContainer.dataset.pollId;
    const isStage2 = button.classList.contains('stage2-vote');
    
    // Check authentication
    if (!this.userAuthenticated) {
      this.handleAuthRequired(pollContainer);
      return;
    }
    
    // Get selected option
    const selectedOption = this.getSelectedOption(pollContainer, isStage2);
    if (!selectedOption) {
      this.showError(pollContainer, 'Please select an option before voting');
      return;
    }
    
    // Submit vote
    await this.submitVote(pollId, selectedOption, isStage2);
  }
  
  /**
   * Get the selected option from a poll
   * @param {HTMLElement} pollContainer - Poll container
   * @param {boolean} isStage2 - Whether this is a stage 2 vote
   * @returns {string|null} Selected option ID
   */
  getSelectedOption(pollContainer, isStage2) {
    const inputName = isStage2 ? 'stage2_option' : 'option';
    const selectedInput = pollContainer.querySelector(`input[name="${inputName}"]:checked`);
    return selectedInput ? selectedInput.value : null;
  }
  
  /**
   * Update vote button state based on selection
   * @param {HTMLInputElement} input - Radio input that changed
   */
  updateVoteButton(input) {
    const pollContainer = input.closest('[data-poll-id]');
    const voteButton = pollContainer.querySelector('.vote-button');
    if (voteButton) {
      voteButton.disabled = false;
      voteButton.classList.add('ready');
    }
  }
  
  /**
   * Submit a vote via AJAX
   * @param {string} pollId - Poll ID
   * @param {string} optionId - Selected option ID
   * @param {boolean} isStage2 - Whether this is a stage 2 vote
   */
  async submitVote(pollId, optionId, isStage2 = false) {
    // Prevent duplicate submissions
    const requestKey = `${pollId}-${isStage2 ? 'stage2' : 'stage1'}`;
    if (this.activeRequests.has(requestKey)) {
      return;
    }
    
    this.activeRequests.add(requestKey);
    const pollContainer = this.pollContainers.get(pollId);
    
    try {
      // Show loading state
      this.showLoading(pollContainer, isStage2);
      
      // Determine endpoint
      const endpoint = isStage2 
        ? `/polls/${pollId}/stage2-vote`
        : `/polls/${pollId}/vote`;
      
      // Submit vote
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          option: optionId,
          stage2_option: isStage2 ? optionId : undefined
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit vote');
      }
      
      // Handle successful vote
      this.handleVoteSuccess(pollContainer, data, isStage2);
      
    } catch (error) {
      console.error('Vote submission error:', error);
      this.handleVoteError(pollContainer, error, isStage2);
    } finally {
      this.activeRequests.delete(requestKey);
      this.hideLoading(pollContainer, isStage2);
    }
  }
  
  /**
   * Handle successful vote submission
   * @param {HTMLElement} pollContainer - Poll container
   * @param {Object} data - Response data
   * @param {boolean} isStage2 - Whether this is a stage 2 vote
   */
  handleVoteSuccess(pollContainer, data, isStage2) {
    // Update UI to show results
    this.displayResults(pollContainer, data, isStage2);
    
    // Show success message
    this.showSuccess(pollContainer, 'Vote submitted successfully!');
    
    // Update user's voted status
    if (data.userVote) {
      pollContainer.dataset.userVoted = 'true';
      pollContainer.dataset.userVoteOption = data.userVote;
    }
  }
  
  /**
   * Handle vote submission error
   * @param {HTMLElement} pollContainer - Poll container
   * @param {Error} error - Error object
   * @param {boolean} isStage2 - Whether this is a stage 2 vote
   */
  handleVoteError(pollContainer, error, isStage2) {
    // Check for specific error types
    if (error.message.includes('login') || error.message.includes('authenticate')) {
      this.userAuthenticated = false;
      this.handleAuthRequired(pollContainer);
    } else {
      this.showError(pollContainer, error.message || 'Failed to submit vote. Please try again.');
    }
  }
  
  /**
   * Display voting results after submission
   * @param {HTMLElement} pollContainer - Poll container
   * @param {Object} pollData - Poll data with results
   * @param {boolean} isStage2 - Whether this is stage 2 results
   */
  displayResults(pollContainer, pollData, isStage2) {
    const resultsContainer = isStage2 
      ? pollContainer.querySelector('.stage2-results')
      : pollContainer.querySelector('.poll-results');
    
    if (!resultsContainer) {
      console.warn('Results container not found');
      return;
    }
    
    // Build results HTML
    const resultsHTML = this.buildResultsHTML(pollData, isStage2);
    
    // Fade in results
    resultsContainer.style.opacity = '0';
    resultsContainer.innerHTML = resultsHTML;
    resultsContainer.style.display = 'block';
    
    // Animate fade in
    requestAnimationFrame(() => {
      resultsContainer.style.transition = `opacity ${this.config.fadeInDuration}ms ease-in`;
      resultsContainer.style.opacity = '1';
    });
    
    // Hide voting form
    const votingForm = isStage2
      ? pollContainer.querySelector('.stage2-voting-form')
      : pollContainer.querySelector('.voting-form');
    
    if (votingForm) {
      votingForm.style.display = 'none';
    }
    
    // Update any status indicators
    this.updateStatusIndicators(pollContainer, pollData);
  }
  
  /**
   * Build HTML for results display
   * @param {Object} pollData - Poll data
   * @param {boolean} isStage2 - Whether this is stage 2
   * @returns {string} HTML string
   */
  buildResultsHTML(pollData, isStage2) {
    const options = isStage2 ? pollData.stage2Options : pollData.options;
    const totalVotes = isStage2 ? pollData.stage2TotalVotes : pollData.totalVotes;
    const userVote = pollData.userVote;
    
    let html = '<div class="results-container">';
    html += `<p class="total-votes">Total votes: ${totalVotes}</p>`;
    
    options.forEach(option => {
      const percentage = totalVotes > 0 
        ? Math.round((option.votes / totalVotes) * 100)
        : 0;
      
      const isUserChoice = userVote && userVote === option.id.toString();
      
      html += `
        <div class="result-item ${isUserChoice ? 'user-voted' : ''}">
          <div class="result-header">
            <span class="option-text">${this.escapeHtml(option.text)}</span>
            <span class="vote-count">${option.votes} votes (${percentage}%)</span>
          </div>
          <div class="result-bar">
            <div class="result-fill" style="width: ${percentage}%"></div>
          </div>
          ${isUserChoice ? '<span class="your-vote-indicator">Your vote</span>' : ''}
        </div>
      `;
    });
    
    html += '</div>';
    return html;
  }
  
  /**
   * Update status indicators after voting
   * @param {HTMLElement} pollContainer - Poll container
   * @param {Object} pollData - Poll data
   */
  updateStatusIndicators(pollContainer, pollData) {
    // Update progress bars if present
    const progressBar = pollContainer.querySelector('.approval-progress-bar');
    if (progressBar && pollData.voteThreshold) {
      const percentage = Math.min(100, (pollData.totalVotes / pollData.voteThreshold) * 100);
      const fill = progressBar.querySelector('.progress-fill');
      if (fill) {
        fill.style.width = `${percentage}%`;
      }
    }
    
    // Update vote count displays
    const voteCountElements = pollContainer.querySelectorAll('.vote-count-display');
    voteCountElements.forEach(el => {
      el.textContent = pollData.totalVotes;
    });
  }
  
  /**
   * Handle authentication required state
   * @param {HTMLElement} pollContainer - Poll container
   */
  handleAuthRequired(pollContainer) {
    // Check if auth prompt already exists
    let authPrompt = pollContainer.querySelector('.auth-prompt');
    
    if (!authPrompt) {
      authPrompt = document.createElement('div');
      authPrompt.className = 'auth-prompt';
      authPrompt.innerHTML = `
        <p>You must be logged in to vote.</p>
        <div class="auth-actions">
          <a href="/login" class="btn btn-primary">Login</a>
          <a href="/register" class="btn btn-secondary">Register</a>
        </div>
      `;
      
      // Insert after voting form
      const votingForm = pollContainer.querySelector('.voting-form');
      if (votingForm) {
        votingForm.parentNode.insertBefore(authPrompt, votingForm.nextSibling);
      }
    }
    
    // Highlight the prompt
    authPrompt.classList.add('highlight');
    setTimeout(() => authPrompt.classList.remove('highlight'), 3000);
  }
  
  /**
   * Handle auth prompt link clicks
   * @param {Event} e - Click event
   */
  handleAuthPromptClick(e) {
    // Store current page for redirect after login
    const currentUrl = window.location.href;
    sessionStorage.setItem('redirectAfterLogin', currentUrl);
  }
  
  /**
   * Initialize option search for polls with many options
   * @param {string} pollId - Poll ID
   */
  initOptionSearch(pollId) {
    const pollContainer = this.pollContainers.get(pollId);
    if (!pollContainer) return;
    
    const optionsContainer = pollContainer.querySelector('.poll-options');
    if (!optionsContainer) return;
    
    // Create search input
    const searchContainer = document.createElement('div');
    searchContainer.className = 'option-search-container';
    searchContainer.innerHTML = `
      <input type="text" 
             class="option-search" 
             placeholder="Search options..." 
             aria-label="Search poll options">
      <span class="search-icon">🔍</span>
    `;
    
    // Insert before options
    optionsContainer.parentNode.insertBefore(searchContainer, optionsContainer);
    
    // Set up search functionality
    const searchInput = searchContainer.querySelector('.option-search');
    searchInput.addEventListener('input', (e) => {
      this.filterOptions(pollContainer, e.target.value);
    });
    
    // Clear search on escape
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.target.value = '';
        this.filterOptions(pollContainer, '');
      }
    });
  }
  
  /**
   * Filter poll options based on search query
   * @param {HTMLElement} pollContainer - Poll container
   * @param {string} query - Search query
   */
  filterOptions(pollContainer, query) {
    const options = pollContainer.querySelectorAll('.option-item');
    const normalizedQuery = query.toLowerCase().trim();
    let visibleCount = 0;
    
    options.forEach(option => {
      const optionText = option.textContent.toLowerCase();
      const matches = normalizedQuery === '' || optionText.includes(normalizedQuery);
      
      option.style.display = matches ? '' : 'none';
      
      if (matches) {
        visibleCount++;
        
        // Highlight matching text
        if (normalizedQuery !== '') {
          this.highlightText(option, normalizedQuery);
        } else {
          this.removeHighlight(option);
        }
      }
    });
    
    // Show/hide no results message
    this.updateNoResultsMessage(pollContainer, visibleCount, normalizedQuery);
  }
  
  /**
   * Highlight matching text in option
   * @param {HTMLElement} option - Option element
   * @param {string} query - Search query
   */
  highlightText(option, query) {
    const label = option.querySelector('label');
    if (!label) return;
    
    const text = label.textContent;
    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
    const highlighted = text.replace(regex, '<mark>$1</mark>');
    
    // Preserve input element
    const input = option.querySelector('input');
    label.innerHTML = highlighted;
    if (input) {
      label.insertBefore(input, label.firstChild);
    }
  }
  
  /**
   * Remove highlight from option
   * @param {HTMLElement} option - Option element
   */
  removeHighlight(option) {
    const label = option.querySelector('label');
    if (!label) return;
    
    const text = label.textContent;
    const input = option.querySelector('input');
    label.textContent = text;
    if (input) {
      label.insertBefore(input, label.firstChild);
    }
  }
  
  /**
   * Update no results message
   * @param {HTMLElement} pollContainer - Poll container
   * @param {number} visibleCount - Number of visible options
   * @param {string} query - Search query
   */
  updateNoResultsMessage(pollContainer, visibleCount, query) {
    let noResultsMsg = pollContainer.querySelector('.no-results-message');
    
    if (visibleCount === 0 && query !== '') {
      if (!noResultsMsg) {
        noResultsMsg = document.createElement('div');
        noResultsMsg.className = 'no-results-message';
        const optionsContainer = pollContainer.querySelector('.poll-options');
        optionsContainer.appendChild(noResultsMsg);
      }
      noResultsMsg.textContent = `No options match "${query}"`;
      noResultsMsg.style.display = 'block';
    } else if (noResultsMsg) {
      noResultsMsg.style.display = 'none';
    }
  }
  
  /**
   * Show loading state
   * @param {HTMLElement} pollContainer - Poll container
   * @param {boolean} isStage2 - Whether this is stage 2
   */
  showLoading(pollContainer, isStage2) {
    const button = pollContainer.querySelector(isStage2 ? '.stage2-vote' : '.vote-button');
    if (button) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = 'Submitting...';
      button.classList.add('loading');
    }
  }
  
  /**
   * Hide loading state
   * @param {HTMLElement} pollContainer - Poll container
   * @param {boolean} isStage2 - Whether this is stage 2
   */
  hideLoading(pollContainer, isStage2) {
    const button = pollContainer.querySelector(isStage2 ? '.stage2-vote' : '.vote-button');
    if (button && button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
      button.classList.remove('loading');
      delete button.dataset.originalText;
    }
  }
  
  /**
   * Show success message
   * @param {HTMLElement} pollContainer - Poll container
   * @param {string} message - Success message
   */
  showSuccess(pollContainer, message) {
    this.showMessage(pollContainer, message, 'success', this.config.successDisplayTime);
  }
  
  /**
   * Show error message
   * @param {HTMLElement} pollContainer - Poll container
   * @param {string} message - Error message
   */
  showError(pollContainer, message) {
    this.showMessage(pollContainer, message, 'error', this.config.errorDisplayTime);
  }
  
  /**
   * Show a temporary message
   * @param {HTMLElement} pollContainer - Poll container
   * @param {string} message - Message text
   * @param {string} type - Message type (success/error)
   * @param {number} duration - Display duration in ms
   */
  showMessage(pollContainer, message, type, duration) {
    // Remove existing messages
    const existing = pollContainer.querySelector('.voting-message');
    if (existing) {
      existing.remove();
    }
    
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `voting-message voting-message-${type}`;
    messageEl.textContent = message;
    
    // Insert at top of container
    pollContainer.insertBefore(messageEl, pollContainer.firstChild);
    
    // Fade in
    requestAnimationFrame(() => {
      messageEl.classList.add('show');
    });
    
    // Auto remove
    setTimeout(() => {
      messageEl.classList.remove('show');
      setTimeout(() => messageEl.remove(), 300);
    }, duration);
  }
  
  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Escape regex special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const voting = new InlineVoting();
  voting.init();
});

// Export for use in other modules if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InlineVoting;
}