// netlify/functions/generate-government-notices.js

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// Agency addresses for notices
const AGENCY_ADDRESSES = {
  ftb: {
    name: "California Franchise Tax Board",
    address1: "P.O. Box 2952, MS A-454",
    address2: "Sacramento, CA 95812-9974",
    fax: "(916) 845-6500"
  },
  irs: {
    name: "Internal Revenue Service",
    address1: "Ogden Service Center",
    address2: "Ogden, UT 84201-0002",
    fax: "(855) 214-7520"
  },
  dhcs: {
    name: "Department of Health Care Services",
    address1: "Estate Recovery Unit, MS 4720",
    address2: "P.O. Box 997425, Sacramento, CA 95899-7425",
    fax: "(916) 552-9115"
  },
  ssa: {
    name: "Social Security Administration",
    address1: "P.O. Box 8797",
    address2: "Baltimore, MD 21240-8797",
    fax: "N/A - Use mail"
  },
  controller: {
    name: "California State Controller",
    address1: "Unclaimed Property Division",
    address2: "P.O. Box 942850, Sacramento, CA 94250-5873",
    fax: "(916) 323-2238"
  },
  edd: {
    name: "Employment Development Department",
    address1: "P.O. Box 826880, MIC 50",
    address2: "Sacramento, CA 94280-0001",
    fax: "(916) 654-7041"
  },
  va: {
    name: "Department of Veterans Affairs",
    address1: "810 Vermont Avenue NW",
    address2: "Washington, DC 20420",
    fax: "(202) 495-5450"
  }
};

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

