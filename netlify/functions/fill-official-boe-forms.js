/ netlify/functions/fill-official-boe-forms.js
// Fills official fillable BOE forms with actual field names

const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

// Fill BOE-502-A (PCOR) - Official Fillable Form
async function fillPCOR(data) {
  try {
    // Load the official fillable BOE-502-A PDF
    const templatePath = path.join(__dirname, '../../public/templates/BOE-502-A.pdf');
    const existingPdfBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // Get the form from the PDF
    const form = pdfDoc.getForm();
    
    // Get all field names (for debugging/mapping)
    const fields = form.getFields();
    console.log('Available fields in PCOR:', fields.map(f => f.getName()));
    
    // Fill text fields - these are the actual field names in BOE-502-A
    try {
      // Buyer/Transferee Information
      if (form.getTextField('topmostSubform[0].Page1[0].NAME_MAILING_ADDRESS_BUYER[0]')) {
        form.getTextField('topmostSubform[0].Page1[0].NAME_MAILING_ADDRESS_BUYER[0]').setText(data.buyer_name || '');
      }
      if (form.getTextField('topmostSubform[0].Page1[0].BUYER_ADDRESS[0]')) {
        form.getTextField('topmostSubform[0].Page1[0].BUYER_ADDRESS[0]').setText(data.buyer_address || '');
      }
      if (form.getTextField('topmostSubform[0].Page1[0].APN[0]')) {
        form.getTextField('topmostSubform[0].Page1[0].APN[0]').setText(data.apn || '');
      }
      if (form.getTextField('topmostSubform[0].Page1[0].EMAIL[0]')) {
        form.getTextField('topmostSubform[0].Page1[0].EMAIL[0]').setText(data.buyer_email || '');
      }
      if (form.getTextField('topmostSubform[0].Page1[0].PHONE[0]')) {
        form.getTextField('topmostSubform[0].Page1[0].PHONE[0]').setText(data.buyer_phone || '');
      }
      
      // Seller/Transferor
      if (form.getTextField('topmostSubform[0].Page1[0].SELLER[0]')) {
        form.getTextField('topmostSubform[0].Page1[0].SELLER[0]').setText(data.seller_name || '');
      }
      
      // Property Address
      if (form.getTextField('topmostSubform[0].Page1[0].PROPERTY_ADDRESS[0]')) {
        form.getTextField('topmostSubform[0].Page1[0].PROPERTY_ADDRESS[0]').setText(data.property_address || '');
      }
      
      // Principal Residence Checkbox
      if (data.principal_residence === true) {
        const yesBox = form.getCheckBox('topmostSubform[0].Page1[0].PRINCIPAL_RES_YES[0]');
        if (yesBox) yesBox.check();
      } else if (data.principal_residence === false) {
        const noBox = form.getCheckBox('topmostSubform[0].Page1[0].PRINCIPAL_RES_NO[0]');
        if (noBox) noBox.check();
      }
      
      // Part 1 - Transfer Information
      if (data.transfer_type === 'spouse') {
        const spouseBox = form.getCheckBox('topmostSubform[0].Page1[0].PART1_A_YES[0]');
        if (spouseBox) spouseBox.check();
      } else if (data.transfer_type === 'parent_child') {
        const parentChildBox = form.getCheckBox('topmostSubform[0].Page1[0].PART1_C_PARENT[0]');
        if (parentChildBox) parentChildBox.check();
      } else if (data.transfer_type === 'trust') {
        const trustBox = form.getCheckBox('topmostSubform[0].Page1[0].PART1_L_YES[0]');
        if (trustBox) trustBox.check();
      }
      
    } catch (fieldError) {
      console.error('Error filling field:', fieldError);
    }
    
    // Part 2 (Page 2) - Other Transfer Information
    if (data.transfer_date) {
      const dateField = form.getTextField('topmostSubform[0].Page2[0].TRANSFER_DATE[0]');
      if (dateField) dateField.setText(data.transfer_date);
    }
    
    // Part 3 - Purchase Price
    if (data.purchase_price) {
      const priceField = form.getTextField('topmostSubform[0].Page2[0].PURCHASE_PRICE[0]');
      if (priceField) priceField.setText(data.purchase_price.toString());
    }
    
    // Save the filled form
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
    
  } catch (error) {
    console.error('Error filling PCOR:', error);
    throw error;
  }
}

// Fill BOE-502-D (Death of Real Property Owner) - Official Fillable Form
async function fillBOE502D(data) {
  try {
    const templatePath = path.join(__dirname, '../../public/templates/BOE-502-D.pdf');
    const existingPdfBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    const form = pdfDoc.getForm();
    
    // Get all field names for debugging
    const fields = form.getFields();
    console.log('Available fields in 502-D:', fields.map(f => f.getName()));
    
    // Fill the actual fields
    try {
      // Decedent Information
      if (form.getTextField('form1[0].#subform[0].DECEDENT_NAME[0]')) {
        form.getTextField('form1[0].#subform[0].DECEDENT_NAME[0]').setText(data.decedent_name || '');
      }
      if (form.getTextField('form1[0].#subform[0].DATE_DEATH[0]')) {
        form.getTextField('form1[0].#subform[0].DATE_DEATH[0]').setText(data.death_date || '');
      }
      
      // Property Information
      if (form.getTextField('form1[0].#subform[0].STREET_ADDRESS[0]')) {
        form.getTextField('form1[0].#subform[0].STREET_ADDRESS[0]').setText(data.property_address || '');
      }
      if (form.getTextField('form1[0].#subform[0].CITY[0]')) {
        form.getTextField('form1[0].#subform[0].CITY[0]').setText(data.property_city || '');
      }
      if (form.getTextField('form1[0].#subform[0].ZIP[0]')) {
        form.getTextField('form1[0].#subform[0].ZIP[0]').setText(data.property_zip || '');
      }
      if (form.getTextField('form1[0].#subform[0].APN[0]')) {
        form.getTextField('form1[0].#subform[0].APN[0]').setText(data.apn || '');
      }
      
      // Transfer checkboxes
      if (data.transfer_to === 'spouse') {
        const spouseBox = form.getCheckBox('form1[0].#subform[0].SPOUSE[0]');
        if (spouseBox) spouseBox.check();
      } else if (data.transfer_to === 'child') {
        const childBox = form.getCheckBox('form1[0].#subform[0].CHILD[0]');
        if (childBox) childBox.check();
      } else if (data.transfer_to === 'trust') {
        const trustBox = form.getCheckBox('form1[0].#subform[0].TRUST[0]');
        if (trustBox) trustBox.check();
      }
      
    } catch (fieldError) {
      console.error('Error filling field:', fieldError);
    }
    
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
    
  } catch (error) {
    console.error('Error filling BOE-502-D:', error);
    throw error;
  }
}

