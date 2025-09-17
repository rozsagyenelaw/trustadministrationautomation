// netlify/functions/generate-boe-forms.js
// COMPLETE VERSION - DO NOT SHORTEN - FULL CODE WITH ALL FUNCTIONS

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

// Helper function to try multiple field names
async function tryFillTextField(form, fieldNames, value) {
  if (!value) return false;
  
  for (const fieldName of fieldNames) {
    try {
      const field = form.getTextField(fieldName);
      if (field) {
        field.setText(String(value));
        console.log(`Filled field "${fieldName}" with "${value}"`);
        return true;
      }
    } catch (e) {
      // Field doesn't exist with this name, try next
    }
  }
  return false;
}

// Helper function to try multiple checkbox names
async function tryCheckBox(form, fieldNames) {
  for (const fieldName of fieldNames) {
    try {
      const checkbox = form.getCheckBox(fieldName);
      if (checkbox) {
        checkbox.check();
        console.log(`Checked box "${fieldName}"`);
        return true;
      }
    } catch (e) {
      // Checkbox doesn't exist with this name, try next
    }
  }
  return false;
}

// Fill BOE-502-A (PCOR) - COMPLETE FUNCTION
async function fillPCOR(data, pdfBytes) {
  try {
    console.log('Filling BOE-502-A (PCOR) form...');
    console.log('Input data for PCOR:', JSON.stringify(data, null, 2));
    
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    
    // Get all fields for debugging
    const fields = form.getFields();
    console.log('BOE-502-A available fields:', fields.map(f => f.getName()));
    
    // TOP SECTION - NAME AND MAILING ADDRESS OF BUYER/TRANSFEREE (Left box)
    // This should be a multi-line field with name and address
    await tryFillTextField(form, [
      'NAME AND MAILING ADDRESS OF BUYER/TRANSFEREE',
      'NAME AND MAILING ADDRESS',
      'Name and Mailing Address',
      'Rozsa Gyene',
      'Text1'
    ], `${data.trustee_name || data.buyer_name || ''}\n${data.trustee_address || data.buyer_address || ''}`);
    
    // TOP SECTION RIGHT SIDE - APN
    await tryFillTextField(form, [
      'ASSESSOR\'S PARCEL NUMBER',
      'ASSESSORS PARCEL NUMBER',
      'APN',
      'Assessor Parcel Number',
      'Text2'
    ], data.apn);
    
    // BUYER'S EMAIL ADDRESS
    await tryFillTextField(form, [
      'BUYER\'S EMAIL ADDRESS',
      'BUYERS EMAIL ADDRESS',
      'Email',
      'Buyer Email',
      'rozsagyenelaw@yahoo.com',
      'Text3'
    ], data.trustee_email || data.buyer_email);
    
    // BUYER'S DAYTIME TELEPHONE NUMBER
    await tryFillTextField(form, [
      'BUYER\'S DAYTIME TELEPHONE NUMBER',
      'BUYERS DAYTIME TELEPHONE NUMBER',
      'Phone',
      'Telephone',
      '8184344541',
      'Text4'
    ], data.trustee_phone || data.buyer_phone);
    
    // SELLER/TRANSFEROR
    await tryFillTextField(form, [
      'SELLER/TRANSFEROR',
      'SELLER TRANSFEROR',
      'Seller',
      'kurva anyadketto',
      'Text5'
    ], data.decedent_name || data.seller_name);
    
    // STREET ADDRESS OR PHYSICAL LOCATION OF REAL PROPERTY
    await tryFillTextField(form, [
      'STREET ADDRESS OR PHYSICAL LOCATION OF REAL PROPERTY',
      'STREET ADDRESS',
      'Property Address',
      '1904 broadview drive',
      'Text6'
    ], data.property_address);
    
    // PROPERTY CITY, STATE, ZIP - these might be separate fields
    await tryFillTextField(form, [
      'CITY',
      'Property City',
      'glendale',
      'Text7'
    ], data.property_city);
    
    await tryFillTextField(form, [
      'STATE',
      'Property State',
      'CA',
      'Text8'
    ], data.property_state || 'CA');
    
    await tryFillTextField(form, [
      'ZIP CODE',
      'ZIP',
      'Property Zip',
      '91208',
      'Text9'
    ], data.property_zip);
    
    // Principal residence checkbox section (top of form)
    if (data.principal_residence === true) {
      await tryCheckBox(form, [
        'This property is intended as my principal residence YES',
        'Principal Residence YES',
        'YES',
        'Check Box1'
      ]);
      
      // Date of occupancy
      if (data.occupancy_date) {
        await tryFillTextField(form, [
          'MO',
          'Month',
          'Text10'
        ], new Date(data.occupancy_date).getMonth() + 1);
        
        await tryFillTextField(form, [
          'DAY',
          'Day',
          'Text11'
        ], new Date(data.occupancy_date).getDate());
        
        await tryFillTextField(form, [
          'YEAR',
          'Year',
          'Text12'
        ], new Date(data.occupancy_date).getFullYear());
      }
    } else if (data.principal_residence === false) {
      await tryCheckBox(form, [
        'This property is intended as my principal residence NO',
        'Principal Residence NO',
        'NO',
        'Check Box2'
      ]);
    }
    
    // Disabled veteran checkbox
    if (data.disabled_veteran === true) {
      await tryCheckBox(form, [
        'Are you a 100% rated disabled veteran YES',
        'Disabled Veteran YES',
        'YES',
        'Check Box3'
      ]);
    } else if (data.disabled_veteran === false) {
      await tryCheckBox(form, [
        'Are you a 100% rated disabled veteran NO',
        'Disabled Veteran NO',
        'NO',
        'Check Box4'
      ]);
    }
    
    // MAIL PROPERTY TAX INFORMATION TO section
    await tryFillTextField(form, [
      'MAIL PROPERTY TAX INFORMATION TO (NAME)',
      'MAIL PROPERTY TAX INFORMATION TO NAME',
      'Mail To Name',
      'Text13'
    ], data.mail_to_name || data.trustee_name || data.buyer_name);
    
    await tryFillTextField(form, [
      'MAIL PROPERTY TAX INFORMATION TO (ADDRESS)',
      'MAIL PROPERTY TAX INFORMATION TO ADDRESS',
      'Mail To Address',
      'Text14'
    ], data.mail_to_address || data.trustee_address || data.buyer_address);
    
    await tryFillTextField(form, [
      'MAIL CITY',
      'Mail City',
      'glendale',
      'Text15'
    ], data.mail_to_city || data.trustee_city || data.buyer_city || data.property_city);
    
    await tryFillTextField(form, [
      'MAIL STATE',
      'Mail State',
      'CA',
      'Text16'
    ], data.mail_to_state || data.trustee_state || data.buyer_state || 'CA');
    
    await tryFillTextField(form, [
      'MAIL ZIP CODE',
      'Mail Zip',
      '91208',
      'Text17'
    ], data.mail_to_zip || data.trustee_zip || data.buyer_zip || data.property_zip);
    
    // PART 1 - TRANSFER INFORMATION
    // A. Spouse transfer
    if (data.transfer_type === 'spouse') {
      await tryCheckBox(form, [
        'A. This transfer is solely between spouses',
        'A',
        'Check Box5'
      ]);
    }
    
    // B. Domestic partner transfer
    if (data.transfer_type === 'domestic_partner') {
      await tryCheckBox(form, [
        'B. This transfer is solely between domestic partners',
        'B',
        'Check Box6'
      ]);
    }
    
    // C. Parent-Child or Grandparent-Grandchild transfer
    if (data.transfer_type === 'parent_child') {
      await tryCheckBox(form, [
        'C. This is a transfer:',
        'C',
        'Check Box7'
      ]);
      
      // Sub-checkbox for parent-child
      await tryCheckBox(form, [
        'between parent(s) and child(ren)',
        'parent child',
        'Check Box8'
      ]);
      
      // Was this the transferor's principal residence?
      if (data.was_principal_residence === true) {
        await tryCheckBox(form, [
          'Was this the transferor/grantor\'s principal residence? YES',
          'Transferor Principal Residence YES',
          'Check Box9'
        ]);
      } else if (data.was_principal_residence === false) {
        await tryCheckBox(form, [
          'Was this the transferor/grantor\'s principal residence? NO',
          'Transferor Principal Residence NO',
          'Check Box10'
        ]);
      }
      
      // Is this a family farm?
      if (data.family_farm === true) {
        await tryCheckBox(form, [
          'Is this a family farm? YES',
          'Family Farm YES',
          'Check Box11'
        ]);
      } else if (data.family_farm === false) {
        await tryCheckBox(form, [
          'Is this a family farm? NO',
          'Family Farm NO',
          'Check Box12'
        ]);
      }
    }
    
    // For grandparent-grandchild
    if (data.transfer_type === 'grandparent_grandchild') {
      await tryCheckBox(form, [
        'C. This is a transfer:',
        'C',
        'Check Box7'
      ]);
      
      await tryCheckBox(form, [
        'between grandparent(s) and grandchild(ren)',
        'grandparent grandchild',
        'Check Box13'
      ]);
    }
    
    // D. Cotenant death
    if (data.transfer_type === 'cotenant_death') {
      await tryCheckBox(form, [
        'D. This transfer is the result of a cotenant\'s death',
        'D',
        'Check Box14'
      ]);
      
      // Date of death
      if (data.death_date) {
        await tryFillTextField(form, [
          'Date of death',
          'Death Date',
          'Text18'
        ], formatDate(data.death_date));
      }
    }
    
    // E. Principal residence replacement 55+ years
    if (data.transfer_type === 'replacement_55') {
      await tryCheckBox(form, [
        'E. This transaction is to replace a principal residence owned by a person 55 years of age or older',
        'E',
        'Check Box15'
      ]);
    }
    
    // F. Severely disabled replacement
    if (data.transfer_type === 'replacement_disabled') {
      await tryCheckBox(form, [
        'F. This transaction is to replace a principal residence by a person who is severely disabled',
        'F',
        'Check Box16'
      ]);
    }
    
    // G. Wildfire/natural disaster replacement
    if (data.transfer_type === 'replacement_disaster') {
      await tryCheckBox(form, [
        'G. This transaction is to replace a principal residence substantially damaged or destroyed by a wildfire or natural disaster',
        'G',
        'Check Box17'
      ]);
    }
    
    // H. Name correction
    if (data.name_correction === true) {
      await tryCheckBox(form, [
        'H. This transaction is only a correction of the name(s)',
        'H',
        'Check Box18'
      ]);
      
      await tryFillTextField(form, [
        'If YES, please explain:',
        'Name Correction Explanation',
        'Text19'
      ], data.name_correction_explanation);
    }
    
    // I. Lender's interest
    if (data.lender_interest === true) {
      await tryCheckBox(form, [
        'I. The recorded document creates, terminates, or reconveys a lender\'s interest',
        'I',
        'Check Box19'
      ]);
    }
    
    // J. Security interest
    if (data.security_interest === true) {
      await tryCheckBox(form, [
        'J. This transaction is recorded only as a requirement for financing',
        'J',
        'Check Box20'
      ]);
      
      await tryFillTextField(form, [
        'If YES, please explain:',
        'Security Interest Explanation',
        'Text20'
      ], data.security_interest_explanation);
    }
    
    // K. Trustee substitution
    if (data.trustee_substitution === true) {
      await tryCheckBox(form, [
        'K. The recorded document substitutes a trustee',
        'K',
        'Check Box21'
      ]);
    }
    
    // L. Trust transfer - ONLY CHECK REVOCABLE, NOT IRREVOCABLE
    if (data.transfer_type === 'trust') {
      await tryCheckBox(form, [
        'L. This is a transfer of property:',
        'L',
        'Check Box22'
      ]);
      
      // Check box 1 for REVOCABLE trust
      await tryCheckBox(form, [
        '1. to/from a revocable trust',
        '1',
        'L1',
        'Check Box23'
      ]);
      
      // DO NOT CHECK IRREVOCABLE (box 2)
    }
    
    // M. Lease 35+ years
    if (data.lease_35_years === true) {
      await tryCheckBox(form, [
        'M. This property is subject to a lease with a remaining lease term of 35 years or more',
        'M',
        'Check Box24'
      ]);
    }
    
    // N. Proportional interests
    if (data.proportional_interests === true) {
      await tryCheckBox(form, [
        'N. This is a transfer between parties in which proportional interests',
        'N',
        'Check Box25'
      ]);
    }
    
    // O. Low-income housing
    if (data.low_income_housing === true) {
      await tryCheckBox(form, [
        'O. This is a transfer subject to subsidized low-income housing',
        'O',
        'Check Box26'
      ]);
    }
    
    // P. Solar energy system
    if (data.solar_energy === true) {
      await tryCheckBox(form, [
        'P. This transfer is to the first purchaser of a new building containing a leased owned active solar energy system',
        'P',
        'Check Box27'
      ]);
    }
    
    // Q. Other
    if (data.other_transfer === true) {
      await tryCheckBox(form, [
        'Q. Other',
        'Q',
        'Check Box28'
      ]);
      
      await tryFillTextField(form, [
        'Other. This transfer is to',
        'Other Explanation',
        'Text21'
      ], data.other_transfer_explanation);
    }
    
    // Additional information field at bottom of Part 1
    if (data.additional_transfer_info) {
      await tryFillTextField(form, [
        'Please provide any other information',
        'Additional Information',
        'Text22'
      ], data.additional_transfer_info);
    }
    
    return await pdfDoc.save();
    
  } catch (error) {
    console.error('Error filling PCOR form:', error);
    throw error;
  }
}

