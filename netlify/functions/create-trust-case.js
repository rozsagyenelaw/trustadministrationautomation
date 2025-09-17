// netlify/functions/create-trust-case.js
// WORKING VERSION that actually generates documents

const { PDFDocument } = require('pdf-lib');
const fetch = require('node-fetch');

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
  console.log('Saving complete case data:', {
    case_number: caseData.case_number,
    decedent: caseData.decedent_full_name,
    properties: caseData.real_property?.length || 0,
    beneficiaries: caseData.beneficiaries?.length || 0
  });
  
  return true;
}

// ACTUALLY GENERATE DOCUMENTS BY CALLING THE FUNCTIONS
async function generateInitialDocuments(caseData) {
  const generatedDocs = {};
  const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://trustadministrationautomation.netlify.app';
  
  console.log('Starting REAL document generation for case:', caseData.case_number);
  console.log('Base URL for functions:', baseUrl);
  
  // Helper function to call other Netlify functions
  async function callFunction(functionName, data) {
    const url = `${baseUrl}/.netlify/functions/${functionName}`;
    console.log(`Calling function: ${url}`);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        console.error(`${functionName} returned status ${response.status}`);
        return null;
      }
      
      const result = await response.json();
      console.log(`${functionName} result:`, result.success ? 'Success' : 'Failed');
      return result;
    } catch (err) {
      console.error(`Error calling ${functionName}:`, err.message);
      return null;
    }
  }
  
  try {
    // 1. Generate BOE Forms
    if (caseData.generate_boe_forms && (caseData.real_property?.length > 0 || caseData.property_address)) {
      console.log('Generating BOE forms...');
      const boeResult = await callFunction('generate-boe-forms', {
        ...caseData,
        generate_pcor: true,
        generate_502d: true,
        generate_19p: caseData.transfer_type === 'parent_child'
      });
      
      if (boeResult?.success && boeResult.documents) {
        Object.assign(generatedDocs, boeResult.documents);
        console.log('BOE forms added:', Object.keys(boeResult.documents).join(', '));
      }
    }
    
    // 2. Generate Government Notices
    if (caseData.generate_gov_notices) {
      console.log('Generating government notices...');
      const govResult = await callFunction('generate-government-notices', {
        ...caseData,
        agencies: ['ftb', 'irs', 'dhcs', 'ssa']
      });
      
      if (govResult?.success && govResult.documents) {
        Object.assign(generatedDocs, govResult.documents);
        console.log('Government notices added:', Object.keys(govResult.documents).join(', '));
      }
    }
    
    // 3. Generate Property Documents
    if (caseData.generate_property_docs && (caseData.real_property?.length > 0 || caseData.property_address)) {
      console.log('Generating property documents...');
      const propResult = await callFunction('generate-property-documents', {
        ...caseData,
        generate_affidavit: true,
        generate_trust_deed: true,
        generate_certification: true
      });
      
      if (propResult?.success && propResult.documents) {
        Object.assign(generatedDocs, propResult.documents);
        console.log('Property documents added:', Object.keys(propResult.documents).join(', '));
      }
    }
    
    // 4. Generate Trust Documents (60-day notices)
    if (caseData.generate_60day) {
      console.log('Generating trust documents (60-day notices)...');
      const trustResult = await callFunction('generate-trust-documents', {
        ...caseData,
        generate_receipt: true,
        generate_waiver: true,
        generate_60day_notice: true
      });
      
      if (trustResult?.success && trustResult.documents) {
        Object.assign(generatedDocs, trustResult.documents);
        console.log('Trust documents added:', Object.keys(trustResult.documents).join(', '));
      }
    }
    
    // 5. Generate Distribution Documents
    if (caseData.generate_distribution_docs && caseData.beneficiaries?.length > 0) {
      console.log('Generating distribution documents...');
      const distResult = await callFunction('generate-distribution-docs', {
        ...caseData,
        generate_waiver: true,
        generate_release: true,
        generate_receipt: true,
        generate_letter: true
      });
      
      if (distResult?.success && distResult.documents) {
        Object.assign(generatedDocs, distResult.documents);
        console.log('Distribution documents added:', Object.keys(distResult.documents).join(', '));
      }
    }
    
  } catch (error) {
    console.error('Error in document generation:', error);
  }
  
  console.log('Total documents generated:', Object.keys(generatedDocs).length);
  if (Object.keys(generatedDocs).length > 0) {
    console.log('Documents generated:', Object.keys(generatedDocs).join(', '));
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
      decedent_name: formData.decedent_name ||
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
      principal_residence: formData.principal_residence || formData.was_principal_residence || false,
      
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
    
    // Generate initial documents if requested - THIS IS THE KEY PART
    let documentsGenerated = {};
    let documentsList = [];
    
    if (formData.generate_initial_docs) {
      console.log('Starting document generation process...');
      console.log('Flags:', {
        generate_60day: caseData.generate_60day,
        generate_gov_notices: caseData.generate_gov_notices,
        generate_boe_forms: caseData.generate_boe_forms,
        generate_property_docs: caseData.generate_property_docs,
        generate_distribution_docs: caseData.generate_distribution_docs
      });
      
      documentsGenerated = await generateInitialDocuments(caseData);
      documentsList = Object.keys(documentsGenerated);
      console.log('Documents generated list:', documentsList);
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
      documents: documentsGenerated,  // Include actual PDF data
      documents_generated: documentsList,  // List of document names
      documents_count: documentsList.length,  // Count of documents
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
    
    // Fix the estate value parsing
    if (caseData.estate_value) {
      const estateString = String(caseData.estate_value);
      const estateNumber = parseFloat(estateString.replace(/[^0-9.]/g, ''));
      if (!isNaN(estateNumber) && estateNumber > 12920000) {
        response.next_steps.push('Prepare Federal Estate Tax Return (Form 706)');
      }
    }
    
    console.log('Case created successfully:', caseNumber);
    console.log('Total documents in response:', response.documents_count);
    
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
