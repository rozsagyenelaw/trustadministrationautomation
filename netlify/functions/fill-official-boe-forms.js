// netlify/functions/fill-official-boe-forms-complete.js
// Complete BOE form filler with actual field names extracted from the PDFs

const { PDFDocument } = require('pdf-lib');
const fetch = require('node-fetch');

// Fill BOE-502-A (PCOR) with actual field names
async function fillPCOR(data) {
  try {
    const siteUrl = process.env.URL || 'https://jeffbrandingtrusadmin.netlify.app';
    const pdfUrl = `${siteUrl}/templates/BOE-502-A.pdf`;
    
    const response = await fetch(pdfUrl);
    if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    
    const pdfBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    
    // Fill text fields with actual field names
    try {
      // Buyer Information
      if (data.buyer_name) {
        form.getTextField('Name and mailing address of buyer/transferee').setText(data.buyer_name + '\n' + (data.buyer_address || ''));
      }
      if (data.buyer_zip) {
        form.getTextField('ZIP code').setText(data.buyer_zip);
      }
      if (data.apn) {
        form.getTextField('Assessors parcel number').setText(data.apn);
      }
      if (data.buyer_email) {
        form.getTextField("Buyer's email address").setText(data.buyer_email);
      }
      if (data.buyer_phone) {
        form.getTextField("buyer's daytime telephone number1").setText(data.buyer_phone);
        form.getTextField('area code').setText(data.buyer_area_code || '');
      }
      
      // Seller Information
      if (data.seller_name) {
        form.getTextField('seller transferor').setText(data.seller_name);
      }
      
      // Property Information
      if (data.property_address) {
        form.getTextField('street address or physical location of real property').setText(data.property_address);
      }
      if (data.property_city) {
        form.getTextField('city').setText(data.property_city);
      }
      if (data.property_state) {
        form.getTextField('state').setText(data.property_state || 'CA');
      }
      
      // Principal Residence Question
      if (data.principal_residence === true) {
        form.getCheckBox('This property is intended as my principal residence. If YES, please indicate the date of occupancy or intended occupancy Yes').check();
        if (data.occupancy_date) {
          const date = new Date(data.occupancy_date);
          form.getTextField('Month').setText((date.getMonth() + 1).toString());
          form.getTextField('day').setText(date.getDate().toString());
          form.getTextField('year').setText(date.getFullYear().toString());
        }
      } else if (data.principal_residence === false) {
        form.getCheckBox('This property is intended as my principal residence. If YES, please indicate the date of occupancy or intended occupancy_no').check();
      }
      
      // Disabled Veteran Question  
      if (data.disabled_veteran === true) {
        form.getCheckBox('Are you a disabled veteran or an unmarried surviving spouse of a disabled veteran who was compensated at 100% by the Department of Veterans Affairs or an unmarried surviving spouse of a 100% rated disabled veteran? Yes').check();
      } else if (data.disabled_veteran === false) {
        form.getCheckBox('Are you a disabled veteran or an unmarried surviving spouse of a disabled veteran who was compensated at 100% by the Department of Veterans Affairs or an unmarried surviving spouse of a 100% rated disabled veteran? No').check();
      }
      
      // Tax Mailing Information
      if (data.tax_mail_name) {
        form.getTextField('mail property tax information to (name)').setText(data.tax_mail_name);
      }
      if (data.tax_mail_address) {
        form.getTextField('Mail property tax informatino to address').setText(data.tax_mail_address);
      }
      
      // Part 1 - Transfer Type
      if (data.transfer_type === 'spouse') {
        form.getCheckBox('A. This transfer is solely between spouses (addition or removal of a spouse, death of a spouse, divorce settlement, etc.)­yes').check();
      } else if (data.transfer_type === 'parent_child') {
        form.getCheckBox('C. This is a transfer between: parents and children or grandparents and grandchildren_yes').check();
        form.getCheckBox('C. This is a transfer between parent(s) and child(ren)').check();
        
        // Principal Residence Transfer for Parent-Child
        if (data.was_principal_residence === true) {
          form.getCheckBox("Was this the transferor/grantor's principal residence? Yes").check();
        } else if (data.was_principal_residence === false) {
          form.getCheckBox("Was this the transferor/grantor's principal residence? No").check();
        }
        
        // Family Farm Question
        if (data.family_farm === true) {
          form.getCheckBox('Is this a family farm? Yes').check();
        } else if (data.family_farm === false) {
          form.getCheckBox('Is this a family farm? No').check();
        }
      } else if (data.transfer_type === 'trust') {
        if (data.trust_type === 'revocable') {
          form.getCheckBox('L1. This is a transfer of property to/from a revocable trust that may be revoked by the transferor and is for the benefit of the transferor and/or the transferor\'s spouse and/or registered domestic partner Yes').check();
        } else if (data.trust_type === 'irrevocable') {
          form.getCheckBox('L2. This is a transfer of property to/from an irrevocable trust for the benefit of the creator/grantor/trustor and/or grantor\'s trustor\'s spouse grantor\'s/trustor\'s registered domestic partner Yes').check();
        }
      } else if (data.transfer_type === 'cotenant_death') {
        form.getCheckBox('D.This transfer is the result of a cotenant\'s death_yes').check();
        if (data.death_date) {
          form.getTextField('DATE OF DEATH').setText(data.death_date);
        }
      }
      
      // Purchase Information
      if (data.purchase_price) {
        form.getTextField('Total purchase price').setText(data.purchase_price.toString());
      }
      if (data.down_payment) {
        form.getTextField('Cash down payment or value of trade or exchange excluding closing costs amount $').setText(data.down_payment.toString());
      }
      
      // Signature Information
      if (data.signer_name) {
        form.getTextField('Name of buyer/transferee/personal representative/corporate officer (please print)').setText(data.signer_name);
      }
      if (data.signer_title) {
        form.getTextField('title').setText(data.signer_title);
      }
      if (data.signer_email) {
        form.getTextField('email address').setText(data.signer_email);
      }
      if (data.sign_date) {
        form.getTextField('Date signed by buyer/transferee or corporate officer').setText(data.sign_date);
      }
      
    } catch (fieldError) {
      console.error('Error filling PCOR field:', fieldError);
    }
    
    return await pdfDoc.save();
    
  } catch (error) {
    console.error('Error filling PCOR:', error);
    throw error;
  }
}

