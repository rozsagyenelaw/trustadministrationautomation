// netlify/functions/generate-boe-forms.js

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// Generate BOE-502-A - Preliminary Change of Ownership Report (PCOR)
async function generatePCOR(data) {
  const pdfDoc = await PDFDocument.create();
  const page1 = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page1.getSize();
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let y = height - 40;
  
  // Header
  page1.drawText('BOE-502-A (P1) REV. 18 (05-23) ASSR-70 (REV. 5-24)', {
    x: 50,
    y: y,
    size: 8,
    font: helvetica
  });
  
  page1.drawText('FOR RECORDER\'S USE ONLY', {
    x: width - 150,
    y: y,
    size: 8,
    font: helvetica
  });
  y -= 30;
  
  // Title
  page1.drawText('PRELIMINARY CHANGE OF OWNERSHIP REPORT', {
    x: width / 2 - 150,
    y: y,
    size: 14,
    font: helveticaBold
  });
  y -= 25;
  
  // Instructions text
  const instructionText = [
    'To be completed by the transferee (buyer) prior to a transfer of subject',
    'property, in accordance with section 480.3 of the Revenue and Taxation',
    'Code. A Preliminary Change of Ownership Report must be filed with each',
    'conveyance in the County Recorder\'s office for the county where the',
    'property is located.'
  ];
  
  for (const line of instructionText) {
    page1.drawText(line, {
      x: 50,
      y: y,
      size: 9,
      font: helvetica
    });
    y -= 12;
  }
  y -= 15;
  
  // Buyer information box
  page1.drawRectangle({
    x: 45,
    y: y - 80,
    width: width - 90,
    height: 80,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1
  });
  
  page1.drawText('NAME AND MAILING ADDRESS OF BUYER/TRANSFEREE', {
    x: 50,
    y: y - 15,
    size: 9,
    font: helvetica
  });
  
  page1.drawText('(Make necessary corrections to the printed name and mailing address)', {
    x: 50,
    y: y - 27,
    size: 8,
    font: helvetica
  });
  
  // APN field
  page1.drawText('ASSESSOR\'S PARCEL NUMBER', {
    x: width - 200,
    y: y - 15,
    size: 9,
    font: helvetica
  });
  
  // Input fields
  const buyerName = data.buyer_name || '';
  const buyerAddress = data.buyer_address || '';
  const apn = data.apn || '';
  
  page1.drawText(buyerName, {
    x: 55,
    y: y - 45,
    size: 10,
    font: helvetica
  });
  
  page1.drawText(buyerAddress, {
    x: 55,
    y: y - 60,
    size: 10,
    font: helvetica
  });
  
  page1.drawText(apn, {
    x: width - 200,
    y: y - 35,
    size: 10,
    font: helvetica
  });
  
  y -= 90;
  
  // Contact information
  page1.drawText('BUYER\'S EMAIL ADDRESS', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  
  page1.drawText('BUYER\'S DAYTIME TELEPHONE NUMBER', {
    x: 300,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 15;
  
  page1.drawText(data.buyer_email || '', {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  
  page1.drawText(`(${data.buyer_phone || '   )'}`, {
    x: 300,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 25;
  
  // Seller/Transferor
  page1.drawText('SELLER/TRANSFEROR', {
    x: 50,
    y: y,
    size: 9,
    font: helveticaBold
  });
  y -= 15;
  
  page1.drawText(data.seller_name || '', {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 25;
  
  // Street address
  page1.drawText('STREET ADDRESS OR PHYSICAL LOCATION OF REAL PROPERTY', {
    x: 50,
    y: y,
    size: 9,
    font: helveticaBold
  });
  y -= 15;
  
  page1.drawText(data.property_address || '', {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 25;
  
  // Principal residence checkbox
  page1.drawText('☐ YES  ☐ NO', {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  
  page1.drawText('This property is intended as my principal residence. If YES, please indicate the date of occupancy', {
    x: 120,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 15;
  
  page1.drawText('or intended occupancy.', {
    x: 120,
    y: y,
    size: 9,
    font: helvetica
  });
  
  page1.drawText('MO ___ DAY ___ YEAR ____', {
    x: 400,
    y: y + 15,
    size: 9,
    font: helvetica
  });
  y -= 25;
  
  // Disabled veteran
  page1.drawText('☐ YES  ☐ NO', {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  
  page1.drawText('Are you a 100% rated disabled veteran who was compensated at 100% by the Department of Veterans Affairs or an unmarried', {
    x: 120,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 12;
  
  page1.drawText('surviving spouse of a 100% rated disabled veteran?', {
    x: 120,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 25;
  
  // Mail property tax info
  page1.drawText('MAIL PROPERTY TAX INFORMATION TO (NAME)', {
    x: 50,
    y: y,
    size: 9,
    font: helveticaBold
  });
  y -= 15;
  
  page1.drawText(data.tax_mail_name || '', {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 20;
  
  page1.drawText('MAIL PROPERTY TAX INFORMATION TO (ADDRESS)', {
    x: 50,
    y: y,
    size: 9,
    font: helveticaBold
  });
  
  page1.drawText('CITY', {
    x: 300,
    y: y,
    size: 9,
    font: helveticaBold
  });
  
  page1.drawText('STATE', {
    x: 450,
    y: y,
    size: 9,
    font: helveticaBold
  });
  
  page1.drawText('ZIP CODE', {
    x: 500,
    y: y,
    size: 9,
    font: helveticaBold
  });
  y -= 15;
  
  page1.drawText(data.tax_mail_address || '', {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 30;
  
  // Part 1 header
  page1.drawRectangle({
    x: 45,
    y: y - 20,
    width: width - 90,
    height: 20,
    color: rgb(0.9, 0.9, 0.9)
  });
  
  page1.drawText('PART 1. TRANSFER INFORMATION', {
    x: 50,
    y: y - 15,
    size: 10,
    font: helveticaBold
  });
  
  page1.drawText('Please complete all statements.', {
    x: 250,
    y: y - 15,
    size: 9,
    font: helvetica
  });
  y -= 30;
  
  page1.drawText('This section contains possible exclusions from reassessment for certain types of transfers.', {
    x: 70,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 20;
  
  // Transfer type checkboxes
  const transferTypes = [
    { letter: 'A', text: 'This transfer is solely between spouses (addition or removal of a spouse, death of a spouse, divorce settlement, etc.).' },
    { letter: 'B', text: 'This transfer is solely between domestic partners currently registered with the California Secretary of State (addition or removal of' },
    { letter: '', text: 'a partner, death of a partner, termination settlement, etc.).' },
    { letter: 'C', text: 'This is a transfer:  ☐ between parent(s) and child(ren)  ☐ between grandparent(s) and grandchild(ren).' },
    { letter: '', text: '    Was this the transferor/grantor\'s principal residence?  ☐ YES  ☐ NO' },
    { letter: '', text: '    Is this a family farm?  ☐ YES  ☐ NO' }
  ];
  
  page1.drawText('YES NO', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 15;
  
  for (const item of transferTypes) {
    if (item.letter) {
      page1.drawText('☐  ☐', {
        x: 50,
        y: y,
        size: 10,
        font: helvetica
      });
      
      page1.drawText(`${item.letter}.`, {
        x: 90,
        y: y,
        size: 9,
        font: helvetica
      });
      
      page1.drawText(item.text, {
        x: 105,
        y: y,
        size: 9,
        font: helvetica
      });
    } else {
      page1.drawText(item.text, {
        x: 105,
        y: y,
        size: 9,
        font: helvetica
      });
    }
    y -= 15;
    
    if (y < 100) {
      // Continue on next page
      break;
    }
  }
  
  // Footer
  page1.drawText('THIS DOCUMENT IS NOT SUBJECT TO PUBLIC INSPECTION', {
    x: width / 2 - 140,
    y: 30,
    size: 9,
    font: helveticaBold
  });
  
  // Add additional pages as needed
  // Page 2 would continue with remaining sections
  
  return await pdfDoc.save();
}

// Generate BOE-502-D - Change in Ownership Statement - Death of Real Property Owner
async function generateBOE502D(data) {
  const pdfDoc = await PDFDocument.create();
  const page1 = pdfDoc.addPage([612, 792]);
  const { width, height } = page1.getSize();
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let y = height - 40;
  
  // Header
  page1.drawText('BOE-502-D (P1) REV. 14 (05-23) ASSR-176 (REV. 10-24)', {
    x: 50,
    y: y,
    size: 8,
    font: helvetica
  });
  y -= 20;
  
  // Title
  page1.drawText('CHANGE IN OWNERSHIP STATEMENT', {
    x: width / 2 - 120,
    y: y,
    size: 14,
    font: helveticaBold
  });
  y -= 15;
  
  page1.drawText('DEATH OF REAL PROPERTY OWNER', {
    x: width / 2 - 110,
    y: y,
    size: 14,
    font: helveticaBold
  });
  y -= 25;
  
  // Notice text
  const noticeText = [
    'This notice is a request for a completed Change in',
    'Ownership Statement. Failure to file this statement will',
    'result in the assessment of a penalty.'
  ];
  
  for (const line of noticeText) {
    page1.drawText(line, {
      x: 50,
      y: y,
      size: 9,
      font: helvetica
    });
    y -= 12;
  }
  y -= 15;
  
  // Name and mailing address box
  page1.drawRectangle({
    x: 45,
    y: y - 60,
    width: width - 90,
    height: 60,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1
  });
  
  page1.drawText('NAME AND MAILING ADDRESS', {
    x: 50,
    y: y - 15,
    size: 9,
    font: helvetica
  });
  
  page1.drawText('(Make necessary corrections to the printed name and mailing address)', {
    x: 50,
    y: y - 27,
    size: 8,
    font: helvetica
  });
  
  const recipientName = data.recipient_name || '';
  const recipientAddress = data.recipient_address || '';
  
  page1.drawText(recipientName, {
    x: 55,
    y: y - 40,
    size: 10,
    font: helvetica
  });
  
  page1.drawText(recipientAddress, {
    x: 55,
    y: y - 52,
    size: 10,
    font: helvetica
  });
  
  y -= 70;
  
  // Section 480 notice
  const sectionText = [
    'Section 480(b) of the Revenue and Taxation Code requires that',
    'the personal representative file this statement with the Assessor',
    'in each county where the decedent owned property at the time of',
    'death. File a separate statement for each parcel of real property',
    'owned by the decedent.'
  ];
  
  for (const line of sectionText) {
    page1.drawText(line, {
      x: 50,
      y: y,
      size: 9,
      font: helvetica
    });
    y -= 12;
  }
  y -= 20;
  
  // Decedent information
  page1.drawText('NAME OF DECEDENT', {
    x: 50,
    y: y,
    size: 9,
    font: helveticaBold
  });
  
  page1.drawText('DATE OF DEATH', {
    x: 350,
    y: y,
    size: 9,
    font: helveticaBold
  });
  y -= 15;
  
  const decedentName = data.decedent_name || '';
  const deathDate = data.death_date || '';
  
  page1.drawText(decedentName, {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  
  page1.drawText(deathDate, {
    x: 350,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 25;
  
  // Interest in property
  page1.drawText('☐ YES  ☐ NO', {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  
  page1.drawText('Did the decedent have an interest in real property in this county? If YES, answer all questions. If NO, sign and', {
    x: 120,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 12;
  
  page1.drawText('complete the certification on page 2.', {
    x: 120,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 25;
  
  // Property information
  page1.drawText('STREET ADDRESS OF REAL PROPERTY', {
    x: 50,
    y: y,
    size: 9,
    font: helveticaBold
  });
  
  page1.drawText('CITY', {
    x: 250,
    y: y,
    size: 9,
    font: helveticaBold
  });
  
  page1.drawText('ZIP CODE', {
    x: 350,
    y: y,
    size: 9,
    font: helveticaBold
  });
  
  page1.drawText('ASSESSOR\'S PARCEL NUMBER (APN)*', {
    x: 430,
    y: y,
    size: 9,
    font: helveticaBold
  });
  y -= 15;
  
  const propertyAddress = data.property_address || '';
  const propertyCity = data.property_city || '';
  const propertyZip = data.property_zip || '';
  const apn = data.apn || '';
  
  page1.drawText(propertyAddress, {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  
  page1.drawText(propertyCity, {
    x: 250,
    y: y,
    size: 10,
    font: helvetica
  });
  
  page1.drawText(propertyZip, {
    x: 350,
    y: y,
    size: 10,
    font: helvetica
  });
  
  page1.drawText(apn, {
    x: 430,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 15;
  
  page1.drawText('*If more than 1 parcel, attach separate sheet.', {
    x: 430,
    y: y,
    size: 8,
    font: helvetica
  });
  y -= 25;
  
  // Descriptive information
  page1.drawRectangle({
    x: 45,
    y: y - 20,
    width: 250,
    height: 20,
    color: rgb(0.9, 0.9, 0.9)
  });
  
  page1.drawText('DESCRIPTIVE INFORMATION ☑', {
    x: 50,
    y: y - 15,
    size: 9,
    font: helveticaBold
  });
  
  page1.drawText('(IF APN UNKNOWN)', {
    x: 190,
    y: y - 15,
    size: 8,
    font: helvetica
  });
  
  // Disposition section
  page1.drawRectangle({
    x: 300,
    y: y - 20,
    width: 265,
    height: 20,
    color: rgb(0.9, 0.9, 0.9)
  });
  
  page1.drawText('DISPOSITION OF REAL PROPERTY ☑', {
    x: 305,
    y: y - 15,
    size: 9,
    font: helveticaBold
  });
  y -= 30;
  
  // Checkboxes for descriptive info
  const descriptiveOptions = [
    '☐ Copy of deed by which decedent acquired title is attached.',
    '☐ Copy of decedent\'s most recent tax bill is attached.',
    '☐ Deed or tax bill is not available; legal description is attached.'
  ];
  
  for (const option of descriptiveOptions) {
    page1.drawText(option, {
      x: 50,
      y: y,
      size: 9,
      font: helvetica
    });
    y -= 15;
  }
  
  // Disposition options
  y = y + 45; // Reset to align with descriptive options
  const dispositionOptions = [
    '☐ Succession without a will  ☐ Decree of distribution',
    '     pursuant to will  ☐ Probate Code 13650 distribution',
    '☐ Affidavit  ☐ Action of trustee pursuant',
    '     to terms of a trust'
  ];
  
  let dispY = y;
  for (const option of dispositionOptions) {
    page1.drawText(option, {
      x: 305,
      y: dispY,
      size: 9,
      font: helvetica
    });
    dispY -= 12;
  }
  
  y -= 60;
  
  // Transfer/Property Information
  page1.drawRectangle({
    x: 45,
    y: y - 20,
    width: width - 90,
    height: 20,
    color: rgb(0.9, 0.9, 0.9)
  });
  
  page1.drawText('TRANSFER/PROPERTY INFORMATION ☑', {
    x: 50,
    y: y - 15,
    size: 9,
    font: helveticaBold
  });
  
  page1.drawText('Check all that apply and list details below.', {
    x: 250,
    y: y - 15,
    size: 9,
    font: helvetica
  });
  y -= 30;
  
  // Transfer options
  const transferOptions = [
    '☐ Decedent\'s spouse  ☐ Decedent\'s registered domestic partner',
    '☐ Decedent\'s child(ren) or parent(s). If qualified for exclusion from reassessment, a Claim for Reassessment Exclusion for',
    '    Transfer Between Parent and Child must be filed (see instructions).',
    '☐ Decedent\'s grandchild(ren). If qualified for exclusion from reassessment, a Claim for Reassessment Exclusion for',
    '    Transfer Between Grandparent and Grandchild must be filed (see instructions).',
    '☐ Cotenant to cotenant. If qualified for exclusion from reassessment, an Affidavit of Cotenant Residency must be filed (see',
    '    instructions).',
    '☐ Other beneficiaries or heirs.',
    '☐ A trust.'
  ];
  
  for (const option of transferOptions) {
    page1.drawText(option, {
      x: 50,
      y: y,
      size: 9,
      font: helvetica
    });
    y -= 15;
    
    if (y < 100) {
      break; // Continue on next page
    }
  }
  
  // Principal residence questions
  if (y > 150) {
    y -= 10;
    page1.drawText('Was this the decedent\'s principal residence?  ☐ YES  ☐ NO', {
      x: 50,
      y: y,
      size: 9,
      font: helvetica
    });
    
    page1.drawText('Is this property a family farm?  ☐ YES  ☐ NO', {
      x: 300,
      y: y,
      size: 9,
      font: helvetica
    });
    y -= 25;
    
    // Trust information
    if (data.trust_name) {
      page1.drawText('NAME OF TRUSTEE', {
        x: 50,
        y: y,
        size: 9,
        font: helveticaBold
      });
      
      page1.drawText('ADDRESS OF TRUSTEE', {
        x: 300,
        y: y,
        size: 9,
        font: helveticaBold
      });
      y -= 15;
      
      page1.drawText(data.trustee_name || '', {
        x: 50,
        y: y,
        size: 10,
        font: helvetica
      });
      
      page1.drawText(data.trustee_address || '', {
        x: 300,
        y: y,
        size: 10,
        font: helvetica
      });
      y -= 25;
    }
  }
  
  // Footer
  page1.drawText('THIS DOCUMENT IS NOT SUBJECT TO PUBLIC INSPECTION', {
    x: width / 2 - 140,
    y: 30,
    size: 9,
    font: helveticaBold
  });
  
  // Add Page 2 for certification
  const page2 = pdfDoc.addPage([612, 792]);
  y = height - 40;
  
  page2.drawText('BOE-502-D (P2) REV. 14 (05-22) ASSR-176 (REV. 10-24)', {
    x: 50,
    y: y,
    size: 8,
    font: helvetica
  });
  y -= 40;
  
  // Certification section
  page2.drawRectangle({
    x: 45,
    y: y - 20,
    width: width - 90,
    height: 20,
    color: rgb(0.9, 0.9, 0.9)
  });
  
  page2.drawText('CERTIFICATION', {
    x: width / 2 - 50,
    y: y - 15,
    size: 10,
    font: helveticaBold
  });
  y -= 35;
  
  const certText = [
    'I certify (or declare) under penalty of perjury under the laws of the State of California that the information contained herein is true,',
    'correct and complete to the best of my knowledge and belief.'
  ];
  
  for (const line of certText) {
    page2.drawText(line, {
      x: 50,
      y: y,
      size: 9,
      font: helvetica
    });
    y -= 12;
  }
  y -= 25;
  
  // Signature section
  page2.drawText('SIGNATURE OF SPOUSE/REGISTERED DOMESTIC PARTNER/PERSONAL REPRESENTATIVE', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 20;
  
  page2.drawText('___________________________________________', {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  
  page2.drawText('PRINTED NAME', {
    x: 300,
    y: y + 15,
    size: 9,
    font: helvetica
  });
  
  page2.drawText('_______________________________', {
    x: 300,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 25;
  
  page2.drawText('TITLE', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  
  page2.drawText('DATE', {
    x: 200,
    y: y,
    size: 9,
    font: helvetica
  });
  
  page2.drawText('EMAIL ADDRESS', {
    x: 350,
    y: y,
    size: 9,
    font: helvetica
  });
  
  page2.drawText('DAYTIME TELEPHONE', {
    x: 480,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 15;
  
  page2.drawText('______________', {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  
  page2.drawText('______________', {
    x: 200,
    y: y,
    size: 10,
    font: helvetica
  });
  
  page2.drawText('_____________________', {
    x: 350,
    y: y,
    size: 10,
    font: helvetica
  });
  
  page2.drawText('(   )__________', {
    x: 480,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 40;
  
  // Instructions header
  page2.drawRectangle({
    x: 45,
    y: y - 20,
    width: width - 90,
    height: 20,
    color: rgb(0.9, 0.9, 0.9)
  });
  
  page2.drawText('INSTRUCTIONS', {
    x: width / 2 - 50,
    y: y - 15,
    size: 10,
    font: helveticaBold
  });
  y -= 30;
  
  // Important box
  page2.drawRectangle({
    x: 45,
    y: y - 80,
    width: 100,
    height: 80,
    color: rgb(0.2, 0.2, 0.2)
  });
  
  page2.drawText('IMPORTANT', {
    x: 55,
    y: y - 40,
    size: 12,
    font: helveticaBold,
    color: rgb(1, 1, 1)
  });
  
  // Instructions text
  const instructionsText = [
    'Failure to file a Change in Ownership Statement within the time prescribed by law may result in a penalty of',
    'either $100 or 10% of the taxes applicable to the new base year value of the real property or manufactured',
    'home, whichever is greater, but not to exceed five thousand dollars ($5,000) if the property is eligible for the',
    'homeowners\' exemption or twenty thousand dollars ($20,000) if the property is not eligible for the homeowners\'',
    'exemption if that failure to file was not willful. This penalty will be added to the assessment roll and shall be',
    'collected like any other delinquent property taxes and subjected to the same penalties for nonpayment.'
  ];
  
  let instX = 155;
  for (const line of instructionsText) {
    page2.drawText(line, {
      x: instX,
      y: y,
      size: 9,
      font: helvetica
    });
    y -= 12;
  }
  
  // Footer
  page2.drawText('THIS DOCUMENT IS NOT SUBJECT TO PUBLIC INSPECTION', {
    x: width / 2 - 140,
    y: 30,
    size: 9,
    font: helveticaBold
  });
  
  return await pdfDoc.save();
}

// Generate BOE-19-P - Claim for Reassessment Exclusion (Parent-Child Transfer)
async function generateBOE19P(data) {
  const pdfDoc = await PDFDocument.create();
  const page1 = pdfDoc.addPage([612, 792]);
  const { width, height } = page1.getSize();
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let y = height - 40;
  
  // Header
  page1.drawText('BOE-19-P (P1) REV. 03 (05-24) ASSR (REV. 10-24)', {
    x: 50,
    y: y,
    size: 8,
    font: helvetica
  });
  y -= 20;
  
  // Title
  page1.drawText('CLAIM FOR REASSESSMENT EXCLUSION FOR', {
    x: width / 2 - 140,
    y: y,
    size: 12,
    font: helveticaBold
  });
  y -= 15;
  
  page1.drawText('TRANSFER BETWEEN PARENT AND CHILD', {
    x: width / 2 - 130,
    y: y,
    size: 12,
    font: helveticaBold
  });
  y -= 15;
  
  page1.drawText('OCCURRING ON OR AFTER FEBRUARY 16, 2021', {
    x: width / 2 - 140,
    y: y,
    size: 12,
    font: helveticaBold
  });
  y -= 30;
  
  // Name and mailing address box
  page1.drawRectangle({
    x: 45,
    y: y - 60,
    width: width - 90,
    height: 60,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1
  });
  
  page1.drawText('NAME AND MAILING ADDRESS', {
    x: 50,
    y: y - 15,
    size: 9,
    font: helvetica
  });
  
  page1.drawText('(Make necessary corrections to the printed name and mailing address)', {
    x: 50,
    y: y - 27,
    size: 8,
    font: helvetica
  });
  y -= 70;
  
  // Section A - Property
  page1.drawRectangle({
    x: 45,
    y: y - 20,
    width: width - 90,
    height: 20,
    color: rgb(0.9, 0.9, 0.9)
  });
  
  page1.drawText('A. PROPERTY', {
    x: 50,
    y: y - 15,
    size: 10,
    font: helveticaBold
  });
  y -= 30;
  
  // Property fields
  const fields = [
    { label: 'ASSESSOR\'S PARCEL/ID NUMBER', value: data.apn || '' },
    { label: 'DATE OF PURCHASE OR TRANSFER', value: data.transfer_date || '' },
    { label: 'RECORDER\'S DOCUMENT NUMBER', value: data.document_number || '' },
    { label: 'DATE OF DECREE OF DISTRIBUTION (if applicable)', value: data.decree_date || '' },
    { label: 'PROBATE NUMBER (if applicable)', value: data.probate_number || '' },
    { label: 'DATE OF DEATH (if applicable)', value: data.death_date || '' }
  ];
  
  for (let i = 0; i < fields.length; i += 2) {
    // Left column
    page1.drawText(fields[i].label, {
      x: 50,
      y: y,
      size: 9,
      font: helvetica
    });
    
    // Right column (if exists)
    if (fields[i + 1]) {
      page1.drawText(fields[i + 1].label, {
        x: 300,
        y: y,
        size: 9,
        font: helvetica
      });
    }
    y -= 15;
    
    // Values
    page1.drawText(fields[i].value, {
      x: 50,
      y: y,
      size: 10,
      font: helvetica
    });
    
    if (fields[i + 1]) {
      page1.drawText(fields[i + 1].value, {
        x: 300,
        y: y,
        size: 10,
        font: helvetica
      });
    }
    y -= 20;
  }
  
  // Property address
  page1.drawText('PROPERTY ADDRESS', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  
  page1.drawText('CITY', {
    x: 350,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 15;
  
  page1.drawText(data.property_address || '', {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  
  page1.drawText(data.property_city || '', {
    x: 350,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 25;
  
  // Section B - Transferor(s)/Seller(s)
  page1.drawRectangle({
    x: 45,
    y: y - 20,
    width: width - 90,
    height: 20,
    color: rgb(0.9, 0.9, 0.9)
  });
  
  page1.drawText('B. TRANSFEROR(S)/SELLER(S)', {
    x: 50,
    y: y - 15,
    size: 10,
    font: helveticaBold
  });
  
  page1.drawText('(additional transferors, please complete Section E on Page 3)', {
    x: 250,
    y: y - 15,
    size: 8,
    font: helvetica
  });
  y -= 30;
  
  page1.drawText('Print full name(s) of transferor(s)', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  
  page1.drawText('Name', {
    x: 200,
    y: y,
    size: 9,
    font: helvetica
  });
  
  page1.drawText('Name', {
    x: 400,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 15;
  
  const transferor1 = data.transferor_name1 || '';
  const transferor2 = data.transferor_name2 || '';
  
  page1.drawText(transferor1, {
    x: 200,
    y: y,
    size: 10,
    font: helvetica
  });
  
  page1.drawText(transferor2, {
    x: 400,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 20;
  
  page1.drawText('Family relationship(s) to transferee(s)', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  
  page1.drawText('Relationship', {
    x: 200,
    y: y,
    size: 9,
    font: helvetica
  });
  
  page1.drawText('Relationship', {
    x: 400,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 15;
  
  const relationship1 = data.relationship1 || 'Parent';
  const relationship2 = data.relationship2 || '';
  
  page1.drawText(relationship1, {
    x: 200,
    y: y,
    size: 10,
    font: helvetica
  });
  
  page1.drawText(relationship2, {
    x: 400,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 25;
  
  // Questions about property
  page1.drawText('1. Was this property the transferor\'s family farm?  ☐ Yes  ☐ No', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  
  page1.drawText('If yes, how is the property used?', {
    x: 320,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 15;
  
  page1.drawText('   ☐ Pasture/Grazing  ☐ Agricultural Commodity  ☐ Cultivation: _______________', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 20;
  
  page1.drawText('2. Was this property the transferor\'s principal residence?  ☐ Yes  ☐ No', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 15;
  
  page1.drawText('   a. If yes, please check which of the following exemptions was granted or eligible to be granted on this property.', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 15;
  
  page1.drawText('      ☐ Homeowners\' Exemption  ☐ Disabled Veterans\' Exemption', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 15;
  
  page1.drawText('   b. Is this property a multi-unit property?  ☐ Yes  ☐ No  If yes, which unit was the transferor\'s principal residence? ___', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 20;
  
  page1.drawText('3. Was only a partial interest in the property transferred?  ☐ Yes  ☐ No  If yes, percentage transferred ____%', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 20;
  
  page1.drawText('4. Was this property owned in joint tenancy?  ☐ Yes  ☐ No', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 25;
  
  // Important notice
  page1.drawRectangle({
    x: 45,
    y: y - 30,
    width: width - 90,
    height: 30,
    color: rgb(1, 1, 0.8)
  });
  
  page1.drawText('IMPORTANT:', {
    x: 50,
    y: y - 12,
    size: 9,
    font: helveticaBold
  });
  
  page1.drawText('If the transfer was through the medium of a will and/or trust, you must attach a full and complete copy of the will and/or', {
    x: 110,
    y: y - 12,
    size: 9,
    font: helvetica
  });
  
  page1.drawText('trust and all amendments.', {
    x: 50,
    y: y - 25,
    size: 9,
    font: helvetica
  });
  
  // Footer
  page1.drawText('THIS DOCUMENT IS NOT SUBJECT TO PUBLIC INSPECTION', {
    x: width / 2 - 140,
    y: 30,
    size: 9,
    font: helveticaBold
  });
  
  return await pdfDoc.save();
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
    
    // Generate requested documents
    if (data.generate_pcor) {
      const pcorPdf = await generatePCOR(data);
      documents.pcor = Buffer.from(pcorPdf).toString('base64');
    }
    
    if (data.generate_502d) {
      const deathPdf = await generateBOE502D(data);
      documents.boe_502d = Buffer.from(deathPdf).toString('base64');
    }
    
    if (data.generate_19p) {
      const parentChildPdf = await generateBOE19P(data);
      documents.boe_19p = Buffer.from(parentChildPdf).toString('base64');
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: `Generated ${Object.keys(documents).length} BOE forms`,
        documents: documents,
        case_number: data.case_number
      })
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
        error: 'Failed to generate forms',
        details: error.message
      })
    };
  }
};