// Format date function
function formatDate(dateString) {
  const date = new Date(dateString);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// Format SSN (last 4 only for security)
function formatSSN(last4) {
  if (!last4) return "XXX-XX-XXXX";
  return `XXX-XX-${last4}`;
}

// Generate a single agency notice
async function generateAgencyNotice(caseData, agency) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();
  
  // Load fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let yPosition = height - 50;
  
  // Law office header
  page.drawText(LAW_OFFICE.firm_name, {
    x: 50,
    y: yPosition,
    size: 14,
    font: helveticaBold,
    color: rgb(0, 0, 0)
  });
  yPosition -= 20;
  
  page.drawText(LAW_OFFICE.address, {
    x: 50,
    y: yPosition,
    size: 12,
    font: helvetica
  });
  yPosition -= 15;
  
  page.drawText(LAW_OFFICE.city_state_zip, {
    x: 50,
    y: yPosition,
    size: 12,
    font: helvetica
  });
  yPosition -= 15;
  
  page.drawText(`PHONE: ${LAW_OFFICE.phone}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font: helvetica
  });
  yPosition -= 15;
  
  page.drawText(`FAX: ${LAW_OFFICE.fax}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font: helvetica
  });
  yPosition -= 40;
  
  // Transmission method
  page.drawText("Sent Via Fax", {
    x: 50,
    y: yPosition,
    size: 11,
    font: helvetica
  });
  yPosition -= 30;
  
  // Date
  page.drawText(formatDate(new Date()), {
    x: 50,
    y: yPosition,
    size: 12,
    font: helvetica
  });
  yPosition -= 30;
  
  // Agency address
  page.drawText(agency.name, {
    x: 50,
    y: yPosition,
    size: 12,
    font: helvetica
  });
  yPosition -= 15;
  
  page.drawText(agency.address1, {
    x: 50,
    y: yPosition,
    size: 12,
    font: helvetica
  });
  yPosition -= 15;
  
  page.drawText(agency.address2, {
    x: 50,
    y: yPosition,
    size: 12,
    font: helvetica
  });
  yPosition -= 40;
  
  // Greeting
  page.drawText("Dear Sir or Madam", {
    x: 50,
    y: yPosition,
    size: 12,
    font: helvetica
  });
  yPosition -= 30;
  
  // Subject line
  page.drawText(`Re: Estate of ${caseData.decedent_name}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font: helvetica
  });
  yPosition -= 15;
  
  page.drawText(`Date of death: ${formatDate(caseData.death_date)}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font: helvetica
  });
  yPosition -= 15;
  
  page.drawText(`Social Security No: ${formatSSN(caseData.ssn_last4)}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font: helvetica
  });
  yPosition -= 30;
  
  // Notice header
  page.drawText("NOTICE IS HEREBY GIVEN:", {
    x: 50,
    y: yPosition,
    size: 12,
    font: helveticaBold
  });
  yPosition -= 30;
  
  // Body paragraph 1
  const bodyText1 = `Pursuant to Probate Code Section 215, Section 9202, this letter serves as notice of the death of ${caseData.decedent_name}. A copy of the death certificate for ${caseData.decedent_name} is enclosed for your review.`;
  
  // Word wrap function for long text
  const words1 = bodyText1.split(' ');
  let line1 = '';
  for (const word of words1) {
    const testLine = line1 + word + ' ';
    const testWidth = helvetica.widthOfTextAtSize(testLine, 12);
    if (testWidth > 500) {
      page.drawText(line1.trim(), {
        x: 50,
        y: yPosition,
        size: 12,
        font: helvetica
      });
      yPosition -= 15;
      line1 = word + ' ';
    } else {
      line1 = testLine;
    }
  }
  if (line1) {
    page.drawText(line1.trim(), {
      x: 50,
      y: yPosition,
      size: 12,
      font: helvetica
    });
    yPosition -= 30;
  }
  
  // Body paragraph 2
  const maritalStatus = caseData.marital_status || 'single';
  const bodyText2 = `${caseData.decedent_name} was ${maritalStatus} at the time of ${caseData.gender === 'male' ? 'his' : 'her'} death. A copy of the death certificate for ${caseData.decedent_name} is enclosed for your review. We are also requesting a letter stating our client's final billed amount.`;
  
  const words2 = bodyText2.split(' ');
  let line2 = '';
  for (const word of words2) {
    const testLine = line2 + word + ' ';
    const testWidth = helvetica.widthOfTextAtSize(testLine, 12);
    if (testWidth > 500) {
      page.drawText(line2.trim(), {
        x: 50,
        y: yPosition,
        size: 12,
        font: helvetica
      });
      yPosition -= 15;
      line2 = word + ' ';
    } else {
      line2 = testLine;
    }
  }
  if (line2) {
    page.drawText(line2.trim(), {
      x: 50,
      y: yPosition,
      size: 12,
      font: helvetica
    });
    yPosition -= 30;
  }
  
  // Closing paragraph
  const closingText = `Please inform us promptly if a claim will be made against the Estate of ${caseData.decedent_name}. Please fax all correspondence to ${LAW_OFFICE.fax} or mail to`;
  
  const words3 = closingText.split(' ');
  let line3 = '';
  for (const word of words3) {
    const testLine = line3 + word + ' ';
    const testWidth = helvetica.widthOfTextAtSize(testLine, 12);
    if (testWidth > 500) {
      page.drawText(line3.trim(), {
        x: 50,
        y: yPosition,
        size: 12,
        font: helvetica
      });
      yPosition -= 15;
      line3 = word + ' ';
    } else {
      line3 = testLine;
    }
  }
  if (line3) {
    page.drawText(line3.trim(), {
      x: 50,
      y: yPosition,
      size: 12,
      font: helvetica
    });
    yPosition -= 30;
  }
  
  // Return address
  page.drawText("Law Offices of Rozsa Gyene", {
    x: 100,
    y: yPosition,
    size: 12,
    font: helvetica
  });
  yPosition -= 15;
  
  page.drawText("450 N Brand Blvd Suite 600", {
    x: 100,
    y: yPosition,
    size: 12,
    font: helvetica
  });
  yPosition -= 15;
  
  page.drawText("Glendale CA 91203", {
    x: 100,
    y: yPosition,
    size: 12,
    font: helvetica
  });
  yPosition -= 40;
  
  // Closing
  page.drawText("Sincerely yours", {
    x: 50,
    y: yPosition,
    size: 12,
    font: helvetica
  });
  yPosition -= 40;
  
  // Signature line
  page.drawLine({
    start: { x: 50, y: yPosition },
    end: { x: 200, y: yPosition },
    thickness: 1,
    color: rgb(0, 0, 0)
  });
  yPosition -= 15;
  
  page.drawText("Rozsa Gyene, Esq.", {
    x: 50,
    y: yPosition,
    size: 12,
    font: helvetica
  });
  
  return await pdfDoc.save();
}

// Main handler function
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
    const data = JSON.parse(event.body);
    
    // Use real data from the form submission
    const caseData = {
      case_number: data.case_number,
      decedent_name: data.decedent_name,
      death_date: data.death_date,
      ssn_last4: data.ssn_last4,
      marital_status: data.marital_status,
      gender: data.gender
    };
    
    // Validate required fields
    if (!caseData.decedent_name || !caseData.death_date) {
      throw new Error('Missing required fields: decedent_name and death_date are required');
    }
    
    const documents = {};
    
    // Generate notices for selected agencies
    const agencies = data.agencies || ['ftb', 'irs', 'dhcs'];
    
    for (const agencyKey of agencies) {
      if (AGENCY_ADDRESSES[agencyKey]) {
        const pdfBytes = await generateAgencyNotice(caseData, AGENCY_ADDRESSES[agencyKey]);
        documents[`${agencyKey}_notice`] = Buffer.from(pdfBytes).toString('base64');
      }
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: `Generated ${Object.keys(documents).length} government notices`,
        documents: documents,
        case_number: caseData.case_number
      })
    };
    
  } catch (error) {
    console.error('Error generating government notices:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to generate notices',
        details: error.message
      })
    };
  }
};