// Fill BOE-19-P (Parent-Child Exclusion) - COMPLETE FUNCTION
async function fillBOE19P(data, pdfBytes) {
  try {
    console.log('Filling BOE-19-P (Parent-Child Exclusion) form...');
    console.log('Input data for BOE-19-P:', JSON.stringify(data, null, 2));
    
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    
    // Get all fields for debugging
    const fields = form.getFields();
    console.log('BOE-19-P available fields:', fields.map(f => f.getName()));
    
    // TOP SECTION - NAME AND MAILING ADDRESS
    // This needs to include the address
    await tryFillTextField(form, [
      'NAME AND MAILING ADDRESS',
      'Name and Mailing Address',
      'kurvan edesanayad',
      'Text1'
    ], `${data.trustee_name || data.buyer_name || ''}\n${data.trustee_address || data.buyer_address || ''}`);
    
    // SECTION A - PROPERTY
    // Assessor's Parcel/ID Number
    await tryFillTextField(form, [
      'ASSESSOR\'S PARCEL/ID NUMBER',
      'ASSESSORS PARCEL ID NUMBER',
      'APN',
      'Parcel Number',
      'Text2'
    ], data.apn);
    
    // Date of Purchase or Transfer
    await tryFillTextField(form, [
      'DATE OF PURCHASE OR TRANSFER',
      'Purchase Date',
      '01/01/1990',
      'Text3'
    ], formatDate(data.transfer_date || data.death_date));
    
    // Recorder's Document Number
    await tryFillTextField(form, [
      'RECORDER\'S DOCUMENT NUMBER',
      'RECORDERS DOCUMENT NUMBER',
      'Document Number',
      'Text4'
    ], data.document_number);
    
    // Date of Death
    await tryFillTextField(form, [
      'DATE OF DEATH (if applicable)',
      'DATE OF DEATH',
      'Death Date',
      '09/16/2025',
      'Text5'
    ], formatDate(data.death_date));
    
    // Probate Number
    await tryFillTextField(form, [
      'PROBATE NUMBER (if applicable)',
      'PROBATE NUMBER',
      'Probate',
      'Text6'
    ], data.probate_number);
    
    // Date of Decree of Distribution
    await tryFillTextField(form, [
      'DATE OF DECREE OF DISTRIBUTION (if applicable)',
      'DATE OF DECREE OF DISTRIBUTION',
      'Decree Date',
      'Text7'
    ], formatDate(data.decree_date));
    
    // Property Address
    await tryFillTextField(form, [
      'PROPERTY ADDRESS',
      'Property Address',
      '1904 broadview drive',
      'Text8'
    ], data.property_address);
    
    // City
    await tryFillTextField(form, [
      'CITY',
      'Property City',
      'glendale',
      'Text9'
    ], data.property_city);
    
    // SECTION B - TRANSFEROR(S)/SELLER(S)
    // Name of first transferor
    await tryFillTextField(form, [
      'Name',
      'Transferor Name',
      'kurvan edesanayad',
      'Text10'
    ], data.decedent_name || data.seller_name);
    
    // Relationship of first transferor
    await tryFillTextField(form, [
      'Relationship',
      'Transferor Relationship',
      'Parent',
      'Text11'
    ], 'Parent');
    
    // Name of second transferor (if any)
    if (data.transferor2_name) {
      await tryFillTextField(form, [
        'Name_2',
        'Transferor Name 2',
        'Text12'
      ], data.transferor2_name);
      
      await tryFillTextField(form, [
        'Relationship_2',
        'Transferor Relationship 2',
        'Text13'
      ], data.transferor2_relationship || 'Parent');
    }
    
    // Questions about transferor's property
    // 1. Was this property the transferor's family farm?
    if (data.was_family_farm === true || data.family_farm === true) {
      await tryCheckBox(form, [
        'Was this property the transferor\'s family farm? Yes',
        'Family Farm Yes',
        'Check Box1'
      ]);
      
      // How is property used checkboxes
      if (data.farm_use_pasture) {
        await tryCheckBox(form, [
          'Pasture/Grazing',
          'Pasture',
          'Check Box2'
        ]);
      }
      if (data.farm_use_commodity) {
        await tryCheckBox(form, [
          'Agricultural Commodity',
          'Commodity',
          'Check Box3'
        ]);
      }
      if (data.farm_use_cultivation) {
        await tryCheckBox(form, [
          'Cultivation',
          'Check Box4'
        ]);
        
        await tryFillTextField(form, [
          'Cultivation:',
          'Cultivation Type',
          'Text14'
        ], data.cultivation_type);
      }
    } else if (data.was_family_farm === false || data.family_farm === false) {
      await tryCheckBox(form, [
        'Was this property the transferor\'s family farm? No',
        'Family Farm No',
        'Check Box5'
      ]);
    }
    
    // 2. Was this property the transferor's principal residence?
    if (data.was_principal_residence === true || data.was_transferor_principal_residence === true) {
      await tryCheckBox(form, [
        'Was this property the transferor\'s principal residence? Yes',
        'Transferor Principal Residence Yes',
        'Check Box6'
      ]);
      
      // Exemptions sub-questions
      if (data.homeowners_exemption === true) {
        await tryCheckBox(form, [
          'Homeowners\' Exemption',
          'Homeowners Exemption',
          'Check Box7'
        ]);
      }
      if (data.disabled_veterans_exemption === true) {
        await tryCheckBox(form, [
          'Disabled Veterans\' Exemption',
          'Disabled Veterans Exemption',
          'Check Box8'
        ]);
      }
      
      // Multi-unit property?
      if (data.multi_unit === true) {
        await tryCheckBox(form, [
          'Is this property a multi-unit property? Yes',
          'Multi Unit Yes',
          'Check Box9'
        ]);
        
        await tryFillTextField(form, [
          'If yes, which unit was the transferor\'s principal residence?',
          'Unit Number',
          'Text15'
        ], data.transferor_unit);
      } else if (data.multi_unit === false) {
        await tryCheckBox(form, [
          'Is this property a multi-unit property? No',
          'Multi Unit No',
          'Check Box10'
        ]);
      }
    } else if (data.was_principal_residence === false || data.was_transferor_principal_residence === false) {
      await tryCheckBox(form, [
        'Was this property the transferor\'s principal residence? No',
        'Transferor Principal Residence No',
        'Check Box11'
      ]);
    }
    
    // 3. Was only a partial interest in the property transferred?
    if (data.partial_interest === true) {
      await tryCheckBox(form, [
        'Was only a partial interest in the property transferred? Yes',
        'Partial Interest Yes',
        'Check Box12'
      ]);
      
      await tryFillTextField(form, [
        'If yes, percentage transferred',
        'Percentage',
        'Text16'
      ], data.percentage_transferred);
    } else if (data.partial_interest === false) {
      await tryCheckBox(form, [
        'Was only a partial interest in the property transferred? No',
        'Partial Interest No',
        'Check Box13'
      ]);
    }
    
    // 4. Was this property owned in joint tenancy?
    if (data.joint_tenancy === true) {
      await tryCheckBox(form, [
        'Was this property owned in joint tenancy? Yes',
        'Joint Tenancy Yes',
        'Check Box14'
      ]);
    } else if (data.joint_tenancy === false) {
      await tryCheckBox(form, [
        'Was this property owned in joint tenancy? No',
        'Joint Tenancy No',
        'Check Box15'
      ]);
    }
    
    // CERTIFICATION SECTION - Bottom of page 1
    // Printed Name
    await tryFillTextField(form, [
      'PRINTED NAME',
      'Printed Name',
      'Rozsa Gyene',
      'Text17'
    ], data.trustee_name || data.buyer_name);
    
    // Date
    await tryFillTextField(form, [
      'DATE',
      'Sign Date',
      '09/17/2025',
      'Text18'
    ], formatDate(new Date()));
    
    // Mailing Address
    await tryFillTextField(form, [
      'MAILING ADDRESS',
      'Mailing Address',
      '1904 broadview drive',
      'Text19'
    ], data.trustee_address || data.buyer_address);
    
    // City, State, ZIP
    await tryFillTextField(form, [
      'CITY, STATE, ZIP',
      'City State Zip',
      'glendale',
      'Text20'
    ], `${data.trustee_city || data.buyer_city || ''}, ${data.trustee_state || 'CA'} ${data.trustee_zip || data.buyer_zip || ''}`);
    
    // Daytime Phone Number
    await tryFillTextField(form, [
      'DAYTIME PHONE NUMBER',
      'Phone',
      '8184344541',
      'Text21'
    ], data.trustee_phone || data.buyer_phone);
    
    // Email Address
    await tryFillTextField(form, [
      'EMAIL ADDRESS',
      'Email',
      'rozsagyenelaw@yahoo.com',
      '1904 broadview drive',
      'Text22'
    ], data.trustee_email || data.buyer_email);
    
    // Second signature if needed
    if (data.signer2_name) {
      await tryFillTextField(form, [
        'PRINTED NAME_2',
        'Printed Name 2',
        'Text23'
      ], data.signer2_name);
      
      await tryFillTextField(form, [
        'DATE_2',
        'Sign Date 2',
        'Text24'
      ], formatDate(new Date()));
    }
    
    // PAGE 2 - SECTION C - PARENT-CHILD RELATIONSHIP INFORMATION
    // PAGE 2 - SECTION D - TRANSFEREE(S)/BUYER(S)
    // Name of first transferee
    await tryFillTextField(form, [
      'Name_3',
      'Transferee Name',
      'Rozsa Gyene',
      'Text25'
    ], data.trustee_name || data.buyer_name);
    
    // Relationship of first transferee
    await tryFillTextField(form, [
      'Relationship_3',
      'Transferee Relationship',
      'Child',
      'Text26'
    ], 'Child');
    
    // Name of second transferee (if any)
    if (data.transferee2_name) {
      await tryFillTextField(form, [
        'Name_4',
        'Transferee Name 2',
        'Text27'
      ], data.transferee2_name);
      
      await tryFillTextField(form, [
        'Relationship_4',
        'Transferee Relationship 2',
        'Text28'
      ], data.transferee2_relationship || 'Child');
    }
    
    // Is this property the transferee's family farm?
    if (data.is_family_farm === true) {
      await tryCheckBox(form, [
        'Is this property the transferee\'s family farm? Yes',
        'Transferee Family Farm Yes',
        'Check Box16'
      ]);
    } else if (data.is_family_farm === false) {
      await tryCheckBox(form, [
        'Is this property the transferee\'s family farm? No',
        'Transferee Family Farm No',
        'Check Box17'
      ]);
    }
    
    // Is this property currently the transferee's principal residence?
    if (data.principal_residence === true || data.is_transferee_principal_residence === true) {
      await tryCheckBox(form, [
        'Is this property currently the transferee\'s principal residence? Yes',
        'Transferee Principal Residence Yes',
        'Check Box18'
      ]);
      
      // Additional questions if YES
      // Name of transferee who filed exemption claim
      await tryFillTextField(form, [
        'Name of transferee who filed or will be filing the exemption claim',
        'Exemption Filer',
        'kurvan edesanayad',
        'Text29'
      ], data.exemption_filer || data.trustee_name || data.buyer_name);
      
      // Multi-unit property
      if (data.transferee_multi_unit === true) {
        await tryCheckBox(form, [
          'Is this property a multi-unit property? Yes',
          'Transferee Multi Unit Yes',
          'Check Box19'
        ]);
        
        await tryFillTextField(form, [
          'If yes, which unit is the transferee\'s principal residence',
          'Transferee Unit',
          'Text30'
        ], data.transferee_unit);
      } else if (data.transferee_multi_unit === false) {
        await tryCheckBox(form, [
          'Is this property a multi-unit property? No',
          'Transferee Multi Unit No',
          'Check Box20'
        ]);
      }
      
      // Has transferee applied for exemption?
      if (data.applied_for_exemption === true) {
        await tryCheckBox(form, [
          'Has the transferee applied for a Homeowners\' or Disabled Veterans\' Exemption? Yes',
          'Applied Exemption Yes',
          'Check Box21'
        ]);
        
        // Type of exemption
        if (data.exemption_type === 'homeowners') {
          await tryCheckBox(form, [
            'Homeowners\' Exemption',
            'HO Exemption',
            'Check Box22'
          ]);
        } else if (data.exemption_type === 'disabled_veterans') {
          await tryCheckBox(form, [
            'Disabled Veterans\' Exemption',
            'DV Exemption',
            'Check Box23'
          ]);
        }
        
        // Date transferee occupied property
        await tryFillTextField(form, [
          'Date the transferee occupied this property as a principal residence',
          'Occupancy Date',
          'Text31'
        ], formatDate(data.transferee_occupancy_date));
      } else if (data.applied_for_exemption === false) {
        await tryCheckBox(form, [
          'Has the transferee applied for a Homeowners\' or Disabled Veterans\' Exemption? No',
          'Applied Exemption No',
          'Check Box24'
        ]);
      }
      
      // Does transferee own another property?
      if (data.owns_other_property === true) {
        await tryCheckBox(form, [
          'Does the transferee own another property that is or was their principal residence? Yes',
          'Other Property Yes',
          'Check Box25'
        ]);
        
        await tryFillTextField(form, [
          'ADDRESS',
          'Other Property Address',
          'Text32'
        ], data.other_property_address);
        
        await tryFillTextField(form, [
          'CITY, STATE, ZIP',
          'Other Property City State Zip',
          'Los Angeles',
          'Text33'
        ], data.other_property_city_state_zip);
        
        await tryFillTextField(form, [
          'COUNTY',
          'Other Property County',
          'Text34'
        ], data.other_property_county);
        
        await tryFillTextField(form, [
          'ASSESSOR\'S PARCEL/ID NUMBER',
          'Other Property APN',
          'Text35'
        ], data.other_property_apn);
        
        await tryFillTextField(form, [
          'MOVE-OUT DATE',
          'Move Out Date',
          'Text36'
        ], formatDate(data.move_out_date));
      } else if (data.owns_other_property === false) {
        await tryCheckBox(form, [
          'Does the transferee own another property that is or was their principal residence? No',
          'Other Property No',
          'Check Box26'
        ]);
      }
    } else if (data.principal_residence === false || data.is_transferee_principal_residence === false) {
      await tryCheckBox(form, [
        'Is this property currently the transferee\'s principal residence? No',
        'Transferee Principal Residence No',
        'Check Box27'
      ]);
      
      // Date intends to occupy
      await tryFillTextField(form, [
        'If no, date the transferee intends to occupy the property as the principal residence',
        'Intended Occupancy Date',
        'Text37'
      ], formatDate(data.intended_occupancy_date));
    }
    
    return await pdfDoc.save();
    
  } catch (error) {
    console.error('Error filling BOE-19-P form:', error);
    throw error;
  }
}