// Fill BOE-19-P (Parent-Child Exclusion) - Official Fillable Form  
async function fillBOE19P(data) {
  try {
    const templatePath = path.join(__dirname, '../../public/templates/BOE-19-P.pdf');
    const existingPdfBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    const form = pdfDoc.getForm();
    
    // Get all field names for debugging
    const fields = form.getFields();
    console.log('Available fields in BOE-19-P:', fields.map(f => f.getName()));
    
    // Fill Section A - Property
    try {
      if (form.getTextField('form1[0].#subform[0].APN[0]')) {
        form.getTextField('form1[0].#subform[0].APN[0]').setText(data.apn || '');
      }
      if (form.getTextField('form1[0].#subform[0].TRANSFER_DATE[0]')) {
        form.getTextField('form1[0].#subform[0].TRANSFER_DATE[0]').setText(data.transfer_date || '');
      }
      if (form.getTextField('form1[0].#subform[0].DOCUMENT_NUMBER[0]')) {
        form.getTextField('form1[0].#subform[0].DOCUMENT_NUMBER[0]').setText(data.document_number || '');
      }
      if (form.getTextField('form1[0].#subform[0].PROPERTY_ADDRESS[0]')) {
        form.getTextField('form1[0].#subform[0].PROPERTY_ADDRESS[0]').setText(data.property_address || '');
      }
      if (form.getTextField('form1[0].#subform[0].CITY[0]')) {
        form.getTextField('form1[0].#subform[0].CITY[0]').setText(data.property_city || '');
      }
      
      // Section B - Transferor(s)
      if (form.getTextField('form1[0].#subform[0].TRANSFEROR1[0]')) {
        form.getTextField('form1[0].#subform[0].TRANSFEROR1[0]').setText(data.transferor_name1 || '');
      }
      if (form.getTextField('form1[0].#subform[0].TRANSFEROR2[0]')) {
        form.getTextField('form1[0].#subform[0].TRANSFEROR2[0]').setText(data.transferor_name2 || '');
      }
      
      // Section C - Transferee(s)
      if (form.getTextField('form1[0].#subform[0].TRANSFEREE1[0]')) {
        form.getTextField('form1[0].#subform[0].TRANSFEREE1[0]').setText(data.transferee_name1 || '');
      }
      if (form.getTextField('form1[0].#subform[0].TRANSFEREE2[0]')) {
        form.getTextField('form1[0].#subform[0].TRANSFEREE2[0]').setText(data.transferee_name2 || '');
      }
      
      // Principal Residence checkbox
      if (data.principal_residence === true) {
        const prBox = form.getCheckBox('form1[0].#subform[0].PRINCIPAL_RES_YES[0]');
        if (prBox) prBox.check();
        
        // Exemptions
        if (data.homeowners_exemption) {
          const heBox = form.getCheckBox('form1[0].#subform[0].HOMEOWNERS[0]');
          if (heBox) heBox.check();
        }
      }
      
    } catch (fieldError) {
      console.error('Error filling field:', fieldError);
    }
    
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
    
  } catch (error) {
    console.error('Error filling BOE-19-P:', error);
    throw error;
  }
}

// Helper function to list all form fields (for debugging)
async function listFormFields(pdfPath) {
  const existingPdfBytes = await fs.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  
  const fieldInfo = fields.map(field => ({
    name: field.getName(),
    type: field.constructor.name,
    // Additional info if needed
  }));
  
  return fieldInfo;
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
  
  try {
    const data = JSON.parse(event.body);
    
    // Special debug mode to list fields
    if (data.debug_list_fields) {
      const pcorFields = await listFormFields(path.join(__dirname, '../../public/templates/BOE-502-A.pdf'));
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          pcor_fields: pcorFields
        })
      };
    }
    
    const documents = {};
    
    // Fill requested forms
    if (data.generate_pcor) {
      const pcorPdf = await fillPCOR(data);
      documents.pcor_filled = Buffer.from(pcorPdf).toString('base64');
    }
    
    if (data.generate_502d) {
      const deathPdf = await fillBOE502D(data);
      documents.boe_502d_filled = Buffer.from(deathPdf).toString('base64');
    }
    
    if (data.generate_19p) {
      const parentChildPdf = await fillBOE19P(data);
      documents.boe_19p_filled = Buffer.from(parentChildPdf).toString('base64');
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: `Filled ${Object.keys(documents).length} official BOE forms`,
        documents: documents
      })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};
