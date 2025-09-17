// netlify/functions/generate-trust-documents.js
// FIXED VERSION - Properly uses all input data

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// Law office information
const LAW_OFFICE = {
  attorney: "ROZSA GYENE, ESQ. SBN 208356",
  firm: "LAW OFFICES OF ROZSA GYENE",
  address1: "450 N BRAND BLVD SUITE 600",
  city_state_zip: "GLENDALE CA 91203",
  phone: "(818) 291-6217",
  fax: "(818) 291-6205",
  email: "rozsagyenelaw@yahoo.com"
};

// Format date for legal documents
function formatLegalDate(dateString) {
  if (!dateString) return "___________";
  const date = new Date(dateString);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// Format currency
function formatCurrency(amount) {
  if (!amount && amount !== 0) return "$___________";
  const num = parseFloat(amount.toString().replace(/[^0-9.-]/g, ''));
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(num);
}

// 1. GENERATE RECEIPT FROM DISTRIBUTEE (Probate Code §11751)
async function generateReceipt(data) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);
  
  let y = height - 50;
  
  // Title centered
  page.drawText('RECEIPT', {
    x: width / 2 - 30,
    y: y,
    size: 14,
    font: helveticaBold
  });
  y -= 30;
  
  // Line numbers on left
  for (let i = 1; i <= 28; i++) {
    page.drawText(i.toString(), {
      x: 30,
      y: height - 80 - (i * 20),
      size: 8,
      font: courier
    });
  }
  
  // Law office information
  page.drawText(LAW_OFFICE.attorney, {
    x: 50,
    y: height - 80,
    size: 10,
    font: helvetica
  });
  
  page.drawText(LAW_OFFICE.firm, {
    x: 50,
    y: height - 100,
    size: 10,
    font: helvetica
  });
  
  page.drawText(LAW_OFFICE.address1, {
    x: 50,
    y: height - 120,
    size: 10,
    font: helvetica
  });
  
  page.drawText(LAW_OFFICE.city_state_zip, {
    x: 50,
    y: height - 140,
    size: 10,
    font: helvetica
  });
  
  page.drawText(`Phone: ${LAW_OFFICE.phone}`, {
    x: 50,
    y: height - 160,
    size: 10,
    font: helvetica
  });
  
  // Court header
  y = height - 200;
  page.drawText('SUPERIOR COURT OF THE STATE OF CALIFORNIA', {
    x: width / 2 - 150,
    y: y,
    size: 11,
    font: helveticaBold
  });
  y -= 20;
  
  const county = data.county || 'LOS ANGELES';
  page.drawText(`FOR THE COUNTY OF ${county.toUpperCase()}`, {
    x: width / 2 - 110,
    y: y,
    size: 11,
    font: helveticaBold
  });
  y -= 40;
  
  // Trust information box
  const trustName = data.trust_name || '[TRUST NAME]';
  page.drawText(trustName, {
    x: 50,
    y: y,
    size: 11,
    font: helvetica
  });
  
  // Right side box
  page.drawRectangle({
    x: 350,
    y: y - 100,
    width: 200,
    height: 120,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1
  });
  
  page.drawText('RECEIPT FROM DISTRIBUTEE FOR', {
    x: 360,
    y: y - 20,
    size: 10,
    font: helveticaBold
  });
  
  page.drawText('PROPERTY RECEIVED (PROB. C. SEC', {
    x: 360,
    y: y - 35,
    size: 10,
    font: helveticaBold
  });
  
  page.drawText('11751)', {
    x: 360,
    y: y - 50,
    size: 10,
    font: helveticaBold
  });
  
  // Main content with actual data
  y -= 140;
  
  const beneficiaryName = data.beneficiary_name || '[BENEFICIARY NAME]';
  const trusteeName = data.trustee_name || '[TRUSTEE NAME]';
  const distributionAmount = formatCurrency(data.distribution_amount);
  const distributionDescription = data.distribution_description || 'Cash distribution';
  
  const mainText = `I, ${beneficiaryName}, say:\n\n` +
    `I acknowledge receipt from ${trusteeName}, the\n` +
    `Successor Trustee${data.cotrustees ? 's' : ''} of the ${trustName} as partial\n` +
    `distribution to me in accordance with the terms of the above\n` +
    `mentioned trust.\n\n` +
    `The property so distributed to and received by me is described as\n` +
    `follows:\n` +
    `     ${distributionDescription}: ${distributionAmount}\n\n` +
    `I declare under penalty of perjury under the laws of the State of\n` +
    `California that the foregoing is true and correct.`;
  
  const lines = mainText.split('\n');
  for (const line of lines) {
    page.drawText(line, {
      x: 50,
      y: y,
      size: 11,
      font: helvetica
    });
    y -= 18;
  }
  
  // Signature section
  y -= 30;
  const currentDate = new Date();
  page.drawText(`Dated: ___________, ${currentDate.getFullYear()}`, {
    x: 50,
    y: y,
    size: 11,
    font: helvetica
  });
  
  page.drawText('__________________________', {
    x: 350,
    y: y,
    size: 11,
    font: helvetica
  });
  y -= 15;
  
  page.drawText(beneficiaryName.toUpperCase(), {
    x: 350,
    y: y,
    size: 11,
    font: helvetica
  });
  
  // Footer
  page.drawText('-1-', {
    x: width / 2,
    y: 30,
    size: 10,
    font: helvetica
  });
  
  page.drawText('RECEIPT', {
    x: 50,
    y: 30,
    size: 10,
    font: helvetica
  });
  
  return await pdfDoc.save();
}

