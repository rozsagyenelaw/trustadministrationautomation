// netlify/functions/get-boe-field-names.js
// This function reads the official BOE PDFs and returns all actual field names

const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

async function getFieldNames(formType) {
  try {
    let templatePath;
    
    switch(formType) {
      case 'PCOR':
        templatePath = path.join(__dirname, '../../public/templates/BOE-502-A.pdf');
        break;
      case '502D':
        templatePath = path.join(__dirname, '../../public/templates/BOE-502-D.pdf');
        break;
      case '19P':
        templatePath = path.join(__dirname, '../../public/templates/BOE-19-P.pdf');
        break;
      default:
        throw new Error('Invalid form type');
    }
    
    const existingPdfBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
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
        fieldDetails.maxLength = field.getMaxLength();
        fieldDetails.isMultiline = field.isMultiline();
      } else if (fieldType === 'PDFCheckBox') {
        fieldDetails.isChecked = field.isChecked();
      } else if (fieldType === 'PDFRadioGroup') {
        fieldDetails.options = field.getOptions();
        fieldDetails.selected = field.getSelected();
      } else if (fieldType === 'PDFDropdown') {
        fieldDetails.options = field.getOptions();
        fieldDetails.selected = field.getSelected();
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
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    const { form_type } = JSON.parse(event.body);
    
    if (form_type === 'ALL') {
      // Get field names for all three forms
      const pcorFields = await getFieldNames('PCOR');
      const boe502dFields = await getFieldNames('502D');
      const boe19pFields = await getFieldNames('19P');
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          'BOE-502-A (PCOR)': pcorFields,
          'BOE-502-D (Death)': boe502dFields,
          'BOE-19-P (Parent-Child)': boe19pFields
        }, null, 2)
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
      body: JSON.stringify({ 
        error: error.message,
        note: 'Make sure the official PDFs are in public/templates folder'
      })
    };
  }
};
