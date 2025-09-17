// extract-boe-fields.js
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function extractFields() {
  const forms = [
    { name: 'BOE-502-A', file: 'public/templates/BOE-502-A.pdf' },
    { name: 'BOE-502-D', file: 'public/templates/BOE-502-D.pdf' },
    { name: 'BOE-19-P', file: 'public/templates/BOE-19-P.pdf' }
  ];

  for (const form of forms) {
    console.log(`\n========== ${form.name} ==========\n`);
    
    try {
      const pdfBytes = fs.readFileSync(form.file);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pdfForm = pdfDoc.getForm();
      const fields = pdfForm.getFields();
      
      console.log(`Total fields: ${fields.length}\n`);
      
      fields.forEach(field => {
        console.log(`Field: ${field.getName()}`);
        console.log(`Type: ${field.constructor.name}\n`);
      });
      
    } catch (error) {
      console.error(`Error reading ${form.name}:`, error.message);
    }
  }
}

extractFields();