// 2. GENERATE WAIVER OF FINAL ACCOUNTING AND CONSENT TO DISTRIBUTION
async function generateWaiverAndRelease(data) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);
  
  let y = height - 50;
  
  // Line numbers on left
  for (let i = 1; i <= 28; i++) {
    page.drawText(i.toString(), {
      x: 30,
      y: height - 80 - (i * 20),
      size: 8,
      font: courier
    });
  }
  
  // Title
  page.drawText('Waiver of Final Accounting and Consent to Distribution with', {
    x: width / 2 - 180,
    y: y,
    size: 12,
    font: helveticaBold
  });
  y -= 20;
  
  page.drawText('Receipt and Release', {
    x: width / 2 - 70,
    y: y,
    size: 12,
    font: helveticaBold
  });
  y -= 40;
  
  // Main content with actual data
  const beneficiaryName = data.beneficiary_name || '[BENEFICIARY NAME]';
  const trustName = data.trust_name || '[TRUST NAME]';
  const trusteeName = data.trustee_name || '[TRUSTEE NAME]';
  const distributionAmount = formatCurrency(data.distribution_amount);
  const trusteeGender = data.trustee_gender || 'their';
  
  let pronouns = {
    subject: 'they',
    object: 'them',
    possessive: 'their'
  };
  
  if (trusteeGender === 'male') {
    pronouns = { subject: 'he', object: 'him', possessive: 'his' };
  } else if (trusteeGender === 'female') {
    pronouns = { subject: 'she', object: 'her', possessive: 'her' };
  }
  
  const content = [
    `The undersigned, being a Beneficiary of ${trustName},`,
    `hereby waives the preparation and/or filing of`,
    `a final accounting and fully consents to the immediate`,
    `distribution to the beneficiaries.`,
    ``,
    `Further, I hereby acknowledge and agree that, upon the Trustee`,
    `receiving a signed Waiver of Final Accounting and Consent to`,
    `Distribution from each beneficiary of the Trust, I shall receive`,
    `${distributionAmount} as my distributive share of the Trust and the`,
    `Estate. This distribution represents a full and complete`,
    `satisfaction of my interests in the Trust and the Estate.`,
    ``,
    `The undersigned does release and forever discharge ${trusteeName}`,
    `as Successor Trustee of the Trust, of and from any`,
    `claim(s) for distributive share, and of and from all actions,`,
    `claims, and demands whatsoever, for or by reason thereof, or of`,
    `any other act, matter, cause, or thing whatsoever arising out of`,
    `the aforesaid Trust, the Estate or the administration thereof,`,
    `as well as ${pronouns.possessive} agents, attorneys, accountants and/or other`,
    `representatives. I understand I have the right to obtain the`,
    `advice of independent legal counsel, but I waive that right at`,
    `this time.`,
    ``,
    `I affirm under penalties of perjury that the foregoing is true`,
    `and correct on this the ___________ day of _______________,`,
    `${new Date().getFullYear()}.`
  ];
  
  let lineY = height - 140;
  for (const line of content) {
    page.drawText(line, {
      x: 50,
      y: lineY,
      size: 11,
      font: helvetica
    });
    lineY -= 18;
  }
  
  // Signature
  lineY -= 30;
  page.drawText('__________________________', {
    x: 50,
    y: lineY,
    size: 11,
    font: helvetica
  });
  lineY -= 15;
  
  page.drawText(beneficiaryName.toUpperCase(), {
    x: 50,
    y: lineY,
    size: 11,
    font: helvetica
  });
  
  // Add notary section if requested
  if (data.include_notary) {
    lineY -= 40;
    page.drawText('State of California', {
      x: 50,
      y: lineY,
      size: 10,
      font: helvetica
    });
    lineY -= 15;
    
    page.drawText('County of ___________', {
      x: 50,
      y: lineY,
      size: 10,
      font: helvetica
    });
    lineY -= 25;
    
    page.drawText('On _________, before me, ________________________, Notary Public,', {
      x: 50,
      y: lineY,
      size: 10,
      font: helvetica
    });
    lineY -= 15;
    
    page.drawText(`personally appeared ${beneficiaryName}, who proved to me on the basis`, {
      x: 50,
      y: lineY,
      size: 10,
      font: helvetica
    });
    lineY -= 15;
    
    page.drawText('of satisfactory evidence to be the person whose name is subscribed to', {
      x: 50,
      y: lineY,
      size: 10,
      font: helvetica
    });
    lineY -= 15;
    
    page.drawText('the within instrument and acknowledged to me that he/she/they executed', {
      x: 50,
      y: lineY,
      size: 10,
      font: helvetica
    });
    lineY -= 15;
    
    page.drawText('the same in his/her/their authorized capacity.', {
      x: 50,
      y: lineY,
      size: 10,
      font: helvetica
    });
    lineY -= 30;
    
    page.drawText('___________________________ (Seal)', {
      x: 50,
      y: lineY,
      size: 10,
      font: helvetica
    });
  }
  
  return await pdfDoc.save();
}

