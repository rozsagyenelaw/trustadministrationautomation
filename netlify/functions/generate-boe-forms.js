// netlify/functions/generate-official-boe-forms.js
// This function FILLS official BOE PDF forms instead of creating from scratch

const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

// Fill BOE-502-A (PCOR) - Official Form
async function fillPCOR(data) {
  try {
    // Load the official BOE-502-A PDF template
    const templatePath = path.join(__dirname, '../../public/templates/BOE-502-A.pdf');
    const existingPdfBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // Get the form
    const form = pdfDoc.getForm();
    
    // Field mapping for BOE-502-A
    // These field names match the actual form field names in the official PDF
    const fieldMapping = {
      // Buyer Information Section
      'BUYER NAME': data.buyer_name || '',
      'BUYER ADDRESS': data.buyer_address || '',
      'BUYER CITY': data.buyer_city || '',
      'BUYER STATE': data.buyer_state || 'CA',
      'BUYER ZIP': data.buyer_zip || '',
      'ASSESSORS PARCEL NUMBER': data.apn || '',
      'BUYER EMAIL ADDRESS': data.buyer_email || '',
      'BUYER DAYTIME TELEPHONE': data.buyer_phone || '',
      
      // Seller Information
      'SELLER/TRANSFEROR': data.seller_name || '',
      
      // Property Information
      'STREET ADDRESS': data.property_address || '',
      'CITY': data.property_city || '',
      
      // Principal Residence Question
      'PRINCIPAL RESIDENCE YES': data.principal_residence === true ? 'X' : '',
      'PRINCIPAL RESIDENCE NO': data.principal_residence === false ? 'X' : '',
      'OCCUPANCY DATE MONTH': data.occupancy_month || '',
      'OCCUPANCY DATE DAY': data.occupancy_day || '',
      'OCCUPANCY DATE YEAR': data.occupancy_year || '',
      
      // Disabled Veteran Question  
      'DISABLED VETERAN YES': data.disabled_veteran === true ? 'X' : '',
      'DISABLED VETERAN NO': data.disabled_veteran === false ? 'X' : '',
      
      // Mail Tax Info To
      'MAIL TAX NAME': data.tax_mail_name || data.buyer_name || '',
      'MAIL TAX ADDRESS': data.tax_mail_address || data.buyer_address || '',
      'MAIL TAX CITY': data.tax_mail_city || data.buyer_city || '',
      'MAIL TAX STATE': data.tax_mail_state || 'CA',
      'MAIL TAX ZIP': data.tax_mail_zip || data.buyer_zip || ''
    };
    
    // Fill in Part 1 - Transfer Information checkboxes
    if (data.transfer_type) {
      switch(data.transfer_type) {
        case 'spouse':
          form.getCheckBox('PART1_A_YES')?.check();
          break;
        case 'parent_child':
          form.getCheckBox('PART1_C_YES')?.check();
          if (data.principal_residence_transfer) {
            form.getCheckBox('PART1_C_PRINCIPAL_YES')?.check();
          }
          break;
        case 'trust':
          form.getCheckBox('PART1_L_YES')?.check();
          form.getRadioGroup('PART1_L_TYPE')?.select('revocable');
          break;
      }
    }
    
    // Fill all text fields
    for (const [fieldName, value] of Object.entries(fieldMapping)) {
      try {
        const field = form.getTextField(fieldName);
        if (field) {
          field.setText(value.toString());
        }
      } catch (e) {
        // Field might not exist or be named differently
        console.log(`Field ${fieldName} not found, skipping`);
      }
    }
    
    // Flatten the form to prevent further editing (optional)
    if (data.flatten_form) {
      form.flatten();
    }
    
    return await pdfDoc.save();
    
  } catch (error) {
    console.error('Error filling PCOR form:', error);
    throw error;
  }
}

