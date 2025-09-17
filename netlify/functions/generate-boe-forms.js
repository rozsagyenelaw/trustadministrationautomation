// netlify/functions/generate-boe-forms.js
// COMPLETE VERSION with enhanced field mapping and debugging - FULL CODE

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
  
  const siteUrl = process.env.URL || process.env.DEPLOY_URL || 'https://trustadministration.netlify.app';
  const url = `${siteUrl}/public/templates/${filename}`;
  
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

// Helper function to analyze PDF form fields
function analyzePDFForm(form) {
  const fields = form.getFields();
  const fieldInfo = {};
  
  fields.forEach(field => {
    const name = field.getName();
    let type = 'unknown';
    
    try {
      if (field.constructor.name.includes('Text')) type = 'text';
      else if (field.constructor.name.includes('Check')) type = 'checkbox';
      else if (field.constructor.name.includes('Radio')) type = 'radio';
      else if (field.constructor.name.includes('Dropdown')) type = 'dropdown';
      else if (field.constructor.name.includes('List')) type = 'list';
    } catch (e) {
      // Fallback type detection
      try {
        form.getTextField(name);
        type = 'text';
      } catch (e1) {
        try {
          form.getCheckBox(name);
          type = 'checkbox';
        } catch (e2) {
          try {
            form.getRadioGroup(name);
            type = 'radio';
          } catch (e3) {
            type = 'other';
          }
        }
      }
    }
    
    fieldInfo[name] = type;
  });
  
  return fieldInfo;
}