// 3. GENERATE NOTICE TO HEIRS (Probate Code §16061.7)
async function generate60DayNotice(data) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let y = height - 50;
  
  // Date at top right
  const noticeDate = formatLegalDate(data.notice_date || new Date());
  page.drawText(noticeDate, {
    x: width - 150,
    y: y,
    size: 11,
    font: helvetica
  });
  y -= 30;
  
  // Recipient address
  const recipientName = data.recipient_name || '[RECIPIENT NAME]';
  const recipientAddress = data.recipient_address || '[RECIPIENT ADDRESS]';
  const recipientCity = data.recipient_city || '[CITY]';
  const recipientState = data.recipient_state || 'CA';
  const recipientZip = data.recipient_zip || '[ZIP]';
  
  page.drawText(recipientName, {
    x: 50,
    y: y,
    size: 12,
    font: helvetica
  });
  y -= 15;
  
  page.drawText(recipientAddress, {
    x: 50,
    y: y,
    size: 12,
    font: helvetica
  });
  y -= 15;
  
  page.drawText(`${recipientCity}, ${recipientState} ${recipientZip}`, {
    x: 50,
    y: y,
    size: 12,
    font: helvetica
  });
  y -= 40;
  
  // Subject line
  page.drawText('RE: ', {
    x: 50,
    y: y,
    size: 11,
    font: helveticaBold
  });
  
  const trustName = data.trust_name || '[TRUST NAME]';
  page.drawText(trustName, {
    x: 75,
    y: y,
    size: 11,
    font: helvetica
  });
  y -= 30;
  
  // Title
  page.drawText('NOTICE BY TRUSTEE TO HEIRS AND BENEFICIARIES PURSUANT TO', {
    x: width / 2 - 220,
    y: y,
    size: 11,
    font: helveticaBold
  });
  y -= 15;
  
  page.drawText('PROBATE CODE SECTION 16061.7', {
    x: width / 2 - 120,
    y: y,
    size: 11,
    font: helveticaBold
  });
  y -= 30;
  
  // Content with actual data
  const trustDate = formatLegalDate(data.trust_date);
  const decedentName = data.decedent_name || '[DECEDENT NAME]';
  const deathDate = formatLegalDate(data.death_date);
  const trusteeName = data.trustee_name || '[TRUSTEE NAME]';
  const trusteeAddress = data.trustee_address || '[TRUSTEE ADDRESS]';
  const trusteeCity = data.trustee_city || '[CITY]';
  const trusteeState = data.trustee_state || 'CA';
  const trusteeZip = data.trustee_zip || '[ZIP]';
  const trusteePhone = data.trustee_phone || '[PHONE]';
  const trusteeEmail = data.trustee_email || '';
  
  const noticeContent = [
    `Dear ${recipientName}:`,
    ``,
    `As required by law, you are hereby provided with notice of the following information`,
    `regarding ${trustName}, dated ${trustDate}`,
    `(hereinafter referred to as the "Trust").`,
    ``,
    `As required by California Probate Code section 16061.7, you are hereby notified of the`,
    `following matters:`,
    ``,
    `1. The name of the Original Settlor of the Trust: ${decedentName.toUpperCase()}.`,
    ``,
    `2. The Trust was executed on: ${trustDate}.`,
    ``,
    `3. Due to the death of Settlor/Trustee ${decedentName.toUpperCase()} on ${deathDate}, the`,
    `   Successor Trustee${data.cotrustees ? 's' : ''} of the Trust, and the principal place of administration of the Trust ${data.cotrustees ? 'are' : 'is'}:`,
    ``,
    `   ${trusteeName}`,
    `   ${trusteeAddress}`,
    `   ${trusteeCity}, ${trusteeState} ${trusteeZip}`,
    `   Phone: ${trusteePhone}`,
    trusteeEmail ? `   Email: ${trusteeEmail}` : '',
    ``,
    `4. The Trustee${data.cotrustees ? 's' : ''} request${data.cotrustees ? '' : 's'} that copies of any and all correspondence regarding Trust matters be sent`,
    `   to ${data.cotrustees ? 'them' : 'the trustee'} at the above address.`,
    ``,
    `5. The terms of the Trust do not provide for any special information to be included with this`,
    `   notice.`,
    ``,
    `6. You are entitled, as a possible beneficiary or heir at law of the decedent, to request from the`,
    `   trustee a true and complete copy of the "Terms of the Trust," as that term is defined in Probate`,
    `   Code Section 16060.5.`,
    ``,
    `7. WARNING: YOU MAY NOT BRING AN ACTION TO CONTEST THE TRUST`,
    `   MORE THAN 120 DAYS FROM THE DATE THIS NOTIFICATION BY THE TRUSTEE`,
    `   IS SERVED UPON YOU OR 60 DAYS FROM THE DAY ON WHICH A COPY OF THE`,
    `   TERMS OF THE TRUST IS MAILED OR PERSONALLY DELIVERED TO YOU`,
    `   DURING THAT 120-DAY PERIOD, WHICHEVER IS LATER.`
  ];
  
  for (const line of noticeContent) {
    if (!line) continue; // Skip empty email line if not provided
    
    let font = helvetica;
    let xPos = 50;
    
    if (line.includes('WARNING:')) {
      font = helveticaBold;
    } else if (line.startsWith('   ')) {
      xPos = 70;
    }
    
    page.drawText(line, {
      x: xPos,
      y: y,
      size: 11,
      font: font
    });
    y -= 16;
    
    if (y < 100) {
      // Add new page if needed
      const newPage = pdfDoc.addPage([612, 792]);
      y = height - 50;
    }
  }
  
  // Signature section
  y -= 30;
  page.drawText('Sincerely,', {
    x: 50,
    y: y,
    size: 11,
    font: helvetica
  });
  y -= 40;
  
  page.drawText('_______________________________________', {
    x: 50,
    y: y,
    size: 11,
    font: helvetica
  });
  y -= 15;
  
  page.drawText(`${trusteeName}, Successor Trustee`, {
    x: 50,
    y: y,
    size: 11,
    font: helvetica
  });
  y -= 15;
  
  page.drawText(`of ${trustName}`, {
    x: 50,
    y: y,
    size: 11,
    font: helvetica
  });
  
  // Page number
  page.drawText('Page 1', {
    x: width / 2 - 20,
    y: 30,
    size: 10,
    font: helvetica
  });
  
  return await pdfDoc.save();
}

