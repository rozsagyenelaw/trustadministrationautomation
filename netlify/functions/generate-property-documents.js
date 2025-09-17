// netlify/functions/generate-property-documents.js
// FIXED VERSION - Properly uses input data

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// Law office information
const LAW_OFFICE = {
  attorney: "ROZSA GYENE, ESQ. SBN 208356",
  firm: "LAW OFFICES OF ROZSA GYENE",
  address1: "450 N BRAND BLVD SUITE 600",
  city_state_zip: "GLENDALE CA 91203",
  phone: "(818) 291-6217",
  fax: "(818) 291-6205"
};

// Format date
function formatDate(dateString) {
  if (!dateString) return "___________";
  const date = new Date(dateString);
  return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
}

// 1. GENERATE AFFIDAVIT - DEATH OF TRUSTEE
async function generateAffidavitDeathOfTrustee(data) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let y = height - 50;
  
  // Recording header
  page.drawText('RECORDING REQUESTED BY:', {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 15;
  
  page.drawText(LAW_OFFICE.firm, {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 15;
  
  page.drawText(LAW_OFFICE.address1, {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 15;
  
  page.drawText(LAW_OFFICE.city_state_zip, {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 25;
  
  page.drawText('AND WHEN RECORDED MAIL TO:', {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 15;
  
  // Use actual data for surviving trustee
  const survivingTrustee = data.surviving_trustee || data.trustee_name || '[SURVIVING TRUSTEE NAME]';
  const propertyAddress = data.property_address || '[PROPERTY ADDRESS]';
  const propertyCity = data.property_city || '';
  const propertyState = data.property_state || 'CA';
  const propertyZip = data.property_zip || '';
  
  page.drawText(survivingTrustee.toUpperCase(), {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 15;
  
  page.drawText(propertyAddress, {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 15;
  
  if (propertyCity || propertyZip) {
    page.drawText(`${propertyCity}, ${propertyState} ${propertyZip}`, {
      x: 50,
      y: y,
      size: 10,
      font: helvetica
    });
    y -= 25;
  } else {
    y -= 10;
  }
  
  // Space for recorder's use
  page.drawLine({
    start: { x: 50, y: y },
    end: { x: width - 50, y: y },
    thickness: 1,
    color: rgb(0, 0, 0)
  });
  y -= 15;
  
  page.drawText('SPACE ABOVE THIS LINE FOR RECORDER\'S USE', {
    x: width / 2 - 120,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 30;
  
  // APN if provided
  if (data.apn) {
    page.drawText(`APN: ${data.apn}`, {
      x: 50,
      y: y,
      size: 10,
      font: helvetica
    });
    y -= 25;
  }
  
  // Title
  page.drawText('AFFIDAVIT - DEATH OF TRUSTEE', {
    x: width / 2 - 100,
    y: y,
    size: 14,
    font: helveticaBold
  });
  y -= 40;
  
  // State and County
  page.drawText('STATE OF CALIFORNIA', {
    x: 50,
    y: y,
    size: 11,
    font: helvetica
  });
  page.drawText(')', {
    x: 250,
    y: y,
    size: 11,
    font: helvetica
  });
  y -= 15;
  
  page.drawText(')', {
    x: 250,
    y: y,
    size: 11,
    font: helvetica
  });
  page.drawText('SS.', {
    x: 260,
    y: y,
    size: 11,
    font: helvetica
  });
  y -= 15;
  
  const county = data.property_county || 'LOS ANGELES';
  page.drawText(`COUNTY OF ${county.toUpperCase()}`, {
    x: 50,
    y: y,
    size: 11,
    font: helvetica
  });
  page.drawText(')', {
    x: 250,
    y: y,
    size: 11,
    font: helvetica
  });
  y -= 30;
  
  // Affidavit body with actual data
  const decedentName = data.decedent_name || '[DECEDENT NAME]';
  const trustName = data.trust_name || '[TRUST NAME]';
  const trustDate = formatDate(data.trust_date) || '[TRUST DATE]';
  const deathDate = formatDate(data.death_date);
  const deedDate = formatDate(data.deed_date) || '[DEED DATE]';
  const instrumentNumber = data.instrument_number || '[INSTRUMENT NUMBER]';
  
  const affidavitText = [
    `${survivingTrustee.toUpperCase()}, of legal age, being first duly sworn, deposes and says:`,
    ``,
    `1. ${decedentName.toUpperCase()} is the decedent mentioned in the attached certified copy of`,
    `Certificate of Death, and is the same person named as Trustee in ${trustName},`,
    `dated ${trustDate}, executed by ${decedentName} and ${survivingTrustee} as`,
    `Trustor(s).`,
    ``,
    `2. At the time of decedent's death on ${deathDate}, decedent was the co-owner, as co-Trustee,`,
    `of certain real property, located at ${propertyAddress}, ${propertyCity}, ${propertyState} ${propertyZip},`,
    `acquired by a deed recorded on ${deedDate} as Instrument No. ${instrumentNumber},`,
    `in Official Records of ${county} County, California, describing the following real property:`,
    ``,
    `          See Exhibit "A" Legal Description`,
    ``,
    `     Commonly known as: ${propertyAddress}`,
    `                         ${propertyCity}, ${propertyState} ${propertyZip}`,
    ``,
    `3. I am the surviving Trustee of the same Trust under which said decedent held title as`,
    `Trustee pursuant to the deed described above and am designated and empowered pursuant to the`,
    `terms of said Trust to serve as Trustee thereof.`
  ];
  
  for (const line of affidavitText) {
    let font = helvetica;
    let xPos = 50;
    
    if (line.includes('See Exhibit')) {
      font = helveticaBold;
      xPos = 100;
    } else if (line.includes('Commonly known')) {
      xPos = 80;
    } else if (line.trim().startsWith(propertyCity)) {
      xPos = 80;
    }
    
    page.drawText(line, {
      x: xPos,
      y: y,
      size: 11,
      font: font
    });
    y -= 18;
    
    // Check if we need a new page
    if (y < 100) {
      const newPage = pdfDoc.addPage([612, 792]);
      y = height - 50;
    }
  }
  
  // Signature section
  y -= 30;
  page.drawText(`Dated: ${formatDate(new Date())}`, {
    x: 50,
    y: y,
    size: 11,
    font: helvetica
  });
  
  page.drawText('_______________________________________', {
    x: 300,
    y: y,
    size: 11,
    font: helvetica
  });
  y -= 15;
  
  page.drawText(`${survivingTrustee}, Trustee of ${trustName}`, {
    x: 300,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 15;
  
  page.drawText(`Dated ${trustDate}`, {
    x: 300,
    y: y,
    size: 10,
    font: helvetica
  });
  
  // Notary section
  y -= 40;
  page.drawRectangle({
    x: 50,
    y: y - 80,
    width: width - 100,
    height: 80,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1
  });
  
  page.drawText('A notary public or other officer completing this certificate verifies only the identity of the individual who signed the', {
    x: 60,
    y: y - 20,
    size: 9,
    font: helvetica
  });
  
  page.drawText('document to which this certificate is attached, and not the truthfulness, accuracy, or validity of that document.', {
    x: 60,
    y: y - 35,
    size: 9,
    font: helvetica
  });
  
  y -= 100;
  
  // Notary acknowledgment
  const notaryText = [
    `State of California                           )`,
    `County of ${county}                          ) SS.`,
    ``,
    `On _____________, ${new Date().getFullYear()}, before me, _______________________________,`,
    `Notary Public, personally appeared ${survivingTrustee},`,
    `who proved to me on the basis of satisfactory evidence to be the person whose name is`,
    `subscribed to the within instrument and acknowledged to me that he/she executed the same`,
    `in his/her authorized capacity, and that by his/her signature on the instrument the person,`,
    `or the entity upon behalf of which the person acted, executed the instrument.`,
    ``,
    `I certify under PENALTY OF PERJURY under the laws of the State of California that the`,
    `foregoing paragraph is true and correct.`,
    ``,
    `WITNESS my hand and official seal.`,
    ``,
    ``,
    `Signature_________________________________ (Seal)`
  ];
  
  for (const line of notaryText) {
    page.drawText(line, {
      x: 50,
      y: y,
      size: 10,
      font: helvetica
    });
    y -= 15;
  }
  
  // Footer
  page.drawText('ATTACH CERTIFIED COPY OF DEATH CERTIFICATE', {
    x: width / 2 - 140,
    y: 30,
    size: 10,
    font: helveticaBold
  });
  
  return await pdfDoc.save();
}

// 2. GENERATE TRUST TRANSFER DEED
async function generateTrustTransferDeed(data) {
  const pdfDoc = await PDFDocument.create();
  
  // First page - Cover sheet
  const coverPage = pdfDoc.addPage([612, 792]);
  const { width, height } = coverPage.getSize();
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let y = height - 50;
  
  // Cover sheet header
  coverPage.drawText('THIS COVER SHEET ADDED TO PROVIDE ADEQUATE SPACE FOR RECORDING INFORMATION', {
    x: width / 2 - 250,
    y: y,
    size: 10,
    font: helveticaBold
  });
  y -= 15;
  
  coverPage.drawText('($3.00 Additional Recording Fee Applies)', {
    x: width / 2 - 100,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 40;
  
  coverPage.drawText('RECORDING REQUESTED BY', {
    x: 50,
    y: y,
    size: 10,
    font: helveticaBold
  });
  y -= 15;
  
  coverPage.drawText(LAW_OFFICE.firm, {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 30;
  
  coverPage.drawText('AND WHEN RECORDED MAIL DOCUMENT TO', {
    x: 50,
    y: y,
    size: 10,
    font: helveticaBold
  });
  y -= 15;
  
  // Use actual data
  const grantorName = data.grantor_name || data.trustee_name || '[GRANTOR NAME]';
  const grantorAddress = data.grantor_address || data.trustee_address || '[GRANTOR ADDRESS]';
  const grantorCity = data.grantor_city || data.trustee_city || '';
  const grantorState = data.grantor_state || data.trustee_state || 'CA';
  const grantorZip = data.grantor_zip || data.trustee_zip || '';
  
  coverPage.drawText(grantorName.toUpperCase(), {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 15;
  
  coverPage.drawText(grantorAddress, {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 15;
  
  if (grantorCity || grantorZip) {
    coverPage.drawText(`${grantorCity}, ${grantorState} ${grantorZip}`, {
      x: 50,
      y: y,
      size: 10,
      font: helvetica
    });
    y -= 25;
  }
  
  // Space for recorder
  coverPage.drawLine({
    start: { x: 50, y: y },
    end: { x: width - 50, y: y },
    thickness: 1,
    color: rgb(0, 0, 0)
  });
  y -= 15;
  
  coverPage.drawText('SPACE ABOVE FOR RECORDER\'S USE ONLY', {
    x: width / 2 - 120,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 40;
  
  // Title
  coverPage.drawText('TRUST TRANSFER DEED', {
    x: width / 2 - 80,
    y: y,
    size: 16,
    font: helveticaBold
  });
  y -= 40;
  
  // SB2 Notice
  const sb2Text = [
    `Pursuant to Senate Bill 2 – Building Homes and Jobs Act (GC Code Section 27388.1), effective January 1, 2018, a fee of`,
    `seventy-five dollars ($75.00) shall be paid at the time of recording of every real estate instrument, paper, or notice required or`,
    `permitted by law to be recorded, except those expressly exempted from payment of recording fees, per each single`,
    `transaction per parcel of real property. The fee imposed by this section shall not exceed two hundred twenty-five dollars`,
    `($225.00).`
  ];
  
  for (const line of sb2Text) {
    coverPage.drawText(line, {
      x: 50,
      y: y,
      size: 9,
      font: helvetica
    });
    y -= 15;
  }
  
  y -= 20;
  
  // Exemption checkboxes - mark the appropriate one based on data
  const isOwnerOccupied = data.owner_occupied !== false;
  
  coverPage.drawText(`${!isOwnerOccupied ? '☒' : '☐'} Exempt from fee per GC 27388.1 (a) (2); recorded concurrently "in connection with" a transfer subject to the imposition`, {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 15;
  
  coverPage.drawText('   of documentary transfer tax (DTT).', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 20;
  
  coverPage.drawText(`${isOwnerOccupied ? '☒' : '☐'} Exempt from fee per GC 27388.1 (a) (2); recorded concurrently "in connection with" a transfer of real property that is a`, {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 15;
  
  coverPage.drawText('   residential dwelling to an owner-occupier.', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 20;
  
  coverPage.drawText('☐ Exempt from fee per GC 27388.1 (a) (1); fee cap of $225.00 reached.', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 20;
  
  coverPage.drawText('☐ Exempt from the fee per GC 27388.1 (a) (1); not related to real property.', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  
  // Second page - Actual deed
  const deedPage = pdfDoc.addPage([612, 792]);
  y = height - 50;
  
  // Header info
  if (data.apn) {
    deedPage.drawText(`APN: ${data.apn}`, {
      x: 50,
      y: y,
      size: 10,
      font: helvetica
    });
    
    if (data.escrow_number) {
      deedPage.drawText(`Escrow No. ${data.escrow_number}`, {
        x: 300,
        y: y,
        size: 10,
        font: helvetica
      });
    }
    y -= 30;
  }
  
  // Title
  deedPage.drawText('TRUST TRANSFER DEED', {
    x: width / 2 - 80,
    y: y,
    size: 14,
    font: helveticaBold
  });
  y -= 30;
  
  // Mail tax statements to
  deedPage.drawText('MAIL TAX STATEMENTS TO:', {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 15;
  
  deedPage.drawText(grantorName.toUpperCase(), {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 15;
  
  deedPage.drawText(grantorAddress, {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 15;
  
  if (grantorCity || grantorZip) {
    deedPage.drawText(`${grantorCity}, ${grantorState} ${grantorZip}`, {
      x: 50,
      y: y,
      size: 10,
      font: helvetica
    });
    y -= 25;
  }
  
  // Recording info box
  const recordingBox = {
    x: 50,
    y: y - 60,
    width: 250,
    height: 60
  };
  
  deedPage.drawRectangle({
    ...recordingBox,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1
  });
  
  deedPage.drawText('RECORDING REQUESTED BY', {
    x: recordingBox.x + 5,
    y: recordingBox.y + 45,
    size: 9,
    font: helvetica
  });
  
  deedPage.drawText(LAW_OFFICE.firm, {
    x: recordingBox.x + 5,
    y: recordingBox.y + 30,
    size: 9,
    font: helvetica
  });
  
  deedPage.drawText('WHEN RECORDED MAIL TO:', {
    x: recordingBox.x + 5,
    y: recordingBox.y + 15,
    size: 9,
    font: helvetica
  });
  
  deedPage.drawText(grantorName.toUpperCase(), {
    x: recordingBox.x + 5,
    y: recordingBox.y + 2,
    size: 8,
    font: helvetica
  });
  
  y -= 80;
  
  // Grant deed text
  deedPage.drawText('(Grant Deed (Excluded from Reappraisal Under Proposition 13, i.e., Calif. Const. Art 13A Section t, et seq:)', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 20;
  
  const transferTax = data.transfer_tax || '0';
  deedPage.drawText(`DOCUMENTARY TRANSFER TAX IS: $ ${transferTax}`, {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 20;
  
  deedPage.drawText('The undersigned Grantor(s) declare(s) under penalty of perjury that the foregoing is true and correct: THERE IS NO', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 15;
  
  deedPage.drawText('CONSIDERATION FOR THIS TRANSFER.', {
    x: 50,
    y: y,
    size: 9,
    font: helveticaBold
  });
  y -= 20;
  
  deedPage.drawText('This is a Trust Transfer under section 62 of the Revenue and Taxation Code and Grantor(s) has/have checked the', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 15;
  
  deedPage.drawText('applicable exclusions:', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 20;
  
  deedPage.drawText('☒ This conveyance transfers the Grantor\'s interest into his or her revocable trust, R&T 11930.', {
    x: 50,
    y: y,
    size: 9,
    font: helvetica
  });
  y -= 30;
  
  // Grant language with actual data
  const trustName = data.trust_name || '[TRUST NAME]';
  const trustDate = formatDate(data.trust_date) || '[TRUST DATE]';
  const propertyCity = data.property_city || '[CITY]';
  const propertyCounty = data.property_county || 'LOS ANGELES';
  const propertyAddress = data.property_address || '[PROPERTY ADDRESS]';
  const maritalStatus = data.marital_status || 'SINGLE';
  const gender = data.gender || 'PERSON';
  
  let genderText = 'PERSON';
  if (gender === 'male') genderText = 'MAN';
  else if (gender === 'female') genderText = 'WOMAN';
  
  const grantText = `Grantor(s) ${grantorName.toUpperCase()}, A ${maritalStatus.toUpperCase()} ${genderText} hereby GRANT(s) to ${grantorName.toUpperCase()},\n` +
    `TRUSTEE OF THE ${trustName.toUpperCase()}, DATED ${trustDate.toUpperCase()},\n` +
    `AND ANY AMENDMENTS THERETO the real property in the CITY OF ${propertyCity.toUpperCase()}, County of ${propertyCounty.toUpperCase()},\n` +
    `State of CA, described as:`;
  
  const grantLines = grantText.split('\n');
  for (const line of grantLines) {
    deedPage.drawText(line, {
      x: 50,
      y: y,
      size: 10,
      font: helvetica
    });
    y -= 15;
  }
  
  y -= 10;
  
  deedPage.drawText('LEGAL DESCRIPTION ATTACHED HERETO AND MADE A PART HEREOF MARKED EXHIBIT "ONE"', {
    x: 50,
    y: y,
    size: 10,
    font: helveticaBold
  });
  y -= 20;
  
  deedPage.drawText(`ALSO KNOWN AS: ${propertyAddress}`, {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  
  if (propertyCity || data.property_zip) {
    y -= 15;
    deedPage.drawText(`                ${propertyCity}, ${data.property_state || 'CA'} ${data.property_zip || ''}`, {
      x: 50,
      y: y,
      size: 10,
      font: helvetica
    });
  }
  y -= 30;
  
  deedPage.drawText(`Dated: ${formatDate(data.deed_date || new Date())}`, {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 30;
  
  deedPage.drawText('________________________', {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  y -= 15;
  
  deedPage.drawText(grantorName.toUpperCase(), {
    x: 50,
    y: y,
    size: 10,
    font: helvetica
  });
  
  return await pdfDoc.save();
}

// 3. GENERATE CERTIFICATION OF TRUST
async function generateCertificationOfTrust(data) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let y = height - 50;
  
  // Use actual trust name
  const trustName = data.trust_name || '[TRUST NAME]';
  
  // Title
  page.drawText('Certification of Trust for the', {
    x: width / 2 - 90,
    y: y,
    size: 16,
    font: helveticaBold
  });
  y -= 20;
  
  page.drawText(trustName, {
    x: width / 2 - (trustName.length * 4),
    y: y,
    size: 16,
    font: helveticaBold
  });
  y -= 40;
  
  // Introduction with actual data
  const trustDate = formatDate(data.trust_date) || '[TRUST DATE]';
  const trusteeName = data.trustee_name || data.surviving_trustee || '[TRUSTEE NAME]';
  
  const introText = `Under California Probate Code § 18100.5, this Certification of Trust is signed by all the currently\n` +
    `acting Trustee of ${trustName}, dated ${trustDate}, who declare as\n` +
    `follows:`;
  
  const introLines = introText.split('\n');
  for (const line of introLines) {
    page.drawText(line, {
      x: 50,
      y: y,
      size: 11,
      font: helvetica
    });
    y -= 18;
  }
  y -= 10;
  
  // Numbered items with actual data
  const grantorName = data.grantor_name || data.decedent_name || '[GRANTOR NAME]';
  const deathDate = formatDate(data.death_date);
  const taxId = data.trust_tax_id || '[TAX ID]';
  
  const certItems = [
    {
      number: '1.',
      text: `The Grantor of the trust is ${grantorName}.${data.death_date ? ` ${grantorName} passed away on ${deathDate}.\n` +
            `At that point the trust became irrevocable.` : ''}`
    },
    {
      number: '2.',
      text: `The current Trustee of the trust is ${trusteeName}.`
    },
    {
      number: '3.',
      text: `The tax identification number of the trust is ${taxId}.`
    },
    {
      number: '4.',
      text: `Title to assets held in the trust shall be titled as:`
    },
    {
      number: '',
      text: `${trusteeName}, Trustee of ${trustName},\n` +
            `dated ${trustDate}.`,
      indent: true
    },
    {
      number: '5.',
      text: `Any alternative description shall be effective to title assets in the name of the trust or to\n` +
            `designate the trust as a beneficiary if the description includes the name of at least one initial\n` +
            `or successor trustee, any reference indicating that property is being held in a fiduciary\n` +
            `capacity, and the date of the trust.`
    },
    {
      number: '6.',
      text: `Excerpts from the trust agreement that establish the trust, designate the Trustee and set\n` +
            `forth the powers of the Trustee will be provided upon request. The powers of the Trustee\n` +
            `include the power to acquire, sell, assign, convey, pledge, encumber, lease, borrow, manage\n` +
            `and deal with real and personal property interests.`
    },
    {
      number: '7.',
      text: `The terms of the trust provide that a third party may rely upon this Certification of Trust as\n` +
            `evidence of the existence of the trust and is specifically relieved of any obligation to\n` +
            `inquire into the terms of this trust or the authority of my Trustee, or to see to the application\n` +
            `that my Trustee makes of funds or other property received by my Trustee.`
    },
    {
      number: '8.',
      text: `The trust has not been amended or judicially reformed in any way that would cause the\n` +
            `representations in this Certification of Trust to be incorrect.`
    }
  ];
  
  for (const item of certItems) {
    if (item.number) {
      page.drawText(item.number, {
        x: 50,
        y: y,
        size: 11,
        font: helvetica
      });
    }
    
    const lines = item.text.split('\n');
    let lineX = item.indent ? 100 : (item.number ? 70 : 50);
    
    for (let i = 0; i < lines.length; i++) {
      page.drawText(lines[i], {
        x: i === 0 && item.number ? 70 : lineX,
        y: y,
        size: 11,
        font: item.indent ? helveticaBold : helvetica
      });
      y -= 18;
    }
    y -= 8;
    
    if (y < 150) {
      // Add new page if needed
      const newPage = pdfDoc.addPage([612, 792]);
      y = height - 50;
    }
  }
  
  // Signature
  y -= 20;
  page.drawText(`Date: ${formatDate(new Date())}`, {
    x: 50,
    y: y,
    size: 11,
    font: helvetica
  });
  y -= 40;
  
  page.drawText('_______________________________________', {
    x: 350,
    y: y,
    size: 11,
    font: helvetica
  });
  y -= 15;
  
  page.drawText(`${trusteeName}, Trustee`, {
    x: 350,
    y: y,
    size: 11,
    font: helvetica
  });
  
  // Footer
  y = 50;
  page.drawText(`Certificate of Trust for the ${trustName}`, {
    x: width / 2 - 120,
    y: y,
    size: 10,
    font: helvetica
  });
  
  page.drawText('Page 1', {
    x: width / 2 - 20,
    y: 30,
    size: 10,
    font: helvetica
  });
  
  // Add notary page
  const notaryPage = pdfDoc.addPage([612, 792]);
  y = height - 50;
  
  // Notary acknowledgment box
  notaryPage.drawRectangle({
    x: 50,
    y: y - 60,
    width: width - 100,
    height: 60,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1
  });
  
  notaryPage.drawText('A notary public or other officer completing this certificate verifies only the identity of the individual who signed', {
    x: 60,
    y: y - 20,
    size: 9,
    font: helvetica
  });
  
  notaryPage.drawText('the document to which this certificate is attached, and not the truthfulness, accuracy, or validity of that', {
    x: 60,
    y: y - 35,
    size: 9,
    font: helvetica
  });
  
  notaryPage.drawText('document.', {
    x: 60,
    y: y - 50,
    size: 9,
    font: helvetica
  });
  
  y -= 80;
  
  // State and County
  const county = data.property_county || 'Los Angeles';
  
  notaryPage.drawText('State of California', {
    x: 50,
    y: y,
    size: 11,
    font: helvetica
  });
  notaryPage.drawText(')', {
    x: 200,
    y: y,
    size: 11,
    font: helvetica
  });
  y -= 15;
  
  notaryPage.drawText(`County of ${county}`, {
    x: 50,
    y: y,
    size: 11,
    font: helvetica
  });
  notaryPage.drawText(')', {
    x: 200,
    y: y,
    size: 11,
    font: helvetica
  });
  y -= 30;
  
  const notaryText = [
    `On________________, ${new Date().getFullYear()} before me, ______________________________ (here insert name`,
    `and title of the officer), personally appeared ${trusteeName}, who proved to me on the basis of`,
    `satisfactory evidence to be the person(s) whose name(s) is/are subscribed to the within`,
    `instrument and acknowledged to me that he/she/they executed the same in his/her/their`,
    `authorized capacity(ies), and that by his/her/their signature(s) on the instrument the person(s), or`,
    `the entity upon behalf of which the person(s) acted, executed the instrument.`,
    ``,
    `I certify under PENALTY of PERJURY under the laws of the State of California that the`,
    `foregoing paragraph is true and correct.`,
    ``,
    `WITNESS my hand and official seal.`,
    ``,
    ``,
    `Signature ___________________________________________ (Seal)`
  ];
  
  for (const line of notaryText) {
    notaryPage.drawText(line, {
      x: 50,
      y: y,
      size: 11,
      font: helvetica
    });
    y -= 18;
  }
  
  // Footer
  notaryPage.drawText(`Certificate of Trust for the ${trustName}`, {
    x: width / 2 - 120,
    y: 50,
    size: 10,
    font: helvetica
  });
  
  notaryPage.drawText('Page 2', {
    x: width / 2 - 20,
    y: 30,
    size: 10,
    font: helvetica
  });
  
  return await pdfDoc.save();
}

// Main handler
exports.handler = async (event, context) => {
  console.log('Generate Property Documents handler called');
  
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
    if (data.generate_affidavit) {
      try {
        console.log('Generating Affidavit - Death of Trustee...');
        const affidavitPdf = await generateAffidavitDeathOfTrustee(data);
        documents.affidavit_death_of_trustee = Buffer.from(affidavitPdf).toString('base64');
        console.log('Affidavit generated successfully');
      } catch (error) {
        console.error('Error generating affidavit:', error);
        errors.push(`Affidavit: ${error.message}`);
      }
    }
    
    if (data.generate_trust_deed) {
      try {
        console.log('Generating Trust Transfer Deed...');
        const deedPdf = await generateTrustTransferDeed(data);
        documents.trust_transfer_deed = Buffer.from(deedPdf).toString('base64');
        console.log('Trust Transfer Deed generated successfully');
      } catch (error) {
        console.error('Error generating trust deed:', error);
        errors.push(`Trust Deed: ${error.message}`);
      }
    }
    
    if (data.generate_certification) {
      try {
        console.log('Generating Certification of Trust...');
        const certPdf = await generateCertificationOfTrust(data);
        documents.certification_of_trust = Buffer.from(certPdf).toString('base64');
        console.log('Certification of Trust generated successfully');
      } catch (error) {
        console.error('Error generating certification:', error);
        errors.push(`Certification: ${error.message}`);
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
      message: `Generated ${Object.keys(documents).length} property documents`,
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
    console.error('Error generating property documents:', error);
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