// Fill BOE-502-A (PCOR) - Complete function
async function fillPCOR(data, pdfBytes) {
  try {
    console.log('Filling BOE-502-A (PCOR) form...');
    
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    
    // Analyze form fields
    const fieldInfo = analyzePDFForm(form);
    console.log('BOE-502-A field analysis:', JSON.stringify(fieldInfo, null, 2));
    
    // Get all fields
    const fields = form.getFields();
    
    // Process each field
    fields.forEach(field => {
      const fieldName = field.getName();
      let value = null;
      
      // Map data to field names - comprehensive mapping
      
      // Buyer/Transferee information
      if (fieldName.includes('NAME AND MAILING ADDRESS') || 
          fieldName === 'Rozsa Gyene' ||
          fieldName.includes('BUYER/TRANSFEREE')) {
        value = data.trustee_name || data.buyer_name;
      }
      else if (fieldName.includes('BUYER\'S EMAIL ADDRESS') || 
               fieldName === 'rozsagyenelaw@yahoo.com' ||
               fieldName.includes('EMAIL')) {
        value = data.trustee_email || data.buyer_email;
      }
      else if (fieldName.includes('BUYER\'S DAYTIME TELEPHONE NUMBER') || 
               fieldName === '8184344541' ||
               fieldName.includes('TELEPHONE') ||
               fieldName.includes('PHONE')) {
        value = data.trustee_phone || data.buyer_phone;
      }
      else if (fieldName.includes('ASSESSOR\'S PARCEL NUMBER') ||
               fieldName.includes('APN') ||
               fieldName.includes('PARCEL')) {
        value = data.apn;
      }
      
      // Seller information
      else if (fieldName.includes('SELLER/TRANSFEROR') || 
               fieldName === 'kurva anyadketto' ||
               fieldName.includes('SELLER')) {
        value = data.decedent_name || data.seller_name;
      }
      
      // Property address
      else if (fieldName.includes('STREET ADDRESS') || 
               fieldName === '1904 broadview drive' ||
               fieldName.includes('PHYSICAL LOCATION')) {
        value = data.property_address;
      }
      else if (fieldName === 'glendale' || 
               fieldName.includes('CITY') ||
               (fieldName.includes('city') && !fieldName.includes('STATE'))) {
        value = data.property_city;
      }
      else if (fieldName === 'CA' || 
               fieldName.includes('STATE') ||
               (fieldName.includes('state') && !fieldName.includes('CITY'))) {
        value = data.property_state || 'CA';
      }
      else if (fieldName === '91208' || 
               fieldName.includes('ZIP') ||
               fieldName.includes('zip')) {
        value = data.property_zip;
      }
      
      // Mail property tax information to
      else if (fieldName.includes('MAIL PROPERTY TAX INFORMATION TO (NAME)')) {
        value = data.mail_to_name || data.trustee_name;
      }
      else if (fieldName.includes('MAIL PROPERTY TAX INFORMATION TO (ADDRESS)')) {
        value = data.mail_to_address || data.trustee_address;
      }
      else if (fieldName.includes('MAIL') && fieldName.includes('CITY')) {
        value = data.mail_to_city || data.trustee_city;
      }
      else if (fieldName.includes('MAIL') && fieldName.includes('STATE')) {
        value = data.mail_to_state || data.trustee_state || 'CA';
      }
      else if (fieldName.includes('MAIL') && fieldName.includes('ZIP')) {
        value = data.mail_to_zip || data.trustee_zip;
      }
      
      // Try to set the value if we have one
      if (value) {
        try {
          if (fieldInfo[fieldName] === 'text') {
            const textField = form.getTextField(fieldName);
            textField.setText(String(value));
            console.log(`Set text field "${fieldName}" to "${value}"`);
          }
        } catch (e) {
          console.error(`Failed to set field "${fieldName}":`, e.message);
        }
      }
    });
    
    // Handle checkboxes for Part 1 - Transfer Information
    try {
      // A. Spouse transfer
      if (data.transfer_type === 'spouse') {
        const spouseFields = fields.filter(f => {
          const name = f.getName();
          return name.includes('between spouses') || 
                 name.includes('A.') ||
                 name.includes('spouse') ||
                 name.includes('death of a spouse');
        });
        spouseFields.forEach(field => {
          try {
            const checkbox = form.getCheckBox(field.getName());
            checkbox.check();
            console.log(`Checked spouse transfer box: ${field.getName()}`);
          } catch (e) {}
        });
      }
      
      // B. Domestic partner transfer
      if (data.transfer_type === 'domestic_partner') {
        const dpFields = fields.filter(f => {
          const name = f.getName();
          return name.includes('domestic partners') || 
                 name.includes('B.') ||
                 name.includes('registered with the California Secretary');
        });
        dpFields.forEach(field => {
          try {
            const checkbox = form.getCheckBox(field.getName());
            checkbox.check();
            console.log(`Checked domestic partner transfer box: ${field.getName()}`);
          } catch (e) {}
        });
      }
      
      // C. Parent-Child transfer
      if (data.transfer_type === 'parent_child') {
        const pcFields = fields.filter(f => {
          const name = f.getName();
          return name.includes('parent(s) and child(ren)') || 
                 name.includes('C.') ||
                 name.includes('between parent') ||
                 name.includes('grandparent(s) and grandchild(ren)');
        });
        pcFields.forEach(field => {
          try {
            const checkbox = form.getCheckBox(field.getName());
            checkbox.check();
            console.log(`Checked parent-child transfer box: ${field.getName()}`);
          } catch (e) {}
        });
        
        // Principal residence sub-question
        if (data.was_principal_residence === true) {
          const prYesFields = fields.filter(f => {
            const name = f.getName();
            return name.includes('principal residence') && 
                   (name.includes('YES') || name.includes('Yes'));
          });
          prYesFields.forEach(field => {
            try {
              const checkbox = form.getCheckBox(field.getName());
              checkbox.check();
              console.log(`Checked principal residence YES: ${field.getName()}`);
            } catch (e) {}
          });
        } else if (data.was_principal_residence === false) {
          const prNoFields = fields.filter(f => {
            const name = f.getName();
            return name.includes('principal residence') && 
                   (name.includes('NO') || name.includes('No'));
          });
          prNoFields.forEach(field => {
            try {
              const checkbox = form.getCheckBox(field.getName());
              checkbox.check();
              console.log(`Checked principal residence NO: ${field.getName()}`);
            } catch (e) {}
          });
        }
        
        // Family farm sub-question
        if (data.family_farm === true) {
          const ffYesFields = fields.filter(f => {
            const name = f.getName();
            return name.includes('family farm') && 
                   (name.includes('YES') || name.includes('Yes'));
          });
          ffYesFields.forEach(field => {
            try {
              const checkbox = form.getCheckBox(field.getName());
              checkbox.check();
              console.log(`Checked family farm YES: ${field.getName()}`);
            } catch (e) {}
          });
        } else if (data.family_farm === false) {
          const ffNoFields = fields.filter(f => {
            const name = f.getName();
            return name.includes('family farm') && 
                   (name.includes('NO') || name.includes('No'));
          });
          ffNoFields.forEach(field => {
            try {
              const checkbox = form.getCheckBox(field.getName());
              checkbox.check();
              console.log(`Checked family farm NO: ${field.getName()}`);
            } catch (e) {}
          });
        }
      }
      
      // D. Cotenant death
      if (data.transfer_type === 'cotenant_death') {
        const cotenantFields = fields.filter(f => {
          const name = f.getName();
          return name.includes('cotenant') || 
                 name.includes('D.') ||
                 name.includes('result of a cotenant\'s death');
        });
        cotenantFields.forEach(field => {
          try {
            const checkbox = form.getCheckBox(field.getName());
            checkbox.check();
            console.log(`Checked cotenant death box: ${field.getName()}`);
          } catch (e) {}
        });
        
        // Date of death for cotenant
        if (data.death_date) {
          const deathDateFields = fields.filter(f => 
            f.getName().includes('Date of death')
          );
          deathDateFields.forEach(field => {
            try {
              const textField = form.getTextField(field.getName());
              textField.setText(formatDate(data.death_date));
            } catch (e) {}
          });
        }
      }
      
      // L. Trust transfer
      if (data.transfer_type === 'trust') {
        const trustFields = fields.filter(f => {
          const name = f.getName();
          return name.includes('revocable trust') || 
                 name.includes('L.') ||
                 name.includes('L1.') ||
                 name.includes('to/from a revocable trust');
        });
        trustFields.forEach(field => {
          try {
            const checkbox = form.getCheckBox(field.getName());
            checkbox.check();
            console.log(`Checked trust transfer box: ${field.getName()}`);
          } catch (e) {}
        });
      }
      
      // Principal residence checkbox at top
      if (data.principal_residence === true) {
        const prFields = fields.filter(f => {
          const name = f.getName();
          return name.includes('This property is intended as my principal residence') && 
                 (name.includes('YES') || !name.includes('NO'));
        });
        prFields.forEach(field => {
          try {
            const checkbox = form.getCheckBox(field.getName());
            checkbox.check();
            console.log(`Checked principal residence intended: ${field.getName()}`);
          } catch (e) {}
        });
      }
      
      // Disabled veteran checkbox
      if (data.disabled_veteran === true) {
        const dvFields = fields.filter(f => {
          const name = f.getName();
          return name.includes('100% rated disabled veteran') && 
                 (name.includes('YES') || !name.includes('NO'));
        });
        dvFields.forEach(field => {
          try {
            const checkbox = form.getCheckBox(field.getName());
            checkbox.check();
            console.log(`Checked disabled veteran: ${field.getName()}`);
          } catch (e) {}
        });
      }
      
    } catch (e) {
      console.error('Error checking boxes:', e);
    }
    
    return await pdfDoc.save();
    
  } catch (error) {
    console.error('Error filling PCOR form:', error);
    throw error;
  }
}