// Main handler
exports.handler = async (event, context) => {
  console.log('Generate Trust Documents handler called');
  
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
    console.log('Input data received:', JSON.stringify(data, null, 2));
    
    const documents = {};
    const errors = [];
    
    // Generate requested documents
    if (data.generate_receipt) {
      try {
        console.log('Generating Receipt...');
        const receiptPdf = await generateReceipt(data);
        documents.receipt = Buffer.from(receiptPdf).toString('base64');
        console.log('Receipt generated successfully');
      } catch (error) {
        console.error('Error generating receipt:', error);
        errors.push(`Receipt: ${error.message}`);
      }
    }
    
    if (data.generate_waiver) {
      try {
        console.log('Generating Waiver and Release...');
        const waiverPdf = await generateWaiverAndRelease(data);
        documents.waiver_and_release = Buffer.from(waiverPdf).toString('base64');
        console.log('Waiver generated successfully');
      } catch (error) {
        console.error('Error generating waiver:', error);
        errors.push(`Waiver: ${error.message}`);
      }
    }
    
    if (data.generate_60day_notice) {
      try {
        console.log('Generating 60-Day Notice...');
        const noticePdf = await generate60DayNotice(data);
        documents.sixty_day_notice = Buffer.from(noticePdf).toString('base64');
        console.log('60-Day Notice generated successfully');
      } catch (error) {
        console.error('Error generating 60-day notice:', error);
        errors.push(`60-Day Notice: ${error.message}`);
      }
    }
    
    // Check if any documents were generated
    if (Object.keys(documents).length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'No documents generated',
          details: errors.length > 0 ? errors : 'No documents were requested for generation'
        })
      };
    }
    
    const response = {
      success: true,
      message: `Generated ${Object.keys(documents).length} trust documents`,
      documents: documents,
      case_number: data.case_number,
      timestamp: new Date().toISOString()
    };
    
    if (errors.length > 0) {
      response.errors = errors;
      response.message += ` (${errors.length} documents failed)`;
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
    console.error('Error generating trust documents:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to generate documents',
        details: error.message
      })
    };
  }
};
