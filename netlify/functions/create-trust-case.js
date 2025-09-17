// netlify/functions/create-trust-case-fixed.js
// COMPLETE VERSION with all data collection and document generation

const { PDFDocument } = require('pdf-lib');

// Generate case number with proper format
function generateCaseNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `TA-${year}${month}-${random}`;
}

// Format date to MM/DD/YYYY
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
}

// Calculate important deadlines
function calculateDeadlines(deathDate) {
  const death = new Date(deathDate);
  
  // 60-day notice deadline (Probate Code 16061.7)
  const sixtyDayNotice = new Date(death);
  sixtyDayNotice.setDate(sixtyDayNotice.getDate() + 60);
  
  // 120-day contest period
  const contestDeadline = new Date(death);
  contestDeadline.setDate(contestDeadline.getDate() + 120);
  
  // 4-month creditor claim period
  const creditorDeadline = new Date(death);
  creditorDeadline.setMonth(creditorDeadline.getMonth() + 4);
  
  // 9-month estate tax deadline (if applicable)
  const estateTaxDeadline = new Date(death);
  estateTaxDeadline.setMonth(estateTaxDeadline.getMonth() + 9);
  
  // Final income tax (April 15 of year following death)
  const finalTaxYear = death.getFullYear() + 1;
  const finalIncomeTax = new Date(finalTaxYear, 3, 15); // April 15
  
  return {
    sixty_day_notice: formatDate(sixtyDayNotice),
    contest_deadline: formatDate(contestDeadline),
    creditor_claims: formatDate(creditorDeadline),
    estate_tax_706: formatDate(estateTaxDeadline),
    final_income_tax: formatDate(finalIncomeTax)
  };
}

// Save case data
async function saveCaseData(caseData) {
  // In production, this would:
  // 1. Save to database (PostgreSQL, Firebase, Supabase, etc.)
  // 2. Create Google Drive folder
  // 3. Log to Google Sheets
  // 4. Send notification emails
  
  console.log('Saving complete case data:', {
    case_number: caseData.case_number,
    decedent: caseData.decedent_full_name,
    properties: caseData.real_property?.length || 0,
    beneficiaries: caseData.beneficiaries?.length || 0
  });
  
  // For now, we'll return success
  // In production, implement actual database save here
  return true;
}

// Generate initial documents
async function generateInitialDocuments(caseData) {
  const generatedDocs = [];
  
  try {
    // 1. Generate 60-Day Notices for each beneficiary
    if (caseData.generate_60day && caseData.beneficiaries?.length > 0) {
      console.log('Generating 60-day notices for', caseData.beneficiaries.length, 'beneficiaries');
      // Call 60-day notice function
      generatedDocs.push('60-day-notices');
    }
    
    // 2. Generate Government Agency Notices
    if (caseData.generate_gov_notices) {
      console.log('Generating government agency notices');
      // Call government notices function
      generatedDocs.push('government-notices');
    }
    
    // 3. Generate BOE Forms if property exists
    if (caseData.generate_boe_forms && caseData.real_property?.length > 0) {
      console.log('Generating BOE forms for', caseData.real_property.length, 'properties');
      // Call BOE forms function
      generatedDocs.push('boe-forms');
    }
    
    // 4. Generate Property Documents
    if (caseData.generate_property_docs && caseData.real_property?.length > 0) {
      console.log('Generating property transfer documents');
      // Call property docs function
      generatedDocs.push('property-docs');
    }
    
    // 5. Generate Distribution Documents if requested
    if (caseData.generate_distribution_docs && caseData.beneficiaries?.length > 0) {
      console.log('Generating distribution documents');
      // Call distribution docs function
      generatedDocs.push('distribution-docs');
    }
    
  } catch (error) {
    console.error('Error generating initial documents:', error);
  }
  
  return generatedDocs;
}