// Fill BOE-502-D (Death of Real Property Owner) - Complete function
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

// Fill BOE-19-P (Parent-Child Exclusion) - Complete function
async function fillBOE19P(data, pdfBytes) {
  try {
    console.log('Filling BOE-19-P (Parent-Child Exclusion) form...');
    
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    
    // Analyze form fields
    const fieldInfo = analyzePDFForm(form);
    console.log('BOE-19-P field analysis:', JSON.stringify(fieldInfo, null, 2));
    
    const fields = form.getFields();
    
    // Process each field with comprehensive mapping
    fields.forEach(field => {
      const fieldName = field.getName();
      let value = null;
      
      // Property information section
      if (fieldName.includes('ASSESSOR\'S PARCEL') || 
          fieldName.includes('PARCEL/ID NUMBER') ||
          fieldName.includes('PARCEL NUMBER')) {
        value = data.apn;
      }
      else if (fieldName === '1904 broadview drive' || 
               fieldName.includes('PROPERTY ADDRESS') ||
               (fieldName.includes('ADDRESS') && !fieldName.includes('MAILING'))) {
        value = data.property_address;
      }
      else if (fieldName === 'glendale' || 
               (fieldName.includes('CITY') && !fieldName.includes('COUNTY'))) {
        value = data.property_city;
      }
      else if (fieldName.includes('COUNTY')) {
        value = data.property_county || 'LOS ANGELES';
      }
      else if (fieldName.includes('DATE OF PURCHASE') || 
               fieldName.includes('TRANSFER') ||
               fieldName === '02/02/2000') {
        value = formatDate(data.transfer_date || data.death_date);
      }
      else if (fieldName.includes('RECORDER') || 
               fieldName.includes('DOCUMENT NUMBER')) {
        value = data.document_number;
      }
      else if (fieldName.includes('DATE OF DEATH') || 
               fieldName === '09/16/2025') {
        value = formatDate(data.death_date);
      }
      else if (fieldName.includes('PROBATE NUMBER')) {
        value = data.probate_number;
      }
      else if (fieldName.includes('DATE OF DECREE')) {
        value = formatDate(data.decree_date);
      }
      
      // Transferor (Parent) information - Section B
      else if ((fieldName === 'kurva anyadketto' || 
                fieldName === 'Name' ||
                (fieldName.includes('Name') && !fieldName.includes('PRINTED') && !fieldName.includes('_'))) &&
               !value) {
        value = data.decedent_name || data.seller_name;
      }
      else if (fieldName === 'Parent' || 
               (fieldName === 'Relationship' && !fieldName.includes('_'))) {
        value = 'Parent';
      }
      else if (fieldName === 'Name_2') {
        value = data.transferor2_name;
      }
      else if (fieldName === 'Relationship_2') {
        value = data.transferor2_relationship || 'Parent';
      }
      
      // Transferee (Child) information - Section D
      else if (fieldName === 'Name_3' || 
               (fieldName === 'Rozsa Gyene' && !fieldName.includes('PRINTED'))) {
        value = data.trustee_name || data.buyer_name;
      }
      else if (fieldName === 'Relationship_3' || 
               fieldName === 'Child') {
        value = 'Child';
      }
      else if (fieldName === 'Name_4') {
        value = data.transferee2_name;
      }
      else if (fieldName === 'Relationship_4') {
        value = data.transferee2_relationship || 'Child';
      }
      
      // Certification/Signature section
      else if (fieldName.includes('PRINTED NAME') || 
               (fieldName === 'Rozsa Gyene' && field.getName().includes('PRINTED'))) {
        value = data.trustee_name || data.buyer_name;
      }
      else if (fieldName === 'PRINTED NAME_2') {
        value = data.signer2_name;
      }
      else if ((fieldName === 'DATE' || fieldName === '09/17/2025') && 
               !fieldName.includes('DEATH') && !fieldName.includes('PURCHASE')) {
        value = formatDate(new Date());
      }
      else if (fieldName === 'DATE_2') {
        value = formatDate(new Date());
      }
      else if (fieldName.includes('MAILING ADDRESS') || 
               (fieldName === '1904 broadview drive' && fieldName.includes('MAILING'))) {
        value = data.trustee_address || data.buyer_address;
      }
      else if (fieldName.includes('CITY, STATE, ZIP')) {
        value = `${data.trustee_city || data.buyer_city}, ${data.trustee_state || data.buyer_state || 'CA'} ${data.trustee_zip || data.buyer_zip}`;
      }
      else if (fieldName === '8184344541' || 
               fieldName.includes('DAYTIME PHONE NUMBER') ||
               fieldName.includes('PHONE')) {
        value = data.trustee_phone || data.buyer_phone;
      }
      else if (fieldName === 'rozsagyenelaw@yahoo.com' || 
               fieldName.includes('EMAIL ADDRESS')) {
        value = data.trustee_email || data.buyer_email;
      }
      else if (fieldName.includes('percentage transferred')) {
        value = data.percentage_transferred;
      }
      
      // Try to set the value
      if (value) {
        try {
          if (fieldInfo[fieldName] === 'text') {
            const textField = form.getTextField(fieldName);
            textField.setText(String(value));
            console.log(`Set text field "${fieldName}" to "${value}"`);
          }
        } catch (e) {
          console.error(`Failed to set field "${fieldName}":`, e.message);
        }
      }
    });
    
    // Handle checkboxes - comprehensive checkbox handling
    try {
      // Was this the transferor's family farm?
      if (data.was_family_farm === true || data.family_farm === true) {
        const farmYesFields = fields.filter(f => {
          const name = f.getName();
          return name.includes('transferor\'s family farm') && 
                 (name.includes('Yes') || name.includes('YES'));
        });
        farmYesFields.forEach(field => {
          try {
            const checkbox = form.getCheckBox(field.getName());
            checkbox.check();
            console.log(`Checked transferor's family farm YES`);
          } catch (e) {}
        });
      } else if (data.was_family_farm === false || data.family_farm === false) {
        const farmNoFields = fields.filter(f => {
          const name = f.getName();
          return name.includes('transferor\'s family farm') && 
                 (name.includes('No') || name.includes('NO'));
        });
        farmNoFields.forEach(field => {
          try {
            const checkbox = form.getCheckBox(field.getName());
            checkbox.check();
            console.log(`Checked transferor's family farm NO`);
          } catch (e) {}
        });
      }
      
      // Was this the transferor's principal residence?
      if (data.was_principal_residence === true || data.was_transferor_principal_residence === true) {
        const prYesFields = fields.filter(f => {
          const name = f.getName();
          return name.includes('transferor\'s principal residence') && 
                 (name.includes('Yes') || name.includes('YES'));
        });
        prYesFields.forEach(field => {
          try {
            const checkbox = form.getCheckBox(field.getName());
            checkbox.check();
            console.log(`Checked transferor's principal residence YES`);
          } catch (e) {}
        });
      } else if (data.was_principal_residence === false || data.was_transferor_principal_residence === false) {
        const prNoFields = fields.filter(f => {
          const name = f.getName();
          return name.includes('transferor\'s principal residence') && 
                 (name.includes('No') || name.includes('NO'));
        });
        prNoFields.forEach(field => {
          try {
            const checkbox = form.getCheckBox(field.getName());
            checkbox.check();
            console.log(`Checked transferor's principal residence NO`);
          } catch (e) {}
        });
      }
      
      // Homeowners' Exemption
      if (data.homeowners_exemption === true) {
        const heFields = fields.filter(f => 
          f.getName().includes('Homeowners') && f.getName().includes('Exemption')
        );
        heFields.forEach(field => {
          try {
            const checkbox = form.getCheckBox(field.getName());
            checkbox.check();
            console.log(`Checked Homeowners' Exemption`);
          } catch (e) {}
        });
      }
      
      // Disabled Veterans' Exemption
      if (data.disabled_veterans_exemption === true || data.disabled_veteran === true) {
        const dvFields = fields.filter(f => 
          f.getName().includes('Disabled Veterans') && f.getName().includes('Exemption')
        );
        dvFields.forEach(field => {
          try {
            const checkbox = form.getCheckBox(field.getName());
            checkbox.check();
            console.log(`Checked Disabled Veterans' Exemption`);
          } catch (e) {}
        });
      }
      
      // Was only a partial interest transferred?
      if (data.partial_interest === true) {
        const piYesFields = fields.filter(f => {
          const name = f.getName();
          return name.includes('partial interest') && 
                 (name.includes('Yes') || name.includes('YES'));
        });
        piYesFields.forEach(field => {
          try {
            const checkbox = form.getCheckBox(field.getName());
            checkbox.check();
            console.log(`Checked partial interest YES`);
          } catch (e) {}
        });
      } else if (data.partial_interest === false) {
        const piNoFields = fields.filter(f => {
          const name = f.getName();
          return name.includes('partial interest') && 
                 (name.includes('No') || name.includes('NO'));
        });
        piNoFields.forEach(field => {
          try {
            const checkbox = form.getCheckBox(field.getName());
            checkbox.check();
            console.log(`Checked partial interest NO`);
          } catch (e) {}
        });
      }
      
      // Was this property owned in joint tenancy?
      if (data.joint_tenancy === true) {
        const jtYesFields = fields.filter(f => {
          const name = f.getName();
          return name.includes('joint tenancy') && 
                 (name.includes('Yes') || name.includes('YES'));
        });
        jtYesFields.forEach(field => {
          try {
            const checkbox = form.getCheckBox(field.getName());
            checkbox.check();
            console.log(`Checked joint tenancy YES`);
          } catch (e) {}
        });
      } else if (data.joint_tenancy === false) {
        const jtNoFields = fields.filter(f => {
          const name = f.getName();
          return name.includes('joint tenancy') && 
                 (name.includes('No') || name.includes('NO'));
        });
        jtNoFields.forEach(field => {
          try {
            const checkbox = form.getCheckBox(field.getName());
            checkbox.check();
            console.log(`Checked joint tenancy NO`);
          } catch (e) {}
        });
      }
      
      // Is this the transferee's family farm?
      if (data.is_family_farm === true) {
        const tffYesFields = fields.filter(f => {
          const name = f.getName();
          return name.includes('transferee\'s family farm') && 
                 (name.includes('Yes') || name.includes('YES'));
        });
        tffYesFields.forEach(field => {
          try {
            const checkbox = form.getCheckBox(field.getName());
            checkbox.check();
            console.log(`Checked transferee's family farm YES`);
          } catch (e) {}
        });
      } else if (data.is_family_farm === false) {
        const tffNoFields = fields.filter(f => {
          const name = f.getName();
          return name.includes('transferee\'s family farm') && 
                 (name.includes('No') || name.includes('NO'));
        });
        tffNoFields.forEach(field => {
          try {
            const checkbox = form.getCheckBox(field.getName());
            checkbox.check();
            console.log(`Checked transferee's family farm NO`);
          } catch (e) {}
        });
      }
      
      // Is this the transferee's principal residence?
      if (data.is_transferee_principal_residence === true || data.principal_residence === true) {
        const tprYesFields = fields.filter(f => {
          const name = f.getName();
          return name.includes('transferee\'s principal residence') && 
                 (name.includes('Yes') || name.includes('YES'));
        });
        tprYesFields.forEach(field => {
          try {
            const checkbox = form.getCheckBox(field.getName());
            checkbox.check();
            console.log(`Checked transferee's principal residence YES`);
          } catch (e) {}
        });
      } else if (data.is_transferee_principal_residence === false || data.principal_residence === false) {
        const tprNoFields = fields.filter(f => {
          const name = f.getName();
          return name.includes('transferee\'s principal residence') && 
                 (name.includes('No') || name.includes('NO'));
        });
        tprNoFields.forEach(field => {
          try {
            const checkbox = form.getCheckBox(field.getName());
            checkbox.check();
            console.log(`Checked transferee's principal residence NO`);
          } catch (e) {}
        });
      }
      
    } catch (e) {
      console.error('Error checking boxes:', e);
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
    console.log('Input data:', JSON.stringify(data, null, 2));
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
