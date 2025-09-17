// config/law-office-config.js

// Law Offices of Rozsa Gyene Configuration
const LAW_OFFICE_CONFIG = {
  // Firm Information
  firm: {
    name: 'LAW OFFICES OF ROZSA GYENE',
    attorney: 'ROZSA GYENE, ESQ.',
    sbn: 'SBN 208356',
    full_title: 'ROZSA GYENE, ESQ. SBN 208356'
  },
  
  // Office Address
  address: {
    street: '450 N BRAND BLVD SUITE 600',
    city: 'GLENDALE',
    state: 'CA',
    zip: '91203',
    full: '450 N BRAND BLVD SUITE 600, GLENDALE CA 91203',
    mailing: '450 N BRAND BLVD SUITE 600\nGLENDALE, CA 91203'
  },
  
  // Contact Information
  contact: {
    phone: '(818) 291-6217',
    fax: '(818) 291-6205',
    email: 'rozsagyenelaw@yahoo.com',
    website: 'www.rozsagyenelaw.com'
  },
  
  // Court Information
  court: {
    name: 'SUPERIOR COURT OF THE STATE OF CALIFORNIA',
    county: 'FOR THE COUNTY OF LOS ANGELES',
    branch: 'STANLEY MOSK COURTHOUSE',
    probate_dept: 'Department 5',
    address: '111 North Hill Street, Los Angeles, CA 90012'
  },
  
  // Document Headers
  headers: {
    standard: function() {
      return `${this.firm.full_title}\n${this.address.street}\n${this.address.city}, ${this.address.state} ${this.address.zip}\nTel: ${this.contact.phone}\nFax: ${this.contact.fax}`;
    },
    compact: function() {
      return `${this.firm.name}\n${this.address.full}\n${this.contact.phone}`;
    }
  },
  
  // Default Values
  defaults: {
    state: 'California',
    county: 'Los Angeles',
    court_county: 'LOS ANGELES',
    currency_locale: 'en-US',
    date_format: 'MM/DD/YYYY',
    timezone: 'America/Los_Angeles'
  },
  
  // Fee Schedule (optional - for billing features)
  fees: {
    trust_administration: {
      base_fee: 5000,
      hourly_rate: 450,
      rush_multiplier: 1.5
    },
    document_fees: {
      notice_60_day: 250,
      government_notice: 150,
      distribution_package: 500,
      property_transfer: 750,
      tax_forms: 350
    }
  },
  
  // Document Settings
  documents: {
    font_family: 'Helvetica',
    font_size: 11,
    line_height: 1.5,
    margin_top: 72,    // 1 inch in points
    margin_bottom: 72,  // 1 inch in points
    margin_left: 72,    // 1 inch in points
    margin_right: 72,   // 1 inch in points
    line_numbers: true,
    line_number_start: 1,
    line_number_increment: 1
  },
  
  // Deadline Calculations (in days)
  deadlines: {
    notice_60_day: 60,
    contest_period: 120,
    creditor_claims_months: 4,
    estate_tax_months: 9,
    final_income_tax: 'April 15 following year of death',
    distribution_after_contest: 130 // 120 days + 10 day buffer
  },
  
  // Email Templates
  emailTemplates: {
    subject_prefix: '[Trust Administration]',
    signature: `Sincerely,\n\n${this.firm.name}\n${this.contact.phone}\n${this.contact.email}`,
    disclaimer: 'This email and any attachments are confidential and may be protected by legal privilege. If you are not the intended recipient, please notify the sender and delete this message.'
  },
  
  // Case Number Format
  caseNumberFormat: {
    prefix: 'TA',
    separator: '-',
    year_format: 'YYYYMM',
    sequence_digits: 4,
    example: 'TA-202411-0001'
  },
  
  // Google Integration Settings
  google: {
    drive_root_folder: 'Trust Administration Cases',
    sheets_name: 'Trust Admin Tracking',
    calendar_name: 'Trust Admin Deadlines',
    share_with_attorney: true,
    auto_create_folders: true
  },
  
  // Feature Flags
  features: {
    enable_spanish: false,
    enable_email_automation: false,
    enable_sms_notifications: false,
    enable_client_portal: false,
    enable_billing: false,
    enable_e_signature: false
  },
  
  // Compliance Settings
  compliance: {
    require_wet_signatures: true,
    require_notarization: ['affidavit_death_trustee', 'trust_transfer_deed'],
    require_certified_mail: ['60_day_notice'],
    retain_records_years: 7
  },
  
  // Helper Functions
  formatPhone: function(phone) {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    // Format as (XXX) XXX-XXXX
    return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6,10)}`;
  },
  
  formatCurrency: function(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  },
  
  formatDate: function(date) {
    const d = new Date(date);
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
  },
  
  generateCaseNumber: function() {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${this.caseNumberFormat.prefix}${this.caseNumberFormat.separator}${yearMonth}${this.caseNumberFormat.separator}${random}`;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LAW_OFFICE_CONFIG;
}