// Fill BOE-502-D (Death of Real Property Owner) - Official Form
async function fillBOE502D(data) {
  try {
    const templatePath = path.join(__dirname, '../../public/templates/BOE-502-D.pdf');
    const existingPdfBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    const form = pdfDoc.getForm();
    
    // Field mapping for BOE-502-D
    const fieldMapping = {
      // Decedent Information
      'NAME OF DECEDENT': data.decedent_name || '',
      'DATE OF DEATH': data.death_date || '',
      
      // Property Information
      'PROPERTY ADDRESS': data.property_address || '',
      'PROPERTY CITY': data.property_city || '',
      'PROPERTY ZIP': data.property_zip || '',
      'APN': data.apn || '',
      
      // Recipient Information
      'RECIPIENT NAME': data.recipient_name || '',
      'RECIPIENT ADDRESS': data.recipient_address || ''
    };
    
    // Fill text fields
    for (const [fieldName, value] of Object.entries(fieldMapping)) {
      try {
        const field = form.getTextField(fieldName);
        if (field) {
          field.setText(value.toString());
        }
      } catch (e) {
        console.log(`Field ${fieldName} not found, skipping`);
      }
    }
    
    // Check appropriate boxes for disposition type
    if (data.disposition_type) {
      switch(data.disposition_type) {
        case 'spouse':
          form.getCheckBox('SPOUSE')?.check();
          break;
        case 'child':
          form.getCheckBox('CHILD')?.check();
          break;
        case 'trust':
          form.getCheckBox('TRUST')?.check();
          break;
      }
    }
    
    // Principal residence question
    if (data.was_principal_residence === true) {
      form.getCheckBox('PRINCIPAL_RES_YES')?.check();
    } else if (data.was_principal_residence === false) {
      form.getCheckBox('PRINCIPAL_RES_NO')?.check();
    }
    
    return await pdfDoc.save();
    
  } catch (error) {
    console.error('Error filling BOE-502-D form:', error);
    throw error;
  }
}

// Fill BOE-19-P (Parent-Child Exclusion) - Official Form
async function fillBOE19P(data) {
  try {
    const templatePath = path.join(__dirname, '../../public/templates/BOE-19-P.pdf');
    const existingPdfBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    const form = pdfDoc.getForm();
    
    // Field mapping for BOE-19-P
    const fieldMapping = {
      // Section A - Property
      'ASSESSORS PARCEL NUMBER': data.apn || '',
      'DATE OF PURCHASE OR TRANSFER': data.transfer_date || '',
      'DOCUMENT NUMBER': data.document_number || '',
      'DATE OF DEATH': data.death_date || '',
      'PROPERTY ADDRESS': data.property_address || '',
      'PROPERTY CITY': data.property_city || '',
      
      // Section B - Transferors
      'TRANSFEROR NAME 1': data.transferor_name1 || '',
      'TRANSFEROR NAME 2': data.transferor_name2 || '',
      'TRANSFEROR RELATIONSHIP 1': data.relationship1 || 'Parent',
      'TRANSFEROR RELATIONSHIP 2': data.relationship2 || '',
      
      // Section C - Transferees
      'TRANSFEREE NAME 1': data.transferee_name1 || '',
      'TRANSFEREE NAME 2': data.transferee_name2 || ''
    };
    
    // Fill text fields
    for (const [fieldName, value] of Object.entries(fieldMapping)) {
      try {
        const field = form.getTextField(fieldName);
        if (field) {
          field.setText(value.toString());
        }
      } catch (e) {
        console.log(`Field ${fieldName} not found, skipping`);
      }
    }
    
    // Check boxes for property type
    if (data.principal_residence) {
      form.getCheckBox('PRINCIPAL_RESIDENCE_YES')?.check();
      
      if (data.homeowners_exemption) {
        form.getCheckBox('HOMEOWNERS_EXEMPTION')?.check();
      }
      if (data.disabled_veterans_exemption) {
        form.getCheckBox('DISABLED_VETERANS_EXEMPTION')?.check();
      }
    } else {
      form.getCheckBox('PRINCIPAL_RESIDENCE_NO')?.check();
    }
    
    if (data.family_farm) {
      form.getCheckBox('FAMILY_FARM_YES')?.check();
    } else {
      form.getCheckBox('FAMILY_FARM_NO')?.check();
    }
    
    return await pdfDoc.save();
    
  } catch (error) {
    console.error('Error filling BOE-19-P form:', error);
    throw error;
  }
}

// Main handler
exports.handler = async (event, context) => {
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
    const data = JSON.parse(event.body);
    const documents = {};
    
    // Generate requested official forms
    if (data.generate_pcor) {
      const pcorPdf = await fillPCOR(data);
      documents.pcor_official = Buffer.from(pcorPdf).toString('base64');
    }
    
    if (data.generate_502d) {
      const deathPdf = await fillBOE502D(data);
      documents.boe_502d_official = Buffer.from(deathPdf).toString('base64');
    }
    
    if (data.generate_19p) {
      const parentChildPdf = await fillBOE19P(data);
      documents.boe_19p_official = Buffer.from(parentChildPdf).toString('base64');
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: `Generated ${Object.keys(documents).length} official BOE forms`,
        documents: documents,
        case_number: data.case_number
      })
    };
    
  } catch (error) {
    console.error('Error generating official BOE forms:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to generate official forms',
        details: error.message,
        note: 'Make sure official PDF templates are in public/templates folder'
      })
    };
  }
};
