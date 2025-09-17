// netlify/functions/generate-distribution-docs.js

const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib');

// Law office information
const LAW_OFFICE = {
  firm_name: "LAW OFFICES OF ROZSA GYENE",
  address: "450 N BRAND BLVD SUITE 600",
  city_state_zip: "GLENDALE CA 91203",
  phone: "(818) 291-6217",
  fax: "(818) 291-6205",
  attorney: "Rozsa Gyene, Esq.",
  bar_number: "208356"
};

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// Format currency
function formatCurrency(amount) {
  if (!amount) return "$0.00";
  const num = parseFloat(amount.toString().replace(/[^0-9.-]/g, ''));
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(num);
}

// 1. WAIVER OF ACCOUNTING AND CONSENT TO DISTRIBUTION
async function generateWaiverOfAccounting(data) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let y = height - 50;
  
  // Title
  page.drawText('WAIVER OF ACCOUNTING', {
    x: width / 2 - 120,
    y: y,
    size: 16,
    font: helveticaBold
  });
  y -= 20;
  
  page.drawText('AND', {
    x: width / 2 - 15,
    y: y,
    size: 16,
    font: helveticaBold
  });
  y -= 20;
  
  page.drawText('CONSENT TO DISTRIBUTION', {
    x: width / 2 - 130,
    y: y,
    size: 16,
    font: helveticaBold
  });
  y -= 40;
  
  // Trust identification
  page.drawText(`Trust: ${data.trust_name}`, {
    x: 50,
    y: y,
    size: 12,
    font: helvetica
  });
  y -= 20;
  
  page.drawText(`Trustee: ${data.trustee_name}`, {
    x: 50,
    y: y,
    size: 12,
    font: helvetica
  });
  y -= 20;
  
  page.drawText(`Decedent: ${data.decedent_name}`, {
    x: 50,
    y: y,
    size: 12,
    font: helvetica
  });
  y -= 20;
  
  page.drawText(`Date of Death: ${formatDate(data.death_date)}`, {
    x: 50,
    y: y,
    size: 12,
    font: helvetica
  });
  y -= 40;
  
  // Main text
  const mainText = [
    `I, ${data.beneficiary_name}, am a beneficiary of the ${data.trust_name} (the "Trust").`,
    '',
    'I hereby acknowledge and agree as follows:',
    '',
    '1. WAIVER OF ACCOUNTING. I hereby waive my right to receive a formal accounting from the Trustee',
    'of the Trust. I understand that I have the right under California Probate Code Section 16062 to',
    'request and receive a formal accounting, but I voluntarily waive this right.',
    '',
    '2. INFORMATION RECEIVED. I acknowledge that I have received sufficient information regarding',
    'the Trust administration, including:',
    '   • An inventory of Trust assets',
    '   • Information regarding Trust income and expenses',
    '   • A proposed distribution schedule',
    '   • Such other information as I have requested',
    '',
    '3. CONSENT TO DISTRIBUTION. I have reviewed the proposed distribution and consent to the',
    `distribution of ${data.distribution_description || 'my share of the Trust estate'} as follows:`,
    '',
    `   ${data.distribution_amount ? formatCurrency(data.distribution_amount) : 'As set forth in the distribution schedule'}`,
    '',
    '4. SATISFACTION. I am satisfied with the Trustee\'s administration of the Trust and consent to',
    'the proposed distribution without requiring a formal accounting.',
    '',
    '5. VOLUNTARY EXECUTION. I execute this waiver voluntarily, with full knowledge of its contents',
    'and my rights under California law. I have had the opportunity to consult with independent',
    'legal counsel regarding this waiver.',
    '',
    '6. NO FURTHER CLAIMS. Upon receipt of my distribution, I agree that I will have no further',
    'claims against the Trust, the Trustee, or the Trust estate.'
  ];
  
  for (const line of mainText) {
    if (y < 150) {
      // Add new page if needed
      const newPage = pdfDoc.addPage([612, 792]);
      y = height - 50;
    }
    
    if (line.startsWith('   ')) {
      // Indented line
      page.drawText(line, {
        x: 70,
        y: y,
        size: 11,
        font: helvetica
      });
    } else if (line.match(/^\d\./)) {
      // Numbered paragraph
      page.drawText(line, {
        x: 50,
        y: y,
        size: 11,
        font: helveticaBold
      });
    } else {
      page.drawText(line, {
        x: 50,
        y: y,
        size: 11,
        font: helvetica
      });
    }
    y -= 15;
  }
  
  // Signature section
  y -= 30;
  page.drawText('Dated: _____________________', {
    x: 50,
    y: y,
    size: 12,
    font: helvetica
  });
  
  y -= 40;
  page.drawLine({
    start: { x: 50, y: y },
    end: { x: 300, y: y },
    thickness: 1
  });
  y -= 15;
  page.drawText(data.beneficiary_name, {
    x: 50,
    y: y,
    size: 12,
    font: helvetica
  });
  y -= 15;
  page.drawText('Beneficiary', {
    x: 50,
    y: y,
    size: 11,
    font: helvetica
  });
  
  return await pdfDoc.save();
}

