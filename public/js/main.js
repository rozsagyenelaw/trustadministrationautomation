// public/js/main.js
// Law Offices of Rozsa Gyene - Trust Administration Automation System

// Main Application Controller
const TrustAdminApp = {
  // API Base URL (will be set based on environment)
  apiUrl: window.location.hostname === 'localhost' 
    ? 'http://localhost:8888/.netlify/functions' 
    : '/.netlify/functions',
  
  // Current case data
  currentCase: null,
  
  // Initialize the application
  init: function() {
    console.log('Trust Administration System Initializing...');
    this.setupEventListeners();
    this.loadActiveCases();
    this.checkDeadlines();
  },
  
  // Setup all event listeners
  setupEventListeners: function() {
    // New case form
    const newCaseBtn = document.getElementById('new-case-btn');
    if (newCaseBtn) {
      newCaseBtn.addEventListener('click', () => this.showNewCaseModal());
    }
    
    // Modal close buttons
    document.querySelectorAll('.modal-close, .btn-cancel').forEach(btn => {
      btn.addEventListener('click', () => this.closeModal());
    });
    
    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal();
        }
      });
    });
    
    // Generate documents buttons
    document.querySelectorAll('.generate-doc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.generateDocument(e.target.dataset.docType));
    });
    
    // Search functionality
    const searchInput = document.getElementById('case-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.searchCases(e.target.value));
    }
    
    // Form submissions
    const caseForm = document.getElementById('new-case-form');
    if (caseForm) {
      caseForm.addEventListener('submit', (e) => this.handleNewCase(e));
    }
  },
  
  // Create a new case
  handleNewCase: async function(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const caseData = Object.fromEntries(formData.entries());
    
    // Show loading
    this.showLoading('Creating new case...');
    
    try {
      const response = await fetch(`${this.apiUrl}/create-trust-case`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(caseData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.showSuccess(`Case ${result.case_number} created successfully!`);
        this.currentCase = result;
        this.updateDashboard(result);
        this.closeModal();
        
        // Create Google Drive folder
        await this.createDriveFolder(result.case_number, caseData.decedent_name);
        
        // Add to Google Sheets
        await this.addToSheets(result);
        
        // Refresh cases list
        this.loadActiveCases();
      } else {
        this.showError('Failed to create case: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating case:', error);
      this.showError('Failed to create case. Please try again.');
    } finally {
      this.hideLoading();
    }
  },
  
  // Generate a document
  generateDocument: async function(docType) {
    if (!this.currentCase) {
      this.showError('Please select or create a case first');
      return;
    }
    
    this.showLoading(`Generating ${docType}...`);
    
    try {
      // Determine which endpoint to use based on document type
      let endpoint = '';
      let requestData = { ...this.currentCase };
      
      switch(docType) {
        case '60_day_notice':
        case 'receipt_distributee':
        case 'waiver_accounting':
          endpoint = 'generate-trust-documents';
          requestData.generate_60day_notice = docType === '60_day_notice';
          requestData.generate_receipt = docType === 'receipt_distributee';
          requestData.generate_waiver = docType === 'waiver_accounting';
          break;
          
        case 'government_notices':
          endpoint = 'generate-government-notices';
          requestData.generate_all = true;
          break;
          
        case 'distribution_package':
          endpoint = 'generate-distribution-docs';
          requestData.generate_all = true;
          break;
          
        case 'property_docs':
          endpoint = 'generate-property-documents';
          requestData.generate_affidavit = true;
          requestData.generate_trust_deed = true;
          requestData.generate_certification = true;
          break;
          
        case 'tax_forms':
          endpoint = 'fill-official-boe-forms-complete';
          requestData.generate_pcor = true;
          requestData.generate_502d = true;
          requestData.generate_19p = true;
          break;
          
        default:
          throw new Error('Unknown document type');
      }
      
      const response = await fetch(`${this.apiUrl}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      const result = await response.json();
      
      if (result.success && result.documents) {
        // Upload to Google Drive
        await this.uploadToDrive(result.documents);
        
        // Download documents
        this.downloadDocuments(result.documents);
        
        this.showSuccess(`${docType} generated successfully!`);
        
        // Update Sheets tracking
        await this.recordDocumentGeneration(docType);
      } else {
        this.showError('Failed to generate document: ' + result.error);
      }
    } catch (error) {
      console.error('Error generating document:', error);
      this.showError('Failed to generate document. Please try again.');
    } finally {
      this.hideLoading();
    }
  },
  
  // Download generated documents
  downloadDocuments: function(documents) {
    Object.entries(documents).forEach(([docName, base64Data]) => {
      // Create blob from base64
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.currentCase.case_number}_${docName}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    });
  },
  
  // Upload documents to Google Drive
  uploadToDrive: async function(documents) {
    try {
      const response = await fetch(`${this.apiUrl}/google-drive-integration/batch-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          case_number: this.currentCase.case_number,
          documents: documents
        })
      });
      
      const result = await response.json();
      console.log('Documents uploaded to Drive:', result);
    } catch (error) {
      console.error('Error uploading to Drive:', error);
    }
  },
  
  // Create Google Drive folder for case
  createDriveFolder: async function(caseNumber, decedentName) {
    try {
      const response = await fetch(`${this.apiUrl}/google-drive-integration/create-case-folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          case_number: caseNumber,
          decedent_name: decedentName
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('Drive folder created:', result.case_folder_link);
      }
    } catch (error) {
      console.error('Error creating Drive folder:', error);
    }
  },
  
  // Add case to Google Sheets
  addToSheets: async function(caseData) {
    try {
      const response = await fetch(`${this.apiUrl}/google-sheets-integration/create-case`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(caseData)
      });
      
      const result = await response.json();
      console.log('Case added to Sheets:', result);
    } catch (error) {
      console.error('Error adding to Sheets:', error);
    }
  },
  
  // Record document generation in Sheets
  recordDocumentGeneration: async function(docType) {
    try {
      await fetch(`${this.apiUrl}/google-sheets-integration/record-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          case_number: this.currentCase.case_number,
          document_type: docType,
          drive_link: '' // Will be filled by Drive integration
        })
      });
    } catch (error) {
      console.error('Error recording document generation:', error);
    }
  },
  
  // Load active cases
  loadActiveCases: async function() {
    try {
      const response = await fetch(`${this.apiUrl}/google-sheets-integration/active-cases`);
      const cases = await response.json();
      
      this.displayCases(cases);
    } catch (error) {
      console.error('Error loading cases:', error);
      // Display empty table if error
      this.displayCases([]);
    }
  },
  
  // Display cases in table
  displayCases: function(cases) {
    const tbody = document.querySelector('#cases-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!cases || cases.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No cases found</td></tr>';
      return;
    }
    
    cases.forEach(caseData => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${caseData.case_number || ''}</td>
        <td>${caseData.decedent_name || ''}</td>
        <td>${caseData.trustee_name || ''}</td>
        <td><span class="badge badge-${this.getStatusClass(caseData.status)}">${caseData.status || 'Active'}</span></td>
        <td>${this.formatDate(caseData['60_day_deadline'])}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="TrustAdminApp.selectCase('${caseData.case_number}')">
            Select
          </button>
        </td>
      `;
    });
  },
  
  // Select a case to work with
  selectCase: async function(caseNumber) {
    try {
      const response = await fetch(`${this.apiUrl}/google-sheets-integration/get-case?case_number=${caseNumber}`);
      const caseData = await response.json();
      
      this.currentCase = caseData;
      this.updateDashboard(caseData);
      this.showSuccess(`Case ${caseNumber} selected`);
    } catch (error) {
      console.error('Error selecting case:', error);
      this.showError('Failed to load case data');
    }
  },
  
  // Update dashboard with case info
  updateDashboard: function(caseData) {
    const dashboard = document.getElementById('case-dashboard');
    if (!dashboard) return;
    
    dashboard.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Current Case: ${caseData.case_number}</h3>
        </div>
        <div class="card-body">
          <p><strong>Decedent:</strong> ${caseData.decedent_name}</p>
          <p><strong>Death Date:</strong> ${this.formatDate(caseData.death_date)}</p>
          <p><strong>Trust:</strong> ${caseData.trust_name}</p>
          <p><strong>Trustee:</strong> ${caseData.trustee_name}</p>
          <p><strong>Status:</strong> <span class="badge badge-${this.getStatusClass(caseData.status)}">${caseData.status}</span></p>
        </div>
        <div class="card-footer">
          <div class="btn-group">
            <button class="btn btn-primary generate-doc-btn" data-doc-type="60_day_notice">60-Day Notice</button>
            <button class="btn btn-primary generate-doc-btn" data-doc-type="government_notices">Government Notices</button>
            <button class="btn btn-primary generate-doc-btn" data-doc-type="distribution_package">Distribution Docs</button>
            <button class="btn btn-primary generate-doc-btn" data-doc-type="property_docs">Property Documents</button>
            <button class="btn btn-primary generate-doc-btn" data-doc-type="tax_forms">Tax Forms</button>
          </div>
        </div>
      </div>
    `;
    
    // Re-attach event listeners for new buttons
    dashboard.querySelectorAll('.generate-doc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.generateDocument(e.target.dataset.docType));
    });
  },
  
  // Check upcoming deadlines
  checkDeadlines: async function() {
    try {
      const response = await fetch(`${this.apiUrl}/google-sheets-integration/upcoming-deadlines?days=30`);
      const deadlines = await response.json();
      
      this.displayDeadlines(deadlines);
    } catch (error) {
      console.error('Error checking deadlines:', error);
      this.displayDeadlines([]);
    }
  },
  
  // Display upcoming deadlines
  displayDeadlines: function(deadlines) {
    const container = document.getElementById('deadlines-container');
    if (!container) return;
    
    if (!deadlines || deadlines.length === 0) {
      container.innerHTML = '<p>No upcoming deadlines in the next 30 days.</p>';
      return;
    }
    
    let html = '<ul class="deadline-list">';
    deadlines.forEach(deadline => {
      const urgency = deadline.days_remaining <= 7 ? 'danger' : 
                     deadline.days_remaining <= 14 ? 'warning' : 'info';
      
      html += `
        <li class="deadline-item">
          <span class="badge badge-${urgency}">${deadline.days_remaining} days</span>
          <strong>${deadline.case_number}</strong> - ${deadline.deadline_type}
          <br><small>Due: ${this.formatDate(deadline.due_date)}</small>
        </li>
      `;
    });
    html += '</ul>';
    
    container.innerHTML = html;
  },
  
  // Search cases
  searchCases: function(query) {
    const rows = document.querySelectorAll('#cases-table tbody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
  },
  
  // Modal Functions - UPDATED WITH SCROLL LOCK
  showModal: function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('show');
      document.body.classList.add('modal-open'); // Lock body scroll
    }
  },
  
  closeModal: function() {
    document.querySelectorAll('.modal.show').forEach(modal => {
      modal.classList.remove('show');
    });
    document.body.classList.remove('modal-open'); // Unlock body scroll
  },
  
  showNewCaseModal: function() {
    this.showModal('new-case-modal');
  },
  
  // Loading overlay
  showLoading: function(message = 'Loading...') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="text-center">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `;
    document.body.appendChild(overlay);
  },
  
  hideLoading: function() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) overlay.remove();
  },
  
  // Alert functions
  showSuccess: function(message) {
    this.showAlert(message, 'success');
  },
  
  showError: function(message) {
    this.showAlert(message, 'danger');
  },
  
  showAlert: function(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    const container = document.getElementById('alerts-container');
    if (container) {
      container.appendChild(alertDiv);
    } else {
      // If no alerts container, prepend to body
      document.body.prepend(alertDiv);
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => alertDiv.remove(), 5000);
  },
  
  // Utility Functions
  formatDate: function(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US');
  },
  
  getStatusClass: function(status) {
    if (!status) return 'info';
    switch(status.toLowerCase()) {
      case 'active': return 'info';
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'archived': return 'secondary';
      default: return 'info';
    }
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  TrustAdminApp.init();
});

// Export for use in other scripts if needed
window.TrustAdminApp = TrustAdminApp;
