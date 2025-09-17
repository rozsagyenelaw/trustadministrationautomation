// FIELD MAPPING FOR ALL TRUST ADMINISTRATION DOCUMENTS
// Law Offices of Rozsa Gyene - Suite 600

const FIELD_MAPPING = {
  // Core case information used across multiple documents
  core_fields: {
    case_number: "Unique identifier (TA-YYYYMM-XXXX)",
    
    // Decedent Information
    decedent_first_name: "Required",
    decedent_middle_name: "Optional",
    decedent_last_name: "Required",
    decedent_full_name: "Auto-generated from first + middle + last",
    death_date: "Required - used for deadline calculations",
    death_place: "Optional",
    ssn_last4: "Last 4 digits only for security",
    marital_status: "single/married/divorced/widowed",
    gender: "male/female - for pronouns in documents",
    
    // Trust Information
    trust_name: "Required - full legal name of trust",
    trust_date: "Required - original trust execution date",
    trust_type: "revocable/irrevocable/ab_trust",
    trust_tax_id: "EIN for irrevocable trusts",
    
    // Trustee Information
    trustee_name: "Required - current acting trustee",
    trustee_address: "Street address",
    trustee_city: "City",
    trustee_state: "Default: CA",
    trustee_zip: "ZIP code",
    trustee_phone: "Contact phone",
    trustee_email: "Email address",
    
    // Co-Trustee Information (if applicable)
    has_cotrustees: "Boolean",
    cotrustee_names: "Array of names",
    
    // Property Information
    property_address: "Street address of real property",
    property_city: "City",
    property_county: "Default: LOS ANGELES",
    property_state: "Default: CA",
    property_zip: "ZIP code",
    apn: "Assessor's Parcel Number",
    legal_description: "From deed",
    
    // Recording Information
    deed_date: "Date deed was recorded",
    instrument_number: "Recording instrument number",
    document_number: "Recorder's document number"
  },
  
  // Document-specific field mappings
  documents: {
    
    // 1. RECEIPT FROM DISTRIBUTEE (Probate Code §11751)
    receipt_distributee: {
      required_fields: [
        "beneficiary_name",
        "trustee_name", 
        "trust_name",
        "distribution_amount"
      ],
      optional_fields: [
        "distribution_description",
        "partial_distribution" // Boolean
      ],
      generated_text: {
        header: "LAW OFFICES OF ROZSA GYENE, Suite 600",
        court: "SUPERIOR COURT OF THE STATE OF CALIFORNIA",
        county: "FOR THE COUNTY OF LOS ANGELES",
        title: "RECEIPT FROM DISTRIBUTEE FOR PROPERTY RECEIVED (PROB. C. SEC 11751)"
      }
    },
    
    // 2. WAIVER OF FINAL ACCOUNTING
    waiver_accounting: {
      required_fields: [
        "beneficiary_name",
        "trust_name",
        "trustee_name",
        "distribution_amount"
      ],
      optional_fields: [
        "beneficiary_address",
        "distribution_percentage"
      ],
      legal_text: {
        waiver: "waives the preparation and/or filing of a final accounting",
        consent: "fully consents to the immediate distribution",
        release: "does release and forever discharge"
      }
    },
    
    // 3. 60-DAY NOTICE (Probate Code §16061.7)
    sixty_day_notice: {
      required_fields: [
        "recipient_name",
        "recipient_address",
        "trust_name",
        "trust_date",
        "decedent_name",
        "death_date",
        "trustee_name",
        "trustee_address",
        "trustee_phone"
      ],
      statutory_warning: "YOU MAY NOT BRING AN ACTION TO CONTEST THE TRUST MORE THAN 120 DAYS",
      deadline_calculation: "120 days from service OR 60 days from delivery of trust terms"
    },
    
    // 4. GOVERNMENT AGENCY NOTICES
    government_notices: {
      agencies: {
        ftb: {
          name: "California Franchise Tax Board",
          address: "P.O. Box 2952, MS A-454, Sacramento, CA 95812-9974"
        },
        irs: {
          name: "Internal Revenue Service", 
          address: "Ogden Service Center, Ogden, UT 84201-0002"
        },
        dhcs: {
          name: "Department of Health Care Services",
          address: "Estate Recovery Unit, MS 4720, Sacramento, CA 95899-7425"
        }
      },
      required_fields: [
        "decedent_name",
        "death_date",
        "ssn_last4",
        "marital_status"
      ],
      attachments: ["Death Certificate"]
    },
    
    // 5. AFFIDAVIT - DEATH OF TRUSTEE
    affidavit_death_trustee: {
      required_fields: [
        "surviving_trustee",
        "decedent_name",
        "trust_name",
        "trust_date",
        "property_address",
        "deed_date",
        "instrument_number",
        "apn"
      ],
      legal_requirements: {
        notarization: true,
        death_certificate: true,
        legal_description: true
      }
    },
    
    // 6. TRUST TRANSFER DEED
    trust_transfer_deed: {
      required_fields: [
        "grantor_name",
        "trust_name",
        "trust_date",
        "property_address",
        "property_city",
        "property_county",
        "apn",
        "legal_description"
      ],
      tax_statements: {
        documentary_transfer_tax: "$0 (no consideration)",
        proposition_13_exclusion: "R&T 11930",
        sb2_fee: "$75 or exempt"
      }
    },
    
    // 7. CERTIFICATION OF TRUST
    certification_trust: {
      required_fields: [
        "trust_name",
        "trust_date",
        "grantor_name",
        "trustee_name",
        "death_date",
        "trust_tax_id"
      ],
      probate_code: "§18100.5",
      powers_included: [
        "acquire",
        "sell",
        "assign", 
        "convey",
        "pledge",
        "encumber",
        "lease",
        "borrow",
        "manage"
      ]
    },
    
    // 8. BOE-502-A (PCOR)
    pcor: {
      required_fields: [
        "buyer_name",
        "buyer_address",
        "seller_name",
        "property_address",
        "apn"
      ],
      optional_fields: [
        "buyer_email",
        "buyer_phone",
        "purchase_price",
        "transfer_date",
        "principal_residence", // Boolean
        "disabled_veteran" // Boolean
      ],
      exclusions: {
        parent_child: "Section C",
        interspousal: "Section A",
        trust_transfer: "Section L"
      }
    },
    
    // 9. BOE-502-D (Death of Owner)
    boe_502d: {
      required_fields: [
        "decedent_name",
        "death_date",
        "property_address",
        "property_city",
        "property_zip",
        "apn"
      ],
      transfer_types: [
        "spouse",
        "registered_domestic_partner",
        "children",
        "grandchildren",
        "cotenant",
        "other_heirs",
        "trust"
      ],
      required_statements: {
        section_480b: true,
        penalty_notice: true
      }
    },
    
    // 10. BOE-19-P (Parent-Child Exclusion)
    boe_19p: {
      required_fields: [
        "transferor_name1",
        "transferee_name1",
        "relationship1",
        "property_address",
        "apn",
        "transfer_date"
      ],
      optional_fields: [
        "transferor_name2",
        "transferee_name2",
        "relationship2",
        "family_farm", // Boolean
        "principal_residence", // Boolean
        "homeowners_exemption", // Boolean
        "disabled_veterans_exemption" // Boolean
      ],
      prop_19_limits: {
        value_limit: "$1,000,000 adjustment",
        effective_date: "February 16, 2021"
      }
    },
    
    // 11. DISTRIBUTION LETTER
    distribution_letter: {
      required_fields: [
        "beneficiary_name",
        "beneficiary_address",
        "trust_name",
        "distribution_amount"
      ],
      enclosures: [
        "Distribution check",
        "Receipt for Distribution",
        "Waiver of Accounting",
        "Receipt and Release Agreement"
      ]
    },
    
    // 12. RECEIPT AND RELEASE AGREEMENT
    receipt_release: {
      required_fields: [
        "trustee_name",
        "beneficiary_name",
        "trust_name",
        "decedent_name",
        "death_date"
      ],
      distribution_fields: [
        "cash_distribution",
        "property_distribution",
        "securities_distribution",
        "other_distribution",
        "total_distribution"
      ]
    }
  },
  
  // Deadline calculations from death date
  deadline_calculations: {
    sixty_day_notice: {
      days: 60,
      statutory_reference: "Probate Code §16061.7",
      description: "Notice to heirs and beneficiaries"
    },
    contest_period: {
      days: 120,
      statutory_reference: "Probate Code §16061.8",
      description: "Trust contest period"
    },
    creditor_claims: {
      months: 4,
      statutory_reference: "Probate Code §19003",
      description: "Creditor claim period"
    },
    estate_tax_706: {
      months: 9,
      description: "Federal estate tax return",
      extendable: true
    },
    fiduciary_1041: {
      calculation: "April 15 of year following death",
      description: "Final fiduciary income tax return"
    },
    final_1040: {
      calculation: "April 15 of year following death",
      description: "Decedent's final income tax return"
    }
  },
  
  // Validation rules
  validation: {
    required_for_all: [
      "case_number",
      "decedent_name",
      "death_date",
      "trust_name",
      "trustee_name"
    ],
    
    format_rules: {
      death_date: "YYYY-MM-DD",
      phone: "(XXX) XXX-XXXX",
      ssn_last4: "XXXX (4 digits only)",
      apn: "XXXX-XXX-XXX format",
      case_number: "TA-YYYYMM-XXXX"
    },
    
    conditional_requirements: {
      if_real_property: [
        "property_address",
        "apn",
        "legal_description"
      ],
      if_ab_trust: [
        "trust_tax_id",
        "bypass_allocation",
        "survivor_allocation"
      ],
      if_distribution: [
        "beneficiary_name",
        "distribution_amount",
        "distribution_date"
      ]
    }
  }
};

// Export for use in other functions
module.exports = FIELD_MAPPING;
