// netlify/functions/generate-boe-forms.js
// COMPLETE VERSION - Fixed with correct URL

const { PDFDocument } = require('pdf-lib');

// Helper function to format date
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
}

// Load PDF from deployed Netlify site
async function loadPDFFromDeployedSite(filename) {
  const fetch = (await import('node-fetch')).default;
  
  // CORRECTED URL - using trustadministrationautomation
  const siteUrl = process.env.URL || process.env.DEPLOY_URL || 'https://trustadministrationautomation.netlify.app';
  const url = `${siteUrl}/templates/${filename}`;
  
  try {
    console.log(`Loading ${filename} from: ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status} for ${url}`);
      throw new Error(`Failed to load ${filename}: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.buffer();
    console.log(`Successfully loaded ${filename}, size: ${buffer.length} bytes`);
    return buffer;
  } catch (error) {
    console.error(`Error loading ${filename}:`, error.message);
    throw new Error(`Cannot load template ${filename}: ${error.message}`);
  }
}

// Fill BOE-502-A (PCOR) - Official Form
async function fillPCOR(data, pdfBytes) {
  try {
    console.log('Filling BOE-502-A (PCOR) form...');
    
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    
    // Get all field names for debugging
    const fields = form.getFields();
    console.log('BOE-502-A available fields:', fields.map(f => f.getName()));
    
    // Field mappings
    const fieldMappings = [
      // Buyer Information
      { fieldNames: ['Buyer Name', 'Name', 'buyer_name', 'Transferee Name', 'Name and mailing address of buyer/transferee'], value: data.buyer_name || data.trustee_name },
      { fieldNames: ['Buyer Address', 'Address', 'Mailing Address', 'buyer_address'], value: data.buyer_address || data.trustee_address },
      { fieldNames: ['City', 'Buyer City', 'buyer_city'], value: data.buyer_city || data.trustee_city },
      { fieldNames: ['State', 'Buyer State', 'buyer_state'], value: data.buyer_state || data.trustee_state || 'CA' },
      { fieldNames: ['ZIP', 'Zip Code', 'ZIP code', 'buyer_zip'], value: data.buyer_zip || data.trustee_zip },
      { fieldNames: ['Email', 'Buyer Email', "Buyer's email address", 'buyer_email'], value: data.buyer_email || data.trustee_email },
      { fieldNames: ['Phone', 'Daytime Phone', "buyer's daytime telephone number1", 'buyer_phone'], value: data.buyer_phone || data.trustee_phone },
      
      // Property Information
      { fieldNames: ['APN', 'Assessors Parcel Number', 'Assessors parcel number', 'Parcel Number'], value: data.apn },
      { fieldNames: ['Property Address', 'Street Address', 'street address or physical location of real property'], value: data.property_address },
      { fieldNames: ['Property City', 'city'], value: data.property_city },
      { fieldNames: ['Property State', 'state'], value: data.property_state || 'CA' },
      { fieldNames: ['Property ZIP', 'Property Zip'], value: data.property_zip },
      
      // Seller Information
      { fieldNames: ['Seller Name', 'seller transferor', 'Seller/Transferor', 'seller_name'], value: data.seller_name || data.decedent_name },
      
      // Transfer Information
      { fieldNames: ['Transfer Date', 'Date of Transfer', 'transfer_date'], value: formatDate(data.transfer_date || data.death_date) },
      { fieldNames: ['Purchase Price', 'Total purchase price', 'purchase_price'], value: data.purchase_price || '0' },
      { fieldNames: ['Document Number', 'Recording Number', 'document_number'], value: data.document_number },
    ];
    
    // Fill text fields
    for (const mapping of fieldMappings) {
      if (!mapping.value) continue;
      
      for (const fieldName of mapping.fieldNames) {
        try {
          const field = form.getTextField(fieldName);
          if (field) {
            field.setText(String(mapping.value));
            console.log(`Filled field "${fieldName}" with "${mapping.value}"`);
            break;
          }
        } catch (e) {
          // Field doesn't exist with this name, try next
        }
      }
    }
    
    // Checkbox mappings
    const checkboxMappings = [
      // Spouse transfer
      { condition: data.transfer_type === 'spouse', fieldNames: ['A. This transfer is solely between spouses (addition or removal of a spouse, death of a spouse, divorce settlement, etc.)­yes', 'Spouse Transfer', 'spouse_transfer'] },
      
      // Parent-Child transfer
      { condition: data.transfer_type === 'parent_child', fieldNames: ['C. This is a transfer between: parents and children or grandparents and grandchildren_yes', 'Parent Child Transfer', 'parent_child'] },
      
      // Trust transfer
      { condition: data.transfer_type === 'trust', fieldNames: ['L1. This is a transfer of property to/from a revocable trust that may be revoked by the transferor and is for the benefit of the transferor and/or the transferor\'s spouse and/or registered domestic partner Yes', 'Trust Transfer', 'revocable_trust'] },
      
      // Death of co-owner
      { condition: data.transfer_type === 'cotenant_death', fieldNames: ['D.This transfer is the result of a cotenant\'s death_yes', 'Cotenant Death', 'death_cotenant'] },
      
      // Principal residence
      { condition: data.principal_residence === true, fieldNames: ['This property is intended as my principal residence. If YES, please indicate the date of occupancy or intended occupancy Yes', 'Principal Residence Yes', 'principal_residence_yes'] },
      { condition: data.principal_residence === false, fieldNames: ['This property is intended as my principal residence. If YES, please indicate the date of occupancy or intended occupancy_no', 'Principal Residence No', 'principal_residence_no'] },
      
      // Disabled veteran
      { condition: data.disabled_veteran === true, fieldNames: ['Are you a disabled veteran or an unmarried surviving spouse of a disabled veteran who was compensated at 100% by the Department of Veterans Affairs or an unmarried surviving spouse of a 100% rated disabled veteran? Yes', 'Disabled Veteran Yes', 'disabled_veteran_yes'] },
      { condition: data.disabled_veteran === false, fieldNames: ['Are you a disabled veteran or an unmarried surviving spouse of a disabled veteran who was compensated at 100% by the Department of Veterans Affairs or an unmarried surviving spouse of a 100% rated disabled veteran? No', 'Disabled Veteran No', 'disabled_veteran_no'] },
      
      // Was principal residence (for parent-child transfer)
      { condition: data.was_principal_residence === true, fieldNames: ["Was this the transferor/grantor's principal residence? Yes", 'Transferor Principal Residence Yes'] },
      { condition: data.was_principal_residence === false, fieldNames: ["Was this the transferor/grantor's principal residence? No", 'Transferor Principal Residence No'] },
      
      // Family farm
      { condition: data.family_farm === true, fieldNames: ['Is this a family farm? Yes', 'Family Farm Yes'] },
      { condition: data.family_farm === false, fieldNames: ['Is this a family farm? No', 'Family Farm No'] },
    ];
    
    // Check appropriate boxes
    for (const mapping of checkboxMappings) {
      if (!mapping.condition) continue;
      
      for (const fieldName of mapping.fieldNames) {
        try {
          const checkbox = form.getCheckBox(fieldName);
          if (checkbox) {
            checkbox.check();
            console.log(`Checked box "${fieldName}"`);
            break;
          }
        } catch (e) {
          // Checkbox doesn't exist with this name, try next
        }
      }
    }
    
    return await pdfDoc.save();
    
  } catch (error) {
    console.error('Error filling PCOR form:', error);
    throw error;
  }
}

// Fill BOE-502-D (Death of Real Property Owner)
async function fillBOE502D(data, pdfBytes) {
  try {
    console.log('Filling BOE-502-D (Death of Real Property Owner) form...');
    
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    
    // Get all field names for debugging
    const fields = form.getFields();
    console.log('BOE-502-D available fields:', fields.map(f => f.getName()));
    
    // Field mappings for BOE-502-D
    const fieldMappings = [
      // Basic Information
      { fieldNames: ['name and mailing address', 'Name Address', 'name_address'], value: data.trustee_name + '\n' + (data.trustee_address || '') },
      { fieldNames: ['APN of real property', 'APN', 'apn'], value: data.apn },
      
      // Decedent Information
      { fieldNames: ['name of decedent', 'Decedent Name', 'decedent_name'], value: data.decedent_name },
      { fieldNames: ['date of death', 'Date of Death', 'death_date'], value: formatDate(data.death_date) },
      
      // Property Information
      { fieldNames: ['street address of real property', 'Property Address', 'property_address'], value: data.property_address },
      { fieldNames: ['city of real property', 'Property City', 'property_city'], value: data.property_city },
      { fieldNames: ['zip of real property', 'Property ZIP', 'property_zip'], value: data.property_zip },
      
      // Trustee Information (if transfer to trust)
      { fieldNames: ['name of trustee', 'Trustee Name', 'trustee_name'], value: data.trustee_name },
      { fieldNames: ['address of trustee', 'Trustee Address', 'trustee_address'], value: data.trustee_address },
      
      // Contact Information
      { fieldNames: ['Name', 'Contact Name', 'contact_name'], value: data.contact_name || data.trustee_name },
      { fieldNames: ['telephone', 'Phone', 'contact_phone'], value: data.contact_phone || data.trustee_phone },
      { fieldNames: ['email', 'Email', 'contact_email'], value: data.contact_email || data.trustee_email },
      { fieldNames: ['date', 'Sign Date', 'sign_date'], value: formatDate(new Date()) },
      { fieldNames: ['printed name', 'Printed Name'], value: data.trustee_name },
    ];
    
    // Fill text fields
    for (const mapping of fieldMappings) {
      if (!mapping.value) continue;
      
      for (const fieldName of mapping.fieldNames) {
        try {
          const field = form.getTextField(fieldName);
          if (field) {
            field.setText(String(mapping.value));
            console.log(`Filled field "${fieldName}" with "${mapping.value}"`);
            break;
          }
        } catch (e) {
          // Field doesn't exist with this name, try next
        }
      }
    }
    
    // Fill beneficiary information if available
    if (data.beneficiaries && Array.isArray(data.beneficiaries)) {
      data.beneficiaries.forEach((beneficiary, index) => {
        if (index < 7) { // Form typically has space for 7 beneficiaries
          const num = index + 1;
          
          // Try various field name patterns
          const nameFields = [`beneficiary name ${num}`, `Beneficiary Name ${num}`, `beneficiary_${num}_name`];
          const relationFields = [`relationship ${num}`, `Relationship ${num}`, `beneficiary_${num}_relationship`];
          const percentFields = [`percent received ${num}`, `Percent ${num}`, `beneficiary_${num}_percent`];
          
          // Try to fill beneficiary name
          if (beneficiary.name) {
            for (const fieldName of nameFields) {
              try {
                const field = form.getTextField(fieldName);
                if (field) {
                  field.setText(beneficiary.name);
                  break;
                }
              } catch (e) {}
            }
          }
          
          // Try to fill beneficiary relationship
          if (beneficiary.relationship || beneficiary.relation) {
            for (const fieldName of relationFields) {
              try {
                const field = form.getTextField(fieldName);
                if (field) {
                  field.setText(beneficiary.relationship || beneficiary.relation);
                  break;
                }
              } catch (e) {}
            }
          }
          
          // Try to fill beneficiary percentage
          if (beneficiary.percent) {
            for (const fieldName of percentFields) {
              try {
                const field = form.getTextField(fieldName);
                if (field) {
                  field.setText(String(beneficiary.percent));
                  break;
                }
              } catch (e) {}
            }
          }
        }
      });
    }
    
    // Handle checkboxes
    const checkboxMappings = [
      // Transfer to spouse
      { condition: data.transfer_to === 'spouse' || data.transfer_type === 'spouse', fieldNames: ['decedents spouse', 'Spouse', 'transfer_spouse'] },
      
      // Transfer to domestic partner
      { condition: data.transfer_to === 'domestic_partner', fieldNames: ['decedents registered domestic partner', 'Domestic Partner'] },
      
      // Transfer to child
      { condition: data.transfer_to === 'child' || data.transfer_type === 'parent_child', fieldNames: ['decedents child or parent', 'Child', 'transfer_child'] },
      
      // Transfer to grandchild
      { condition: data.transfer_to === 'grandchild', fieldNames: ['decedents grandchild', 'Grandchild'] },
      
      // Transfer to trust
      { condition: data.transfer_to === 'trust' || data.transfer_type === 'trust', fieldNames: ['A trust', 'Trust', 'transfer_trust'] },
      
      // Transfer to cotenant
      { condition: data.transfer_to === 'cotenant', fieldNames: ['Contenant to contenant', 'Cotenant'] },
      
      // Principal residence
      { condition: data.was_principal_residence === true, fieldNames: ["Was this the decendent's principal residence? Yes 1", 'Principal Residence Yes'] },
      { condition: data.was_principal_residence === false, fieldNames: ["Was this the decendent's principal residence? No 1", 'Principal Residence No'] },
      
      // Family farm
      { condition: data.family_farm === true, fieldNames: ['Is this property a family farm? yes 1', 'Family Farm Yes'] },
      { condition: data.family_farm === false, fieldNames: ['Is this property a family farm? no 1', 'Family Farm No'] },
    ];
    
    // Check appropriate boxes
    for (const mapping of checkboxMappings) {
      if (!mapping.condition) continue;
      
      for (const fieldName of mapping.fieldNames) {
        try {
          const checkbox = form.getCheckBox(fieldName);
          if (checkbox) {
            checkbox.check();
            console.log(`Checked box "${fieldName}"`);
            break;
          }
        } catch (e) {
          // Checkbox doesn't exist with this name, try next
        }
      }
    }
    
    return await pdfDoc.save();
    
  } catch (error) {
    console.error('Error filling BOE-502-D form:', error);
    throw error;
  }
}

// Fill BOE-19-P (Parent-Child Exclusion)
async function fillBOE19P(data, pdfBytes) {
  try {
    console.log('Filling BOE-19-P (Parent-Child Exclusion) form...');
    
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    
    // Get all field names for debugging
    const fields = form.getFields();
    console.log('BOE-19-P available fields:', fields.map(f => f.getName()));
    
    // Field mappings for BOE-19-P
    const fieldMappings = [
      // Property Information
      { fieldNames: ["Assessor's Parcel/ID Number", 'APN', 'Parcel Number'], value: data.apn },
      { fieldNames: ['PROPERTY ADDRESS', 'Property Address', 'property_address'], value: data.property_address },
      { fieldNames: ['CITY', 'Property City', 'property_city'], value: data.property_city },
      { fieldNames: ['COUNTY', 'County', 'county'], value: data.property_county || 'LOS ANGELES' },
      
      // Transfer Information
      { fieldNames: ['DATE OF PURCHASE OR TRANSFER', 'Transfer Date', 'transfer_date'], value: formatDate(data.transfer_date || data.death_date) },
      { fieldNames: ['RECORDERS DOCUMENT NUMBER', 'Document Number', 'document_number'], value: data.document_number },
      { fieldNames: ['DATE OF DEATH if applicable', 'Death Date', 'death_date'], value: formatDate(data.death_date) },
      
      // Transferor (Parent) Information
      { fieldNames: ['Name', 'Transferor Name 1', 'transferor1_name'], value: data.decedent_name || data.seller_name },
      { fieldNames: ['Name_2', 'Transferor Name 2', 'transferor2_name'], value: data.transferor2_name },
      { fieldNames: ['Relationship', 'Transferor Relationship 1', 'transferor1_relationship'], value: 'Parent' },
      { fieldNames: ['Relationship_2', 'Transferor Relationship 2', 'transferor2_relationship'], value: data.transferor2_relationship },
      
      // Transferee (Child) Information
      { fieldNames: ['Name_3', 'Transferee Name 1', 'transferee1_name'], value: data.trustee_name || data.buyer_name },
      { fieldNames: ['Name_4', 'Transferee Name 2', 'transferee2_name'], value: data.transferee2_name },
      { fieldNames: ['Relationship_3', 'Transferee Relationship 1', 'transferee1_relationship'], value: 'Child' },
      { fieldNames: ['Relationship_4', 'Transferee Relationship 2', 'transferee2_relationship'], value: data.transferee2_relationship },
      
      // Signature Section
      { fieldNames: ['PRINTED NAME', 'Signer Name 1', 'signer1_name'], value: data.trustee_name },
      { fieldNames: ['PRINTED NAME_2', 'Signer Name 2', 'signer2_name'], value: data.signer2_name },
      { fieldNames: ['DATE', 'Sign Date', 'sign_date'], value: formatDate(new Date()) },
      { fieldNames: ['DATE_2', 'Sign Date 2', 'sign_date_2'], value: formatDate(new Date()) },
      { fieldNames: ['MAILING ADDRESS', 'Mailing Address', 'mailing_address'], value: data.trustee_address },
      { fieldNames: ['EMAIL ADDRESS', 'Email', 'email_address'], value: data.trustee_email },
      { fieldNames: ['DAYTIME PHONE NUMBER', 'Phone', 'phone_number'], value: data.trustee_phone },
      
      // Percentage transferred (if partial)
      { fieldNames: ['If yes, percentage transferrred', 'Percentage Transferred', 'percentage_transferred'], value: data.percentage_transferred },
    ];
    
    // Fill text fields
    for (const mapping of fieldMappings) {
      if (!mapping.value) continue;
      
      for (const fieldName of mapping.fieldNames) {
        try {
          const field = form.getTextField(fieldName);
          if (field) {
            field.setText(String(mapping.value));
            console.log(`Filled field "${fieldName}" with "${mapping.value}"`);
            break;
          }
        } catch (e) {
          // Field doesn't exist with this name, try next
        }
      }
    }
    
    // Handle checkboxes
    const checkboxMappings = [
      // Was transferor's principal residence
      { condition: data.was_principal_residence === true || data.was_transferor_principal_residence === true, 
        fieldNames: ['Was this property the transferor\'s principal residence Yes', 'Transferor Principal Residence Yes'] },
      { condition: data.was_principal_residence === false || data.was_transferor_principal_residence === false, 
        fieldNames: ['Was this property the transferor\'s principal residence? No', 'Transferor Principal Residence No'] },
      
      // Is transferee's principal residence
      { condition: data.is_transferee_principal_residence === true || data.principal_residence === true, 
        fieldNames: ['Is this property currently the transferee\'s principal residence? Yes', 'Transferee Principal Residence Yes'] },
      { condition: data.is_transferee_principal_residence === false || data.principal_residence === false, 
        fieldNames: ['Is this property currently the transferee\'s principal residence? No', 'Transferee Principal Residence No'] },
      
      // Homeowners exemption
      { condition: data.homeowners_exemption === true, fieldNames: ['Homeowners Exemption', 'homeowners_exemption'] },
      
      // Disabled veterans exemption
      { condition: data.disabled_veterans_exemption === true || data.disabled_veteran === true, 
        fieldNames: ['Disabled Veterans Exemption', 'disabled_veterans_exemption'] },
      
      // Was family farm
      { condition: data.was_family_farm === true || data.family_farm === true, 
        fieldNames: ['Was this property the transferor\'s family farm? Yes', 'Transferor Family Farm Yes'] },
      { condition: data.was_family_farm === false || data.family_farm === false, 
        fieldNames: ['Was this property the transferor\'s family farm? No', 'Transferor Family Farm No'] },
      
      // Is family farm
      { condition: data.is_family_farm === true, fieldNames: ['Is this property the transferee\'s family farm? Yes', 'Transferee Family Farm Yes'] },
      { condition: data.is_family_farm === false, fieldNames: ['Is this property the transferee\'s family farm? No', 'Transferee Family Farm No'] },
      
      // Joint tenancy
      { condition: data.joint_tenancy === true, fieldNames: ['Was this property owned in joint tenancy? Yes', 'Joint Tenancy Yes'] },
      { condition: data.joint_tenancy === false, fieldNames: ['Was this property owned in joint tenancy? No', 'Joint Tenancy No'] },
      
      // Partial interest
      { condition: data.partial_interest === true, fieldNames: ['Was only a partial interest in the property transferred? Yes', 'Partial Interest Yes'] },
      { condition: data.partial_interest === false, fieldNames: ['Was only a partial interest in the property transferred? No', 'Partial Interest No'] },
    ];
    
    // Check appropriate boxes
    for (const mapping of checkboxMappings) {
      if (!mapping.condition) continue;
      
      for (const fieldName of mapping.fieldNames) {
        try {
          const checkbox = form.getCheckBox(fieldName);
          if (checkbox) {
            checkbox.check();
            console.log(`Checked box "${fieldName}"`);
            break;
          }
        } catch (e) {
          // Checkbox doesn't exist with this name, try next
        }
      }
    }
    
    return await pdfDoc.save();
    
  } catch (error) {
    console.error('Error filling BOE-19-P form:', error);
    throw error;
  }
}

// Main function to fill all BOE forms
async function fillBOEForms(data) {
  const results = {};
  const errors = [];
  
  const forms = [
    { name: 'BOE-502-A', key: 'pcor', generate: data.generate_pcor, filler: fillPCOR },
    { name: 'BOE-502-D', key: 'boe_502d', generate: data.generate_502d, filler: fillBOE502D },
    { name: 'BOE-19-P', key: 'boe_19p', generate: data.generate_19p, filler: fillBOE19P },
  ];
  
  for (const { name, key, generate, filler } of forms) {
    if (!generate) {
      console.log(`Skipping ${name} - not requested`);
      continue;
    }
    
    try {
      console.log(`Processing ${name}...`);
      // Add .pdf extension when loading
      const pdfBytes = await loadPDFFromDeployedSite(`${name}.pdf`);
      const filledPdf = await filler(data, pdfBytes);
      results[key] = Buffer.from(filledPdf).toString('base64');
      console.log(`${name} completed successfully`);
    } catch (error) {
      console.error(`Error with ${name}:`, error);
      errors.push(`${name}: ${error.message}`);
    }
  }
  
  return { results, errors };
}

// Main handler
exports.handler = async (event, context) => {
  console.log('Generate BOE Forms handler called');
  console.log('Site URL:', process.env.URL || 'Not set');
  console.log('Deploy URL:', process.env.DEPLOY_URL || 'Not set');
  
  // Handle CORS preflight
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
  
  // Validate HTTP method
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
    // Parse request body
    const data = JSON.parse(event.body);
    console.log('Processing BOE forms for case:', data.case_number);
    console.log('Forms requested:', {
      pcor: data.generate_pcor,
      boe_502d: data.generate_502d,
      boe_19p: data.generate_19p
    });
    
    // Validate that at least one form is requested
    if (!data.generate_pcor && !data.generate_502d && !data.generate_19p) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'No forms selected for generation'
        })
      };
    }
    
    // Fill the forms
    const { results: documents, errors } = await fillBOEForms(data);
    
    // Check if any forms were generated
    if (Object.keys(documents).length === 0) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Failed to generate any forms',
          errors: errors
        })
      };
    }
    
    // Build successful response
    const response = {
      success: true,
      message: `Generated ${Object.keys(documents).length} BOE forms`,
      documents: documents,
      case_number: data.case_number,
      timestamp: new Date().toISOString(),
      metadata: {
        decedent: data.decedent_name,
        trustee: data.trustee_name,
        forms_generated: Object.keys(documents)
      }
    };
    
    // Add errors if any (partial success)
    if (errors.length > 0) {
      response.errors = errors;
      response.message += ` (${errors.length} forms failed)`;
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
    console.error('Error generating BOE forms:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to generate BOE forms',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