// 2. RECEIPT AND RELEASE AGREEMENT
async function generateReceiptAndRelease(data) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let y = height - 50;
  
  // Title
  page.drawText('RECEIPT, RELEASE AND REFUNDING AGREEMENT', {
    x: width / 2 - 180,
    y: y,
    size: 14,
    font: helveticaBold
  });
  y -= 40;
  
  // Parties
  const partiesText = [
    `This Receipt, Release and Refunding Agreement ("Agreement") is entered into as of`,
    `_________________, 20__, by and between ${data.trustee_name}, as Trustee of the`,
    `${data.trust_name} ("Trustee"), and ${data.beneficiary_name} ("Beneficiary").`
  ];
  
  for (const line of partiesText) {
    page.drawText(line, {
      x: 50,
      y: y,
      size: 11,
      font: helvetica
    });
    y -= 15;
  }
  y -= 20;
  
  // Recitals
  page.drawText('RECITALS', {
    x: width / 2 - 40,
    y: y,
    size: 12,
    font: helveticaBold
  });
  y -= 20;
  
  const recitals = [
    `A. ${data.decedent_name} died on ${formatDate(data.death_date)}.`,
    '',
    `B. The Trustee has administered the Trust in accordance with its terms.`,
    '',
    `C. Beneficiary is entitled to a distribution from the Trust.`,
    '',
    `D. The parties desire to document the distribution and fully release the Trustee.`
  ];
  
  for (const line of recitals) {
    page.drawText(line, {
      x: 50,
      y: y,
      size: 11,
      font: helvetica
    });
    y -= 15;
  }
  y -= 20;
  
  // Agreement
  page.drawText('AGREEMENT', {
    x: width / 2 - 45,
    y: y,
    size: 12,
    font: helveticaBold
  });
  y -= 20;
  
  const agreementText = [
    'NOW, THEREFORE, in consideration of the mutual covenants and agreements herein contained,',
    'the parties agree as follows:',
    '',
    '1. RECEIPT. Beneficiary acknowledges receipt from the Trustee of the following distribution:',
    '',
    `   Cash: ${data.cash_distribution ? formatCurrency(data.cash_distribution) : 'N/A'}`,
    `   Property: ${data.property_distribution || 'N/A'}`,
    `   Other: ${data.other_distribution || 'N/A'}`,
    '',
    '2. RELEASE. In consideration of the distribution received, Beneficiary hereby releases and',
    'forever discharges the Trustee, and the Trustee\'s heirs, executors, administrators, successors,',
    'and assigns, from any and all claims, demands, actions, causes of action, suits, damages, and',
    'liabilities of any kind whatsoever, whether known or unknown, arising out of or in connection',
    'with the administration of the Trust.',
    '',
    '3. INDEMNIFICATION. Beneficiary agrees to indemnify and hold harmless the Trustee from any',
    'and all claims, losses, damages, costs, and expenses (including reasonable attorney\'s fees)',
    'arising out of or resulting from any breach of this Agreement by Beneficiary.',
    '',
    '4. REFUNDING. If it is later determined that the distribution to Beneficiary exceeded the amount',
    'to which Beneficiary was entitled, Beneficiary agrees to refund the excess to the Trust estate',
    'upon demand.',
    '',
    '5. CALIFORNIA LAW. This Agreement shall be governed by California law.',
    '',
    '6. ENTIRE AGREEMENT. This Agreement constitutes the entire agreement between the parties.'
  ];
  
  for (const line of agreementText) {
    if (y < 150) {
      // Add new page
      const newPage = pdfDoc.addPage([612, 792]);
      y = height - 50;
    }
    
    if (line.startsWith('   ')) {
      page.drawText(line, {
        x: 70,
        y: y,
        size: 11,
        font: helvetica
      });
    } else if (line.match(/^\d\./)) {
      page.drawText(line, {
        x: 50,
        y: y,
        size: 11,
        font: helveticaBold
      });
    } else {
      page.drawText(line, {
        x: 50,
        y: y,
        size: 11,
        font: helvetica
      });
    }
    y -= 15;
  }
  
  // Signatures
  y -= 30;
  
  // Trustee signature
  page.drawText('TRUSTEE:', {
    x: 50,
    y: y,
    size: 12,
    font: helveticaBold
  });
  y -= 30;
  
  page.drawLine({
    start: { x: 50, y: y },
    end: { x: 250, y: y },
    thickness: 1
  });
  y -= 15;
  page.drawText(`${data.trustee_name}, Trustee`, {
    x: 50,
    y: y,
    size: 11,
    font: helvetica
  });
  y -= 15;
  page.drawText('Date: _____________________', {
    x: 50,
    y: y,
    size: 11,
    font: helvetica
  });
  
  // Beneficiary signature
  y -= 40;
  page.drawText('BENEFICIARY:', {
    x: 50,
    y: y,
    size: 12,
    font: helveticaBold
  });
  y -= 30;
  
  page.drawLine({
    start: { x: 50, y: y },
    end: { x: 250, y: y },
    thickness: 1
  });
  y -= 15;
  page.drawText(data.beneficiary_name, {
    x: 50,
    y: y,
    size: 11,
    font: helvetica
  });
  y -= 15;
  page.drawText('Date: _____________________', {
    x: 50,
    y: y,
    size: 11,
    font: helvetica
  });
  
  return await pdfDoc.save();
}

