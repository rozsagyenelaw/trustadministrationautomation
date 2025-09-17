// netlify/functions/google-drive-integration.js

const { google } = require('googleapis');
const stream = require('stream');

// Google Drive folder structure
const DRIVE_STRUCTURE = {
  ROOT_FOLDER: 'Trust Administration Cases',
  
  // Subfolder structure for each case
  CASE_SUBFOLDERS: {
    NOTICES: '01 - Notices',
    GOVERNMENT: '02 - Government Filings',
    PROPERTY: '03 - Property Documents',
    TAX_FORMS: '04 - Tax Forms',
    DISTRIBUTION: '05 - Distribution Documents',
    CORRESPONDENCE: '06 - Correspondence',
    TRUST_DOCUMENTS: '07 - Trust Documents',
    RECEIPTS: '08 - Receipts & Releases',
    ACCOUNTING: '09 - Accounting',
    MISCELLANEOUS: '10 - Miscellaneous'
  },
  
  // Document type to folder mapping
  DOCUMENT_FOLDERS: {
    '60_day_notice': 'NOTICES',
    'government_notice_ftb': 'GOVERNMENT',
    'government_notice_irs': 'GOVERNMENT',
    'government_notice_dhcs': 'GOVERNMENT',
    'affidavit_death_trustee': 'PROPERTY',
    'trust_transfer_deed': 'PROPERTY',
    'certification_trust': 'TRUST_DOCUMENTS',
    'boe_502a_pcor': 'TAX_FORMS',
    'boe_502d_death': 'TAX_FORMS',
    'boe_19p_parent_child': 'TAX_FORMS',
    'receipt_distributee': 'RECEIPTS',
    'waiver_accounting': 'RECEIPTS',
    'receipt_release': 'RECEIPTS',
    'distribution_letter': 'DISTRIBUTION',
    'trust_accounting': 'ACCOUNTING'
  }
};

// Initialize Google Drive API
async function initializeGoogleDrive() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\\n/g, '\n')
      },
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file'
      ]
    });
    
    const drive = google.drive({ version: 'v3', auth });
    return drive;
  } catch (error) {
    console.error('Error initializing Google Drive:', error);
    throw error;
  }
}

// Create or get folder
async function createOrGetFolder(drive, folderName, parentId = null) {
  try {
    // Search for existing folder
    let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }
    
    const searchResponse = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive'
    });
    
    if (searchResponse.data.files.length > 0) {
      // Folder exists
      return searchResponse.data.files[0].id;
    }
    
    // Create new folder
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };
    
    if (parentId) {
      fileMetadata.parents = [parentId];
    }
    
    const createResponse = await drive.files.create({
      resource: fileMetadata,
      fields: 'id'
    });
    
    return createResponse.data.id;
  } catch (error) {
    console.error('Error creating/getting folder:', error);
    throw error;
  }
}

// Create case folder structure
async function createCaseFolderStructure(caseNumber, decedentName) {
  const drive = await initializeGoogleDrive();
  
  try {
    // Create root folder if it doesn't exist
    const rootFolderId = await createOrGetFolder(drive, DRIVE_STRUCTURE.ROOT_FOLDER);
    
    // Create case folder with format: "TA-202411-0001 - Smith, John"
    const lastName = decedentName.split(' ').pop();
    const firstName = decedentName.split(' ')[0];
    const caseFolderName = `${caseNumber} - ${lastName}, ${firstName}`;
    
    const caseFolderId = await createOrGetFolder(drive, caseFolderName, rootFolderId);
    
    // Create subfolders
    const subfolders = {};
    for (const [key, folderName] of Object.entries(DRIVE_STRUCTURE.CASE_SUBFOLDERS)) {
      const subfolderId = await createOrGetFolder(drive, folderName, caseFolderId);
      subfolders[key] = subfolderId;
    }
    
    // Set permissions (optional - share with specific email)
    if (process.env.SHARE_FOLDER_WITH_EMAIL) {
      await drive.permissions.create({
        fileId: caseFolderId,
        requestBody: {
          role: 'writer',
          type: 'user',
          emailAddress: process.env.SHARE_FOLDER_WITH_EMAIL
        }
      });
    }
    
    // Get shareable link
    const link = `https://drive.google.com/drive/folders/${caseFolderId}`;
    
    return {
      success: true,
      case_folder_id: caseFolderId,
      case_folder_link: link,
      subfolders: subfolders
    };
  } catch (error) {
    console.error('Error creating case folder structure:', error);
    throw error;
  }
}