// Fill BOE-502-D (Death of Real Property Owner) with actual field names
async function fillBOE502D(data) {
  try {
    const siteUrl = process.env.URL || 'https://jeffbrandingtrusadmin.netlify.app';
    const pdfUrl = `${siteUrl}/templates/BOE-502-D.pdf`;
    
    const response = await fetch(pdfUrl);
    if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    
    const pdfBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    
    try {
      // Basic Information
      if (data.name_address) {
        form.getTextField('name and mailing address').setText(data.name_address);
      }
      if (data.apn) {
        form.getTextField('APN of real property').setText(data.apn);
      }
      
      // Decedent Information
      if (data.decedent_name) {
        form.getTextField('name of decedent').setText(data.decedent_name);
      }
      if (data.death_date) {
        form.getTextField('date of death').setText(data.death_date);
      }
      
      // Property Information
      if (data.property_address) {
        form.getTextField('street address of real property').setText(data.property_address);
      }
      if (data.property_city) {
        form.getTextField('city of real property').setText(data.property_city);
      }
      if (data.property_zip) {
        form.getTextField('zip of real property').setText(data.property_zip);
      }
      
      // Transfer Type
      if (data.transfer_to === 'spouse') {
        form.getCheckBox('decedents spouse').check();
      } else if (data.transfer_to === 'domestic_partner') {
        form.getCheckBox('decedents registered domestic partner').check();
      } else if (data.transfer_to === 'child') {
        form.getCheckBox('decedents child or parent').check();
      } else if (data.transfer_to === 'grandchild') {
        form.getCheckBox('decedents grandchild').check();
      } else if (data.transfer_to === 'trust') {
        form.getCheckBox('A trust').check();
        if (data.trustee_name) {
          form.getTextField('name of trustee').setText(data.trustee_name);
        }
        if (data.trustee_address) {
          form.getTextField('address of trustee').setText(data.trustee_address);
        }
      } else if (data.transfer_to === 'cotenant') {
        form.getCheckBox('Contenant to contenant').check();
      }
      
      // Beneficiaries (up to 7)
      if (data.beneficiaries && Array.isArray(data.beneficiaries)) {
        data.beneficiaries.forEach((beneficiary, index) => {
          if (index < 7) {
            const num = index + 1;
            if (beneficiary.name) {
              form.getTextField(`beneficiary name ${num}`).setText(beneficiary.name);
            }
            if (beneficiary.relationship) {
              form.getTextField(`relationship ${num}`).setText(beneficiary.relationship);
            }
            if (beneficiary.percent) {
              form.getTextField(`percent received ${num}`).setText(beneficiary.percent.toString());
            }
          }
        });
      }
      
      // Principal Residence Question
      if (data.was_principal_residence === true) {
        form.getCheckBox("Was this the decendent's principal residence? Yes 1").check();
      } else if (data.was_principal_residence === false) {
        form.getCheckBox("Was this the decendent's principal residence? No 1").check();
      }
      
      // Family Farm Question
      if (data.family_farm === true) {
        form.getCheckBox('Is this property a family farm? yes 1').check();
      } else if (data.family_farm === false) {
        form.getCheckBox('Is this property a family farm? no 1').check();
      }
      
      // Contact Information
      if (data.contact_name) {
        form.getTextField('Name').setText(data.contact_name);
        form.getTextField('printed name').setText(data.contact_name);
      }
      if (data.contact_phone) {
        form.getTextField('telephone').setText(data.contact_phone);
        form.getTextField('area code').setText(data.area_code || '');
      }
      if (data.contact_email) {
        form.getTextField('email').setText(data.contact_email);
      }
      if (data.sign_date) {
        form.getTextField('date').setText(data.sign_date);
      }
      
    } catch (fieldError) {
      console.error('Error filling BOE-502-D field:', fieldError);
    }
    
    return await pdfDoc.save();
    
  } catch (error) {
    console.error('Error filling BOE-502-D:', error);
    throw error;
  }
}