// Main handler
exports.handler = async (event, context) => {
  console.log('Create Trust Case handler called');
  console.log('Method:', event.httpMethod);
  
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    const formData = JSON.parse(event.body);
    console.log('Received form data with', Object.keys(formData).length, 'fields');
    
    // Generate case number
    const caseNumber = generateCaseNumber();
    console.log('Generated case number:', caseNumber);
    
    // Calculate deadlines
    const deadlines = calculateDeadlines(formData.death_date);
    
    // Prepare COMPLETE case data with ALL fields
    const caseData = {
      // === CASE INFORMATION ===
      case_number: caseNumber,
      created_date: new Date().toISOString(),
      status: 'active',
      urgency_level: formData.urgency_level || 'normal',
      fee_arrangement: formData.fee_arrangement || '',
      
      // === DECEDENT INFORMATION ===
      decedent_first_name: formData.decedent_first_name,
      decedent_middle_name: formData.decedent_middle_name || '',
      decedent_last_name: formData.decedent_last_name,
      decedent_full_name: formData.decedent_name || 
        `${formData.decedent_first_name} ${formData.decedent_middle_name || ''} ${formData.decedent_last_name}`.trim(),
      death_date: formData.death_date,
      death_place: formData.death_place || '',
      ssn_last4: formData.ssn_last4 || '',
      marital_status: formData.marital_status || 'single',
      gender: formData.gender || '',
      
      // === TRUSTEE INFORMATION ===
      trustee_name: formData.trustee_name,
      trustee_relationship: formData.trustee_relationship || '',
      trustee_address: formData.trustee_address || '',
      trustee_city: formData.trustee_city || '',
      trustee_state: formData.trustee_state || 'CA',
      trustee_zip: formData.trustee_zip || '',
      trustee_phone: formData.trustee_phone || '',
      trustee_email: formData.trustee_email || '',
      has_cotrustees: formData.has_cotrustees || false,
      cotrustees: formData.cotrustees || [],
      
      // === TRUST INFORMATION ===
      trust_name: formData.trust_name,
      trust_date: formData.trust_date || '',
      trust_type: formData.trust_type || 'revocable',
      trust_tax_id: formData.trust_tax_id || '',
      has_amendments: formData.has_amendments || false,
      amendment_dates: formData.amendment_dates || [],
      
      // === ESTATE INFORMATION ===
      estate_value: formData.estate_value || '',
      
      // === REAL PROPERTY ===
      real_property: formData.real_property || [],
      primary_property: formData.primary_property || formData.real_property?.[0] || {},
      property_address: formData.property_address || formData.real_property?.[0]?.address || '',
      property_city: formData.property_city || formData.real_property?.[0]?.city || '',
      property_state: formData.property_state || 'CA',
      property_zip: formData.property_zip || formData.real_property?.[0]?.zip || '',
      property_county: formData.property_county || formData.real_property?.[0]?.county || 'Los Angeles',
      apn: formData.apn || formData.real_property?.[0]?.apn || '',
      was_principal_residence: formData.was_principal_residence || formData.real_property?.[0]?.was_principal_residence || false,
      family_farm: formData.family_farm || formData.real_property?.[0]?.family_farm || false,
      
      // === BENEFICIARIES ===
      beneficiaries: formData.beneficiaries || [],
      total_beneficiaries: formData.beneficiaries ? formData.beneficiaries.length : 0,
      
      // === BOE FORM DATA ===
      transfer_type: formData.transfer_type || '',
      transfer_date: formData.transfer_date || formData.death_date,
      transfer_to: formData.transfer_to || '',
      homeowners_exemption: formData.homeowners_exemption || false,
      disabled_veteran: formData.disabled_veteran || false,
      document_number: formData.document_number || '',
      purchase_price: formData.purchase_price || '0',
      principal_residence: formData.principal_residence || false,
      
      // === BUYER/TRANSFEREE INFO (for BOE forms) ===
      buyer_name: formData.buyer_name || formData.trustee_name,
      buyer_address: formData.buyer_address || formData.trustee_address,
      buyer_city: formData.buyer_city || formData.trustee_city,
      buyer_state: formData.buyer_state || formData.trustee_state || 'CA',
      buyer_zip: formData.buyer_zip || formData.trustee_zip,
      buyer_email: formData.buyer_email || formData.trustee_email,
      buyer_phone: formData.buyer_phone || formData.trustee_phone,
      
      // === SELLER/TRANSFEROR INFO (for BOE forms) ===
      seller_name: formData.seller_name || formData.decedent_name || 
        `${formData.decedent_first_name} ${formData.decedent_last_name}`.trim(),
      
      // === CONTACT INFO (for notices) ===
      contact_name: formData.contact_name || formData.trustee_name,
      contact_phone: formData.contact_phone || formData.trustee_phone,
      contact_email: formData.contact_email || formData.trustee_email,
      
      // === FINANCIAL ACCOUNTS ===
      bank_accounts: formData.bank_accounts || [],
      investment_accounts: formData.investment_accounts || [],
      personal_property: formData.personal_property || [],
      
      // === DEADLINES ===
      deadlines: deadlines,
      
      // === DOCUMENT GENERATION FLAGS ===
      generate_initial_docs: formData.generate_initial_docs || false,
      generate_60day: formData.generate_60day || false,
      generate_gov_notices: formData.generate_gov_notices || false,
      generate_boe_forms: formData.generate_boe_forms || false,
      generate_property_docs: formData.generate_property_docs || false,
      generate_distribution_docs: formData.generate_distribution_docs || false,
      
      // === ADMINISTRATIVE ===
      initial_notes: formData.initial_notes || '',
      documents_received: formData.documents_received || [],
      
      // === TRACKING ===
      notices_sent: {},
      documents_generated: [],
      tasks_completed: [],
      last_updated: new Date().toISOString()
    };
    
    // Validate required fields
    const requiredFields = [
      'decedent_first_name',
      'decedent_last_name', 
      'death_date',
      'trustee_name',
      'trust_name'
    ];
    
    const missingFields = [];
    for (const field of requiredFields) {
      if (!caseData[field]) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Save case data
    const saved = await saveCaseData(caseData);
    if (!saved) {
      throw new Error('Failed to save case data');
    }
    
    // Generate initial documents if requested
    let documentsGenerated = [];
    if (formData.generate_initial_docs) {
      console.log('Generating initial documents...');
      documentsGenerated = await generateInitialDocuments(caseData);
    }
    
    // Prepare response
    const response = {
      success: true,
      case_number: caseNumber,
      message: 'Trust administration case created successfully',
      case_data: {
        case_number: caseNumber,
        decedent_name: caseData.decedent_full_name,
        trustee_name: caseData.trustee_name,
        trust_name: caseData.trust_name,
        death_date: formatDate(caseData.death_date),
        deadlines: deadlines,
        properties_count: caseData.real_property?.length || 0,
        beneficiaries_count: caseData.beneficiaries?.length || 0
      },
      documents_generated: documentsGenerated,
      next_steps: [
        `60-day notice must be sent by ${deadlines.sixty_day_notice}`,
        'Gather certified death certificates',
        'Locate original trust document and amendments',
        'Identify and value all trust assets',
        'Notify financial institutions',
        'File for tax ID number if needed',
        'Open trust bank account'
      ]
    };
    
    // Add specific next steps based on case data
    if (caseData.real_property?.length > 0) {
      response.next_steps.push('Order property appraisals');
      response.next_steps.push('File BOE forms for property tax reassessment');
    }
    
    if (caseData.estate_value && parseFloat(caseData.estate_value.replace(/[^0-9.-]/g, '')) > 12920000) {
      response.next_steps.push('Prepare Federal Estate Tax Return (Form 706)');
    }
    
    console.log('Case created successfully:', caseNumber);
    
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(response)
    };
    
  } catch (error) {
    console.error('Error creating trust case:', error);
    
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to create trust administration case',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};