// Upload PDF document to Drive
async function uploadPDFToDrive(pdfBase64, fileName, caseNumber, documentType) {
  const drive = await initializeGoogleDrive();
  
  try {
    // Get case folder
    const rootFolderId = await createOrGetFolder(drive, DRIVE_STRUCTURE.ROOT_FOLDER);
    
    // Search for case folder
    const caseQuery = `name contains '${caseNumber}' and mimeType='application/vnd.google-apps.folder' and '${rootFolderId}' in parents and trashed=false`;
    const caseSearch = await drive.files.list({
      q: caseQuery,
      fields: 'files(id, name)'
    });
    
    if (caseSearch.data.files.length === 0) {
      throw new Error(`Case folder not found for ${caseNumber}`);
    }
    
    const caseFolderId = caseSearch.data.files[0].id;
    
    // Determine subfolder based on document type
    const folderType = DRIVE_STRUCTURE.DOCUMENT_FOLDERS[documentType] || 'MISCELLANEOUS';
    const subfolderName = DRIVE_STRUCTURE.CASE_SUBFOLDERS[folderType];
    
    // Get subfolder ID
    const subfolderId = await createOrGetFolder(drive, subfolderName, caseFolderId);
    
    // Convert base64 to buffer
    const buffer = Buffer.from(pdfBase64, 'base64');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    
    // Upload file
    const fileMetadata = {
      name: fileName,
      parents: [subfolderId]
    };
    
    const media = {
      mimeType: 'application/pdf',
      body: bufferStream
    };
    
    const uploadResponse = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink'
    });
    
    return {
      success: true,
      file_id: uploadResponse.data.id,
      view_link: uploadResponse.data.webViewLink,
      download_link: uploadResponse.data.webContentLink
    };
  } catch (error) {
    console.error('Error uploading PDF to Drive:', error);
    throw error;
  }
}

// Batch upload multiple documents
async function batchUploadDocuments(caseNumber, documents) {
  const results = [];
  
  for (const [docType, base64Data] of Object.entries(documents)) {
    try {
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `${caseNumber}_${docType}_${timestamp}.pdf`;
      
      const uploadResult = await uploadPDFToDrive(
        base64Data,
        fileName,
        caseNumber,
        docType
      );
      
      results.push({
        document_type: docType,
        file_name: fileName,
        ...uploadResult
      });
    } catch (error) {
      results.push({
        document_type: docType,
        error: error.message
      });
    }
  }
  
  return results;
}

// Get all files in a case folder
async function getCaseFiles(caseNumber) {
  const drive = await initializeGoogleDrive();
  
  try {
    // Get root folder
    const rootFolderId = await createOrGetFolder(drive, DRIVE_STRUCTURE.ROOT_FOLDER);
    
    // Find case folder
    const caseQuery = `name contains '${caseNumber}' and mimeType='application/vnd.google-apps.folder' and '${rootFolderId}' in parents and trashed=false`;
    const caseSearch = await drive.files.list({
      q: caseQuery,
      fields: 'files(id, name)'
    });
    
    if (caseSearch.data.files.length === 0) {
      throw new Error(`Case folder not found for ${caseNumber}`);
    }
    
    const caseFolderId = caseSearch.data.files[0].id;
    
    // Get all files in case folder and subfolders
    const filesQuery = `'${caseFolderId}' in parents and trashed=false`;
    const filesResponse = await drive.files.list({
      q: filesQuery,
      fields: 'files(id, name, mimeType, webViewLink, webContentLink, createdTime, modifiedTime, parents)',
      orderBy: 'createdTime desc'
    });
    
    const files = filesResponse.data.files || [];
    
    // Organize files by folder
    const organizedFiles = {};
    for (const file of files) {
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        // Get files in this subfolder
        const subQuery = `'${file.id}' in parents and trashed=false`;
        const subFiles = await drive.files.list({
          q: subQuery,
          fields: 'files(id, name, mimeType, webViewLink, webContentLink, createdTime, modifiedTime)'
        });
        
        organizedFiles[file.name] = subFiles.data.files || [];
      }
    }
    
    return {
      success: true,
      case_number: caseNumber,
      files: organizedFiles,
      total_files: Object.values(organizedFiles).reduce((sum, arr) => sum + arr.length, 0)
    };
  } catch (error) {
    console.error('Error getting case files:', error);
    throw error;
  }
}