// Fill BOE-502-D (Death of Real Property Owner) - COMPLETE FUNCTION
async function fillBOE502D(data, pdfBytes) {
  try {
    console.log('Filling BOE-502-D (Death of Real Property Owner) form...');
    console.log('Input data for BOE-502-D:', JSON.stringify(data, null, 2));
    
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    
    // Get all fields for debugging
    const fields = form.getFields();
    console.log('BOE-502-D available fields:', fields.map(f => f.getName()));
    
    // PAGE 1
    // TOP SECTION - NAME AND MAILING ADDRESS (needs address included)
    await tryFillTextField(form, [
      'NAME AND MAILING ADDRESS',
      'Name and Mailing Address',
      'Rozsa Gyene\n1904 broadview drive',
      'Text1'
    ], `${data.trustee_name || ''}\n${data.trustee_address || ''}`);
    
    // NAME OF DECEDENT
    await tryFillTextField(form, [
      'NAME OF DECEDENT',
      'Decedent Name',
      'kurvan edesanayad',
      'Text2'
    ], data.decedent_name);
    
    // DATE OF DEATH
    await tryFillTextField(form, [
      'DATE OF DEATH',
      'Death Date',
      '01/01/1990',
      'Text3'
    ], formatDate(data.death_date));
    
    // Did the decedent have an interest in real property in this county?
    if (data.had_property_interest !== false) {
      await tryCheckBox(form, [
        'Did the decedent have an interest in real property in this county? YES',
        'Property Interest YES',
        'Check Box1'
      ]);
    } else {
      await tryCheckBox(form, [
        'Did the decedent have an interest in real property in this county? NO',
        'Property Interest NO',
        'Check Box2'
      ]);
    }
    
    // STREET ADDRESS OF REAL PROPERTY
    await tryFillTextField(form, [
      'STREET ADDRESS OF REAL PROPERTY',
      'Property Address',
      '1904 broadview drive',
      'Text4'
    ], data.property_address);
    
    // CITY
    await tryFillTextField(form, [
      'CITY',
      'Property City',
      'glendale',
      'Text5'
    ], data.property_city);
    
    // ZIP CODE
    await tryFillTextField(form, [
      'ZIP CODE',
      'Property Zip',
      '91208',
      'Text6'
    ], data.property_zip);
    
    // ASSESSOR'S PARCEL NUMBER (APN)
    await tryFillTextField(form, [
      'ASSESSOR\'S PARCEL NUMBER (APN)',
      'ASSESSORS PARCEL NUMBER APN',
      'APN',
      'Text7'
    ], data.apn);
    
    // DESCRIPTIVE INFORMATION (checkboxes)
    if (data.deed_attached === true) {
      await tryCheckBox(form, [
        'Copy of deed by which decedent acquired title is attached',
        'Deed Attached',
        'Check Box3'
      ]);
    }
    
    if (data.tax_bill_attached === true) {
      await tryCheckBox(form, [
        'Copy of decedent\'s most recent tax bill is attached',
        'Tax Bill Attached',
        'Check Box4'
      ]);
    }
    
    if (data.legal_description_attached === true) {
      await tryCheckBox(form, [
        'Deed or tax bill is not available; legal description is attached',
        'Legal Description Attached',
        'Check Box5'
      ]);
    }
    
    // DISPOSITION OF REAL PROPERTY (checkboxes)
    if (data.disposition === 'succession_without_will') {
      await tryCheckBox(form, [
        'Succession without a will',
        'Succession Without Will',
        'Check Box6'
      ]);
    }
    
    if (data.disposition === 'decree_distribution') {
      await tryCheckBox(form, [
        'Decree of distribution pursuant to will',
        'Decree Distribution',
        'Check Box7'
      ]);
    }
    
    if (data.disposition === 'probate_13650') {
      await tryCheckBox(form, [
        'Probate Code 13650 distribution',
        'Probate 13650',
        'Check Box8'
      ]);
    }
    
    if (data.disposition === 'affidavit') {
      await tryCheckBox(form, [
        'Affidavit',
        'Check Box9'
      ]);
    }
    
    if (data.disposition === 'trustee_action') {
      await tryCheckBox(form, [
        'Action of trustee pursuant to terms of a trust',
        'Trustee Action',
        'Check Box10'
      ]);
    }
    
    // TRANSFER/PROPERTY INFORMATION - Check all that apply
    // Decedent's spouse
    if (data.transfer_to === 'spouse' || data.transfer_type === 'spouse') {
      await tryCheckBox(form, [
        'Decedent\'s spouse',
        'Spouse',
        'Check Box11'
      ]);
    }
    
    // Decedent's registered domestic partner
    if (data.transfer_to === 'domestic_partner' || data.transfer_type === 'domestic_partner') {
      await tryCheckBox(form, [
        'Decedent\'s registered domestic partner',
        'Domestic Partner',
        'Check Box12'
      ]);
    }
    
    // Decedent's child(ren) or parent(s)
    if (data.transfer_to === 'child' || data.transfer_type === 'parent_child') {
      await tryCheckBox(form, [
        'Decedent\'s child(ren) or parent(s)',
        'Child Parent',
        'Check Box13'
      ]);
    }
    
    // Decedent's grandchild(ren)
    if (data.transfer_to === 'grandchild' || data.transfer_type === 'grandparent_grandchild') {
      await tryCheckBox(form, [
        'Decedent\'s grandchild(ren)',
        'Grandchild',
        'Check Box14'
      ]);
    }
    
    // Cotenant to cotenant
    if (data.transfer_to === 'cotenant' || data.transfer_type === 'cotenant_death') {
      await tryCheckBox(form, [
        'Cotenant to cotenant',
        'Cotenant',
        'Check Box15'
      ]);
    }
    
    // Other beneficiaries or heirs
    if (data.transfer_to === 'other_beneficiaries') {
      await tryCheckBox(form, [
        'Other beneficiaries or heirs',
        'Other Beneficiaries',
        'Check Box16'
      ]);
    }
    
    // A trust
    if (data.transfer_to === 'trust' || data.transfer_type === 'trust') {
      await tryCheckBox(form, [
        'A trust',
        'Trust',
        'Check Box17'
      ]);
    }
    
    // Was this the decedent's principal residence?
    if (data.was_principal_residence === true) {
      await tryCheckBox(form, [
        'Was this the decedent\'s principal residence? YES',
        'Principal Residence YES',
        'Check Box18'
      ]);
    } else if (data.was_principal_residence === false) {
      await tryCheckBox(form, [
        'Was this the decedent\'s principal residence? NO',
        'Principal Residence NO',
        'Check Box19'
      ]);
    }
    
    // Is this property a family farm?
    if (data.family_farm === true) {
      await tryCheckBox(form, [
        'Is this property a family farm? YES',
        'Family Farm YES',
        'Check Box20'
      ]);
    } else if (data.family_farm === false) {
      await tryCheckBox(form, [
        'Is this property a family farm? NO',
        'Family Farm NO',
        'Check Box21'
      ]);
    }
    
    // NAME OF TRUSTEE (if transfer to trust)
    if (data.transfer_to === 'trust' || data.transfer_type === 'trust') {
      await tryFillTextField(form, [
        'NAME OF TRUSTEE',
        'Trustee Name',
        'Rozsa Gyene',
        'Text8'
      ], data.trustee_name);
      
      await tryFillTextField(form, [
        'ADDRESS OF TRUSTEE',
        'Trustee Address',
        '1904 broadview drive',
        'Text9'
      ], data.trustee_address);
    }
    
    // List names and percentage of ownership of all beneficiaries or heirs
    if (data.beneficiaries && Array.isArray(data.beneficiaries)) {
      for (let i = 0; i < Math.min(data.beneficiaries.length, 6); i++) {
        const beneficiary = data.beneficiaries[i];
        
        // Name
        await tryFillTextField(form, [
          `NAME OF BENEFICIARY OR HEIRS ${i + 1}`,
          `Beneficiary Name ${i + 1}`,
          i === 0 ? 'rozsa gyene' : `Text${10 + i * 3}`
        ], beneficiary.name);
        
        // Relationship
        await tryFillTextField(form, [
          `RELATIONSHIP TO DECEDENT ${i + 1}`,
          `Relationship ${i + 1}`,
          i === 0 ? 'spouse' : `Text${11 + i * 3}`
        ], beneficiary.relationship);
        
        // Percentage
        await tryFillTextField(form, [
          `PERCENT OF OWNERSHIP RECEIVED ${i + 1}`,
          `Percent ${i + 1}`,
          i === 0 ? '100' : `Text${12 + i * 3}`
        ], String(beneficiary.percent || ''));
      }
    }
    
    // Property has been or will be sold prior to distribution
    if (data.property_sold === true) {
      await tryCheckBox(form, [
        'This property has been or will be sold prior to distribution',
        'Property Sold',
        'Check Box22'
      ]);
    }
    
    // PAGE 2
    // Will the decree of distribution include distribution of an ownership interest in any legal entity?
    if (data.legal_entity_distribution === true) {
      await tryCheckBox(form, [
        'Will the decree of distribution include distribution YES',
        'Legal Entity YES',
        'Check Box23'
      ]);
      
      // Will distribution result in control?
      if (data.legal_entity_control === true) {
        await tryCheckBox(form, [
          'will the distribution result in any person or legal entity obtaining control YES',
          'Control YES',
          'Check Box24'
        ]);
        
        // Legal entity information
        await tryFillTextField(form, [
          'NAME AND ADDRESS OF LEGAL ENTITY',
          'Legal Entity Name',
          'Text28'
        ], data.legal_entity_name_address);
        
        await tryFillTextField(form, [
          'NAME OF PERSON OR ENTITY GAINING SUCH CONTROL',
          'Control Person',
          'Text29'
        ], data.control_person_name);
      } else if (data.legal_entity_control === false) {
        await tryCheckBox(form, [
          'will the distribution result in any person or legal entity obtaining control NO',
          'Control NO',
          'Check Box25'
        ]);
      }
    } else if (data.legal_entity_distribution === false) {
      await tryCheckBox(form, [
        'Will the decree of distribution include distribution NO',
        'Legal Entity NO',
        'Check Box26'
      ]);
    }
    
    // Was the decedent the lessor or lessee in a lease 35+ years?
    if (data.lease_35_years === true) {
      await tryCheckBox(form, [
        'Was the decedent the lessor or lessee in a lease that had an original term of 35 years or more YES',
        'Lease YES',
        'Check Box27'
      ]);
      
      // List other parties to the lease
      if (data.lease_parties && Array.isArray(data.lease_parties)) {
        for (let i = 0; i < Math.min(data.lease_parties.length, 3); i++) {
          const party = data.lease_parties[i];
          
          await tryFillTextField(form, [
            `NAME ${i + 1}`,
            `Lease Party Name ${i + 1}`,
            `Text${30 + i * 5}`
          ], party.name);
          
          await tryFillTextField(form, [
            `MAILING ADDRESS ${i + 1}`,
            `Lease Party Address ${i + 1}`,
            `Text${31 + i * 5}`
          ], party.address);
          
          await tryFillTextField(form, [
            `CITY ${i + 1}`,
            `Lease Party City ${i + 1}`,
            `Text${32 + i * 5}`
          ], party.city);
          
          await tryFillTextField(form, [
            `STATE ${i + 1}`,
            `Lease Party State ${i + 1}`,
            `Text${33 + i * 5}`
          ], party.state);
          
          await tryFillTextField(form, [
            `ZIP CODE ${i + 1}`,
            `Lease Party Zip ${i + 1}`,
            `Text${34 + i * 5}`
          ], party.zip);
        }
      }
    } else if (data.lease_35_years === false) {
      await tryCheckBox(form, [
        'Was the decedent the lessor or lessee in a lease that had an original term of 35 years or more NO',
        'Lease NO',
        'Check Box28'
      ]);
    }
    
    // MAILING ADDRESS FOR FUTURE PROPERTY TAX STATEMENTS
    await tryFillTextField(form, [
      'NAME',
      'Mailing Name',
      'Rozsa Gyene',
      'Text45'
    ], data.mail_to_name || data.trustee_name);
    
    await tryFillTextField(form, [
      'ADDRESS',
      'Mailing Address',
      'Text46'
    ], data.mail_to_address || data.trustee_address);
    
    await tryFillTextField(form, [
      'MAILING CITY',
      'Mailing City',
      'Text47'
    ], data.mail_to_city || data.trustee_city || data.property_city);
    
    await tryFillTextField(form, [
      'MAILING STATE',
      'Mailing State',
      'Text48'
    ], data.mail_to_state || data.trustee_state || 'CA');
    
    await tryFillTextField(form, [
      'MAILING ZIP CODE',
      'Mailing Zip',
      'Text49'
    ], data.mail_to_zip || data.trustee_zip || data.property_zip);
    
    // CERTIFICATION
    await tryFillTextField(form, [
      'PRINTED NAME',
      'Printed Name',
      'Rozsa Gyene',
      'Text50'
    ], data.trustee_name);
    
    await tryFillTextField(form, [
      'TITLE',
      'Title',
      'Text51'
    ], data.signer_title || 'Trustee');
    
    await tryFillTextField(form, [
      'DATE',
      'Sign Date',
      '09/17/2025',
      'Text52'
    ], formatDate(new Date()));
    
    await tryFillTextField(form, [
      'EMAIL ADDRESS',
      'Email',
      'rozsagyenelaw@yahoo.com',
      'Text53'
    ], data.trustee_email);
    
    await tryFillTextField(form, [
      'DAYTIME TELEPHONE',
      'Phone',
      '8184344541',
      'Text54'
    ], data.trustee_phone);
    
    return await pdfDoc.save();
    
  } catch (error) {
    console.error('Error filling BOE-502-D form:', error);
    throw error;
  }
}