// Fill BOE-19-P (Parent-Child Exclusion) with actual field names
async function fillBOE19P(data) {
  try {
    const siteUrl = process.env.URL || 'https://jeffbrandingtrusadmin.netlify.app';
    const pdfUrl = `${siteUrl}/templates/BOE-19-P.pdf`;
    
    const response = await fetch(pdfUrl);
    if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    
    const pdfBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    
    try {
      // Property Information
      if (data.apn) {
        form.getTextField("Assessor's Parcel/ID Number").setText(data.apn);
      }
      if (data.property_address) {
        form.getTextField('PROPERTY ADDRESS').setText(data.property_address);
      }
      if (data.property_city) {
        form.getTextField('CITY').setText(data.property_city);
      }
      if (data.county) {
        form.getTextField('COUNTY').setText(data.county || 'LOS ANGELES');
      }
      
      // Transfer Information
      if (data.transfer_date) {
        form.getTextField('DATE OF PURCHASE OR TRANSFER').setText(data.transfer_date);
      }
      if (data.document_number) {
        form.getTextField('RECORDERS DOCUMENT NUMBER').setText(data.document_number);
      }
      if (data.death_date) {
        form.getTextField('DATE OF DEATH if applicable').setText(data.death_date);
      }
      
      // Transferor Information
      if (data.transferor1_name) {
        form.getTextField('Name').setText(data.transferor1_name);
      }
      if (data.transferor2_name) {
        form.getTextField('Name_2').setText(data.transferor2_name);
      }
      if (data.transferor1_relationship) {
        form.getTextField('Relationship').setText(data.transferor1_relationship);
      }
      if (data.transferor2_relationship) {
        form.getTextField('Relationship_2').setText(data.transferor2_relationship);
      }
      
      // Transferee Information  
      if (data.transferee1_name) {
        form.getTextField('Name_3').setText(data.transferee1_name);
      }
      if (data.transferee2_name) {
        form.getTextField('Name_4').setText(data.transferee2_name);
      }
      if (data.transferee1_relationship) {
        form.getTextField('Relationship_3').setText(data.transferee1_relationship);
      }
      if (data.transferee2_relationship) {
        form.getTextField('Relationship_4').setText(data.transferee2_relationship);
      }
      
      // Principal Residence Questions
      if (data.was_transferor_principal_residence === true) {
        form.getCheckBox('Was this property the transferor\'s principal residence Yes').check();
      } else if (data.was_transferor_principal_residence === false) {
        form.getCheckBox('Was this property the transferor\'s principal residence? No').check();
      }
      
      if (data.is_transferee_principal_residence === true) {
        form.getCheckBox('Is this property currently the transferee\'s principal residence? Yes').check();
        
        // Exemptions
        if (data.homeowners_exemption) {
          form.getCheckBox('Homeowners Exemption').check();
        }
        if (data.disabled_veterans_exemption) {
          form.getCheckBox('Disabled Veterans Exemption').check();
        }
      } else if (data.is_transferee_principal_residence === false) {
        form.getCheckBox('Is this property currently the transferee\'s principal residence? No').check();
      }
      
      // Family Farm Questions
      if (data.was_family_farm === true) {
        form.getCheckBox('Was this property the transferor\'s family farm? Yes').check();
      } else if (data.was_family_farm === false) {
        form.getCheckBox('Was this property the transferor\'s family farm? No').check();
      }
      
      if (data.is_family_farm === true) {
        form.getCheckBox('Is this property the transferee\'s family farm? Yes').check();
      } else if (data.is_family_farm === false) {
        form.getCheckBox('Is this property the transferee\'s family farm? No').check();
      }
      
      // Joint Tenancy
      if (data.joint_tenancy === true) {
        form.getCheckBox('Was this property owned in joint tenancy? Yes').check();
      } else if (data.joint_tenancy === false) {
        form.getCheckBox('Was this property owned in joint tenancy? No').check();
      }
      
      // Partial Interest
      if (data.partial_interest === true) {
        form.getCheckBox('Was only a partial interest in the property transferred? Yes').check();
        if (data.percentage_transferred) {
          form.getTextField('If yes, percentage transferrred').setText(data.percentage_transferred.toString());
        }
      } else if (data.partial_interest === false) {
        form.getCheckBox('Was only a partial interest in the property transferred? No').check();
      }
      
      // Signature Section
      if (data.signer1_name) {
        form.getTextField('PRINTED NAME').setText(data.signer1_name);
      }
      if (data.signer2_name) {
        form.getTextField('PRINTED NAME_2').setText(data.signer2_name);
      }
      if (data.sign_date) {
        form.getTextField('DATE').setText(data.sign_date);
        form.getTextField('DATE_2').setText(data.sign_date);
      }
      if (data.mailing_address) {
        form.getTextField('MAILING ADDRESS').setText(data.mailing_address);
      }
      if (data.email_address) {
        form.getTextField('EMAIL ADDRESS').setText(data.email_address);
      }
      if (data.phone_number) {
        form.getTextField('DAYTIME PHONE NUMBER').setText(data.phone_number);
        form.getTextField('DAYTIME PHONE NUMBER AREA CODE').setText(data.area_code || '');
      }
      
    } catch (fieldError) {
      console.error('Error filling BOE-19-P field:', fieldError);
    }
    
    return await pdfDoc.save();
    
  } catch (error) {
    console.error('Error filling BOE-19-P:', error);
    throw error;
  }
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
    
    // Generate requested forms
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
        documents: documents,
        case_number: data.case_number
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
        error: error.message,
        stack: error.stack
      })
    };
  }
};