// Create a shared link for a file
async function createShareableLink(fileId, emailAddress = null) {
  const drive = await initializeGoogleDrive();
  
  try {
    // Create permission
    const permission = {
      type: emailAddress ? 'user' : 'anyone',
      role: 'reader'
    };
    
    if (emailAddress) {
      permission.emailAddress = emailAddress;
    }
    
    await drive.permissions.create({
      fileId: fileId,
      requestBody: permission
    });
    
    // Get the file to get its web link
    const file = await drive.files.get({
      fileId: fileId,
      fields: 'webViewLink'
    });
    
    return {
      success: true,
      file_id: fileId,
      shareable_link: file.data.webViewLink
    };
  } catch (error) {
    console.error('Error creating shareable link:', error);
    throw error;
  }
}

// Archive a case folder
async function archiveCaseFolder(caseNumber) {
  const drive = await initializeGoogleDrive();
  
  try {
    // Get folders
    const rootFolderId = await createOrGetFolder(drive, DRIVE_STRUCTURE.ROOT_FOLDER);
    const archiveFolderId = await createOrGetFolder(drive, 'Archived Cases', rootFolderId);
    
    // Find case folder
    const caseQuery = `name contains '${caseNumber}' and mimeType='application/vnd.google-apps.folder' and '${rootFolderId}' in parents and trashed=false`;
    const caseSearch = await drive.files.list({
      q: caseQuery,
      fields: 'files(id, name)'
    });
    
    if (caseSearch.data.files.length === 0) {
      throw new Error(`Case folder not found for ${caseNumber}`);
    }
    
    const caseFolderId = caseSearch.data.files[0].id;
    
    // Move to archive folder
    await drive.files.update({
      fileId: caseFolderId,
      addParents: archiveFolderId,
      removeParents: rootFolderId,
      fields: 'id, parents'
    });
    
    return {
      success: true,
      case_number: caseNumber,
      archived: true
    };
  } catch (error) {
    console.error('Error archiving case folder:', error);
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
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: ''
    };
  }
  
  const path = event.path.replace('/.netlify/functions/google-drive-integration', '');
  const method = event.httpMethod;
  
  try {
    let response = {};
    
    switch (path) {
      case '/create-case-folder':
        if (method === 'POST') {
          const { case_number, decedent_name } = JSON.parse(event.body);
          response = await createCaseFolderStructure(case_number, decedent_name);
        }
        break;
        
      case '/upload-document':
        if (method === 'POST') {
          const { pdf_base64, file_name, case_number, document_type } = JSON.parse(event.body);
          response = await uploadPDFToDrive(pdf_base64, file_name, case_number, document_type);
        }
        break;
        
      case '/batch-upload':
        if (method === 'POST') {
          const { case_number, documents } = JSON.parse(event.body);
          response = await batchUploadDocuments(case_number, documents);
        }
        break;
        
      case '/get-case-files':
        if (method === 'GET') {
          const caseNumber = event.queryStringParameters.case_number;
          response = await getCaseFiles(caseNumber);
        }
        break;
        
      case '/create-share-link':
        if (method === 'POST') {
          const { file_id, email } = JSON.parse(event.body);
          response = await createShareableLink(file_id, email);
        }
        break;
        
      case '/archive-case':
        if (method === 'PUT') {
          const { case_number } = JSON.parse(event.body);
          response = await archiveCaseFolder(case_number);
        }
        break;
        
      default:
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Endpoint not found' })
        };
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
    console.error('Google Drive API error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Failed to process Drive request',
        details: error.message
      })
    };
  }
};