// Main function to fill all BOE forms
async function fillBOEForms(data) {
  const results = {};
  const errors = [];
  
  // Determine which forms to generate
  const forms = [
    { 
      name: 'BOE-502-A', 
      key: 'pcor', 
      generate: data.generate_pcor, 
      filler: fillPCOR 
    },
    { 
      name: 'BOE-502-D', 
      key: 'boe_502d', 
      generate: data.generate_502d, 
      filler: fillBOE502D 
    },
    { 
      name: 'BOE-19-P', 
      key: 'boe_19p', 
      // Only generate BOE-19-P if there's a parent-child relationship
      generate: data.generate_19p && data.transfer_type === 'parent_child', 
      filler: fillBOE19P 
    },
  ];
  
  for (const { name, key, generate, filler } of forms) {
    if (!generate) {
      console.log(`Skipping ${name} - not requested or not applicable`);
      if (name === 'BOE-19-P' && data.generate_19p && data.transfer_type !== 'parent_child') {
        console.log('BOE-19-P only applies to parent-child transfers');
      }
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
    console.log('Forms requested:', {
      pcor: data.generate_pcor,
      boe_502d: data.generate_502d,
      boe_19p: data.generate_19p
    });
    console.log('Transfer type:', data.transfer_type);
    console.log('Full input data:', JSON.stringify(data, null, 2));
    
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
        forms_generated: Object.keys(documents),
        transfer_type: data.transfer_type
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
