// netlify/functions/create-trust-case.js

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

// Save case data (in production, this would save to a database)
async function saveCaseData(caseData) {
  // For now, we'll just log it
  // In production, this would:
  // 1. Save to database (PostgreSQL, Firebase, etc.)
  // 2. Save to Google Sheets for tracking
  // 3. Create folder in Google Drive
  // 4. Send notification email
  
  console.log('Saving case data:', caseData);
  
  // TODO: Implement actual data storage
  // Example for Google Sheets:
  // const sheets = google.sheets({version: 'v4', auth});
  // await sheets.spreadsheets.values.append({
  //   spreadsheetId: process.env.GOOGLE_SHEET_ID,
  //   range: 'Cases!A:Z',
  //   valueInputOption: 'RAW',
  //   body: { values: [[...Object.values(caseData)]] }
  // });
  
  return true;
}

// Main handler
exports.handler = async (event, context) => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    const formData = JSON.parse(event.body);
    
    // Generate case number
    const caseNumber = generateCaseNumber();
    
    // Calculate deadlines
    const deadlines = calculateDeadlines(formData.death_date);
    
    // Prepare complete case data
    const caseData = {
      // Case Information
      case_number: caseNumber,
      created_date: new Date().toISOString(),
      status: 'active',
      
      // Decedent Information
      decedent_first_name: formData.decedent_first_name,
      decedent_middle_name: formData.decedent_middle_name || '',
      decedent_last_name: formData.decedent_last_name,
      decedent_full_name: `${formData.decedent_first_name} ${formData.decedent_middle_name || ''} ${formData.decedent_last_name}`.trim(),
      death_date: formData.death_date,
      death_place: formData.death_place || '',
      ssn_last4: formData.ssn_last4 || '',
      marital_status: formData.marital_status,
      
      // Trustee Information
      trustee_name: formData.trustee_name,
      trustee_relationship: formData.trustee_relationship || '',
      trustee_address: formData.trustee_address || '',
      trustee_city: formData.trustee_city || '',
      trustee_state: formData.trustee_state || 'CA',
      trustee_zip: formData.trustee_zip || '',
      trustee_phone: formData.trustee_phone || '',
      trustee_email: formData.trustee_email || '',
      
      // Co-Trustees (if any)
      has_cotrustees: formData.cotrustees && formData.cotrustees.length > 0,
      cotrustees: formData.cotrustees || [],
      
      // Trust Information
      trust_name: formData.trust_name,
      trust_date: formData.trust_date || '',
      trust_type: formData.trust_type || 'revocable',
      has_amendments: formData.has_amendments || false,
      amendment_dates: formData.amendment_dates || [],
      
      // Estate Information
      estate_value: formData.estate_value || '',
      real_property: formData.real_property || [],
      bank_accounts: formData.bank_accounts || [],
      investment_accounts: formData.investment_accounts || [],
      personal_property: formData.personal_property || [],
      
      // Beneficiaries
      beneficiaries: formData.beneficiaries || [],
      total_beneficiaries: formData.beneficiaries ? formData.beneficiaries.length : 0,
      
      // Deadlines
      deadlines: deadlines,
      
      // Administrative
      fee_arrangement: formData.fee_arrangement || '',
      urgency_level: formData.urgency_level || 'normal',
      initial_notes: formData.initial_notes || '',
      documents_received: formData.documents_received || [],
      
      // Tracking
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
    
    for (const field of requiredFields) {
      if (!caseData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Save case data
    await saveCaseData(caseData);
    
    // Prepare response with initial documents to generate
    const response = {
      success: true,
      case_number: caseNumber,
      message: 'Trust administration case created successfully',
      case_data: {
        case_number: caseNumber,
        decedent_name: caseData.decedent_full_name,
        trustee_name: caseData.trustee_name,
        death_date: formatDate(caseData.death_date),
        deadlines: deadlines
      },
      next_steps: [
        `60-day notice must be sent by ${deadlines.sixty_day_notice}`,
        'Gather death certificates',
        'Locate original trust document',
        'Identify all trust assets',
        'Notify financial institutions'
      ]
    };
    
    // Auto-generate initial documents if requested
    if (formData.generate_initial_docs) {
      // This would call other functions to generate:
      // 1. Government notices (FTB, IRS, DHCS)
      // 2. 60-day beneficiary notices
      // 3. Trust certification
      // etc.
      response.documents_queued = [
        'government_notices',
        'sixty_day_notices',
        'trust_certification'
      ];
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response)
    };
    
  } catch (error) {
    console.error('Error creating trust case:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to create trust administration case',
        details: error.message
      })
    };
  }
};