// 3. RECEIPT FOR DISTRIBUTION
async function generateDistributionReceipt(data) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let y = height - 50;
  
  // Header
  page.drawText('RECEIPT FOR DISTRIBUTION', {
    x: width / 2 - 100,
    y: y,
    size: 16,
    font: helveticaBold
  });
  y -= 20;
  
  page.drawText('FROM TRUST', {
    x: width / 2 - 50,
    y: y,
    size: 16,
    font: helveticaBold
  });
  y -= 40;
  
  // Trust info box
  page.drawRectangle({
    x: 50,
    y: y - 80,
    width: width - 100,
    height: 80,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1
  });
  
  page.drawText('TRUST INFORMATION', {
    x: 60,
    y: y - 20,
    size: 10,
    font: helveticaBold
  });
  
  page.drawText(`Trust Name: ${data.trust_name}`, {
    x: 60,
    y: y - 35,
    size: 11,
    font: helvetica
  });
  
  page.drawText(`Trustee: ${data.trustee_name}`, {
    x: 60,
    y: y - 50,
    size: 11,
    font: helvetica
  });
  
  page.drawText(`Decedent: ${data.decedent_name} (DOD: ${formatDate(data.death_date)})`, {
    x: 60,
    y: y - 65,
    size: 11,
    font: helvetica
  });
  
  y -= 100;
  
  // Receipt text
  page.drawText('RECEIPT', {
    x: 50,
    y: y,
    size: 12,
    font: helveticaBold
  });
  y -= 25;
  
  const receiptText = `The undersigned, ${data.beneficiary_name}, hereby acknowledges receipt from ${data.trustee_name}, as Trustee of the above-referenced Trust, of the following distribution:`;
  
  // Word wrap receipt text
  const words = receiptText.split(' ');
  let line = '';
  for (const word of words) {
    const testLine = line + word + ' ';
    if (helvetica.widthOfTextAtSize(testLine, 11) > width - 100) {
      page.drawText(line.trim(), {
        x: 50,
        y: y,
        size: 11,
        font: helvetica
      });
      y -= 15;
      line = word + ' ';
    } else {
      line = testLine;
    }
  }
  if (line) {
    page.drawText(line.trim(), {
      x: 50,
      y: y,
      size: 11,
      font: helvetica
    });
    y -= 25;
  }
  
  // Distribution details box
  page.drawRectangle({
    x: 50,
    y: y - 120,
    width: width - 100,
    height: 120,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1
  });
  
  page.drawText('DISTRIBUTION DETAILS', {
    x: 60,
    y: y - 20,
    size: 10,
    font: helveticaBold
  });
  
  let detailY = y - 40;
  
  if (data.cash_distribution) {
    page.drawText(`Cash Distribution: ${formatCurrency(data.cash_distribution)}`, {
      x: 60,
      y: detailY,
      size: 11,
      font: helvetica
    });
    detailY -= 20;
  }
  
  if (data.property_distribution) {
    page.drawText(`Property: ${data.property_distribution}`, {
      x: 60,
      y: detailY,
      size: 11,
      font: helvetica
    });
    detailY -= 20;
  }
  
  if (data.securities_distribution) {
    page.drawText(`Securities: ${data.securities_distribution}`, {
      x: 60,
      y: detailY,
      size: 11,
      font: helvetica
    });
    detailY -= 20;
  }
  
  if (data.other_distribution) {
    page.drawText(`Other: ${data.other_distribution}`, {
      x: 60,
      y: detailY,
      size: 11,
      font: helvetica
    });
  }
  
  y -= 140;
  
  // Total value
  page.drawText(`TOTAL VALUE OF DISTRIBUTION: ${formatCurrency(data.total_distribution)}`, {
    x: 50,
    y: y,
    size: 12,
    font: helveticaBold
  });
  y -= 30;
  
  // Acknowledgment
  const ackText = [
    'The undersigned acknowledges that this distribution represents their entire interest in the Trust',
    'and that upon receipt of this distribution, they have no further claim against the Trust or Trustee.'
  ];
  
  for (const line of ackText) {
    page.drawText(line, {
      x: 50,
      y: y,
      size: 11,
      font: helvetica
    });
    y -= 15;
  }
  
  y -= 30;
  
  // Signature section
  page.drawText('BENEFICIARY SIGNATURE', {
    x: 50,
    y: y,
    size: 12,
    font: helveticaBold
  });
  y -= 30;
  
  page.drawLine({
    start: { x: 50, y: y },
    end: { x: 300, y: y },
    thickness: 1
  });
  y -= 15;
  
  page.drawText(`Print Name: ${data.beneficiary_name}`, {
    x: 50,
    y: y,
    size: 11,
    font: helvetica
  });
  y -= 20;
  
  page.drawText('Date: _____________________', {
    x: 50,
    y: y,
    size: 11,
    font: helvetica
  });
  
  // Trustee acknowledgment
  y -= 50;
  page.drawText('TRUSTEE ACKNOWLEDGMENT', {
    x: 50,
    y: y,
    size: 12,
    font: helveticaBold
  });
  y -= 20;
  
  page.drawText('Distribution made on: _____________________', {
    x: 50,
    y: y,
    size: 11,
    font: helvetica
  });
  y -= 30;
  
  page.drawLine({
    start: { x: 50, y: y },
    end: { x: 300, y: y },
    thickness: 1
  });
  y -= 15;
  
  page.drawText(`${data.trustee_name}, Trustee`, {
    x: 50,
    y: y,
    size: 11,
    font: helvetica
  });
  
  return await pdfDoc.save();
}

