// netlify/functions/get-boe-field-names-fixed.js
// Fixed version that works in Netlify's serverless environment

const { PDFDocument } = require('pdf-lib');
const fetch = require('node-fetch');

async function getFieldNames(formType) {
  try {
    let pdfUrl;
    
    // Construct the full URL to the PDF based on the site URL
    const siteUrl = process.env.URL || 'https://jeffbrandingtrusadmin.netlify.app';
    
    switch(formType) {
      case 'PCOR':
        pdfUrl = `${siteUrl}/templates/BOE-502-A.pdf`;
        break;
      case '502D':
        pdfUrl = `${siteUrl}/templates/BOE-502-D.pdf`;
        break;
      case '19P':
        pdfUrl = `${siteUrl}/templates/BOE-19-P.pdf`;
        break;
      default:
        throw new Error('Invalid form type');
    }
    
    // Fetch the PDF from the URL
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    
    const pdfBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    const fieldInfo = fields.map(field => {
      const fieldType = field.constructor.name;
      let fieldDetails = {
        name: field.getName(),
        type: fieldType
      };
      
      // Add additional info based on field type
      if (fieldType === 'PDFTextField') {
        try {
          fieldDetails.maxLength = field.getMaxLength();
          fieldDetails.isMultiline = field.isMultiline();
        } catch(e) {
          // Some fields might not have these properties
        }
      } else if (fieldType === 'PDFCheckBox') {
        try {
          fieldDetails.isChecked = field.isChecked();
        } catch(e) {}
      } else if (fieldType === 'PDFRadioGroup') {
        try {
          fieldDetails.options = field.getOptions();
          fieldDetails.selected = field.getSelected();
        } catch(e) {}
      } else if (fieldType === 'PDFDropdown') {
        try {
          fieldDetails.options = field.getOptions();
          fieldDetails.selected = field.getSelected();
        } catch(e) {}
      }
      
      return fieldDetails;
    });
    
    // Group fields by type for easier reading
    const groupedFields = {
      textFields: fieldInfo.filter(f => f.type === 'PDFTextField'),
      checkBoxes: fieldInfo.filter(f => f.type === 'PDFCheckBox'),
      radioGroups: fieldInfo.filter(f => f.type === 'PDFRadioGroup'),
      dropdowns: fieldInfo.filter(f => f.type === 'PDFDropdown'),
      otherFields: fieldInfo.filter(f => !['PDFTextField', 'PDFCheckBox', 'PDFRadioGroup', 'PDFDropdown'].includes(f.type))
    };
    
    return {
      formType: formType,
      totalFields: fieldInfo.length,
      fieldsByType: groupedFields,
      allFields: fieldInfo
    };
    
  } catch (error) {
    console.error(`Error reading ${formType}:`, error);
    throw error;
  }
}

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
    const { form_type } = JSON.parse(event.body || '{}');
    
    if (form_type === 'ALL') {
      // Get field names for all three forms
      const results = {};
      
      try {
        results['BOE-502-A (PCOR)'] = await getFieldNames('PCOR');
      } catch (e) {
        results['BOE-502-A (PCOR)'] = { error: e.message };
      }
      
      try {
        results['BOE-502-D (Death)'] = await getFieldNames('502D');
      } catch (e) {
        results['BOE-502-D (Death)'] = { error: e.message };
      }
      
      try {
        results['BOE-19-P (Parent-Child)'] = await getFieldNames('19P');
      } catch (e) {
        results['BOE-19-P (Parent-Child)'] = { error: e.message };
      }
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(results, null, 2)
      };
    } else {
      const fields = await getFieldNames(form_type);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(fields, null, 2)
      };
    }
    
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        note: 'Make sure the PDFs are accessible at public/templates/'
      })
    };
  }
};