// 4. FINAL DISTRIBUTION LETTER
async function generateFinalDistributionLetter(data) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let y = height - 50;
  
  // Law office header
  page.drawText(LAW_OFFICE.firm_name, {
    x: 50,
    y: y,
    size: 14,
    font: helveticaBold
  });
  y -= 20;
  
  page.drawText(LAW_OFFICE.address, {
    x: 50,
    y: y,
    size: 12,
    font: helvetica
  });
  y -= 15;
  
  page.drawText(LAW_OFFICE.city_state_zip, {
    x: 50,
    y: y,
    size: 12,
    font: helvetica
  });
  y -= 15;
  
  page.drawText(`Phone: ${LAW_OFFICE.phone} | Fax: ${LAW_OFFICE.fax}`, {
    x: 50,
    y: y,
    size: 12,
    font: helvetica
  });
  y -= 40;
  
  // Date
  page.drawText(formatDate(new Date()), {
    x: 50,
    y: y,
    size: 12,
    font: helvetica
  });
  y -= 30;
  
  // Recipient
  page.drawText(data.beneficiary_name, {
    x: 50,
    y: y,
    size: 12,
    font: helvetica
  });
  y -= 15;
  
  if (data.beneficiary_address) {
    const addressLines = data.beneficiary_address.split('\n');
    for (const line of addressLines) {
      page.drawText(line, {
        x: 50,
        y: y,
        size: 12,
        font: helvetica
      });
      y -= 15;
    }
  }
  y -= 20;
  
  // Re line
  page.drawText(`Re: ${data.trust_name}`, {
    x: 50,
    y: y,
    size: 12,
    font: helveticaBold
  });
  y -= 15;
  page.drawText(`     Final Distribution`, {
    x: 50,
    y: y,
    size: 12,
    font: helveticaBold
  });
  y -= 30;
  
  // Salutation
  page.drawText(`Dear ${data.beneficiary_name}:`, {
    x: 50,
    y: y,
    size: 12,
    font: helvetica
  });
  y -= 25;
  
  // Letter body
  const letterBody = [
    `I am pleased to inform you that the administration of the ${data.trust_name} has been`,
    'completed. Enclosed please find the following:',
    '',
    `1. Your final distribution check in the amount of ${formatCurrency(data.distribution_amount)}`,
    '',
    '2. Receipt for Distribution form (please sign and return)',
    '',
    '3. Waiver of Accounting and Consent to Distribution (please sign and return)',
    '',
    '4. Receipt, Release and Refunding Agreement (please sign and return)',
    '',
    'Please sign the enclosed documents where indicated and return them to our office in the',
    'enclosed self-addressed stamped envelope. Once we receive the signed documents, the',
    'trust administration will be formally concluded.',
    '',
    'The distribution you are receiving represents your entire interest in the Trust. This includes:',
    '',
    `• Cash distribution: ${data.cash_distribution ? formatCurrency(data.cash_distribution) : 'N/A'}`,
    `• Property: ${data.property_distribution || 'N/A'}`,
    `• Other assets: ${data.other_distribution || 'N/A'}`,
    '',
    'For tax purposes, please note that you may receive a Schedule K-1 for any income earned',
    'by the Trust during the administration period. This will be mailed separately if applicable.',
    '',
    'It has been our pleasure to assist with the administration of this Trust. Should you have',
    'any questions regarding your distribution or the enclosed documents, please do not hesitate',
    'to contact our office.',
    '',
    'We recommend that you consult with your tax advisor regarding any tax implications of',
    'this distribution.',
    '',
    'Thank you for your patience and cooperation throughout this process.'
  ];
  
  for (const line of letterBody) {
    if (y < 100) {
      // Add new page
      const newPage = pdfDoc.addPage([612, 792]);
      y = height - 50;
    }
    
    if (line.startsWith('•')) {
      page.drawText(line, {
        x: 70,
        y: y,
        size: 11,
        font: helvetica
      });
    } else if (line.match(/^\d\./)) {
      page.drawText(line, {
        x: 70,
        y: y,
        size: 11,
        font: helvetica
      });
    } else {
      page.drawText(line, {
        x: 50,
        y: y,
        size: 11,
        font: helvetica
      });
    }
    y -= 15;
  }
  
  // Closing
  y -= 20;
  page.drawText('Very truly yours,', {
    x: 50,
    y: y,
    size: 12,
    font: helvetica
  });
  y -= 40;
  
  page.drawText('LAW OFFICES OF ROZSA GYENE', {
    x: 50,
    y: y,
    size: 12,
    font: helvetica
  });
  y -= 40;
  
  page.drawText('Rozsa Gyene, Esq.', {
    x: 50,
    y: y,
    size: 12,
    font: helvetica
  });
  y -= 20;
  
  page.drawText('Enclosures', {
    x: 50,
    y: y,
    size: 11,
    font: helvetica
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
    if (data.generate_waiver !== false) {
      const waiverPdf = await generateWaiverOfAccounting(data);
      documents.waiver_of_accounting = Buffer.from(waiverPdf).toString('base64');
    }
    
    if (data.generate_release !== false) {
      const releasePdf = await generateReceiptAndRelease(data);
      documents.receipt_and_release = Buffer.from(releasePdf).toString('base64');
    }
    
    if (data.generate_receipt !== false) {
      const receiptPdf = await generateDistributionReceipt(data);
      documents.distribution_receipt = Buffer.from(receiptPdf).toString('base64');
    }
    
    if (data.generate_letter !== false) {
      const letterPdf = await generateFinalDistributionLetter(data);
      documents.final_distribution_letter = Buffer.from(letterPdf).toString('base64');
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: `Generated ${Object.keys(documents).length} distribution documents`,
        documents: documents,
        beneficiary: data.beneficiary_name
      })
    };
    
  } catch (error) {
    console.error('Error generating distribution documents:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to generate documents',
        details: error.message
      })
    };
  }
};
