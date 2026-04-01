export interface EntityColumn {
  id: string;
  name: string;
  process: string;
  dataClassification: string;
  consolidationMethod: string;
  existsInGoldenRecord: boolean;
}

export interface EntityDomain {
  id: string;
  name: string;
  description: string;
  columns: EntityColumn[];
}

export const entityMetadata: EntityDomain[] = [
  {
    id: 'customer_account',
    name: 'Customer / Account (Party domain)',
    description: 'Organizations or people you sell to; often grouped under a generic Party model with contacts and households.',
    columns: [
      { id: 'c1', name: 'Customer ID', process: 'System Generated', dataClassification: 'Public', consolidationMethod: 'Exact Match', existsInGoldenRecord: true },
      { id: 'c2', name: 'Full Name', process: 'User Input', dataClassification: 'PII', consolidationMethod: 'Longest String', existsInGoldenRecord: true },
      { id: 'c3', name: 'Email Address', process: 'User Input', dataClassification: 'PII', consolidationMethod: 'Most Recent', existsInGoldenRecord: true },
      { id: 'c4', name: 'Phone Number', process: 'User Input', dataClassification: 'PII', consolidationMethod: 'Most Recent', existsInGoldenRecord: true },
      { id: 'c5', name: 'Billing Address', process: 'Verified via API', dataClassification: 'Confidential', consolidationMethod: 'Most Complete', existsInGoldenRecord: true },
    ]
  },
  {
    id: 'supplier_vendor',
    name: 'Supplier / Vendor (Party domain)',
    description: 'Organizations you buy from; also modeled as Party.',
    columns: [
      { id: 's1', name: 'Vendor ID', process: 'System Generated', dataClassification: 'Public', consolidationMethod: 'Exact Match', existsInGoldenRecord: true },
      { id: 's2', name: 'Company Name', process: 'Verified via API', dataClassification: 'Public', consolidationMethod: 'Most Complete', existsInGoldenRecord: true },
      { id: 's3', name: 'Tax ID', process: 'Verified via API', dataClassification: 'Confidential', consolidationMethod: 'Exact Match', existsInGoldenRecord: true },
    ]
  },
  {
    id: 'employee_person',
    name: 'Employee / Person',
    description: 'Workers, contractors, or individuals interacting with your org (some tools treat this as a Party subtype).',
    columns: [
      { id: 'e1', name: 'Employee ID', process: 'HR System', dataClassification: 'Internal', consolidationMethod: 'Exact Match', existsInGoldenRecord: true },
      { id: 'e2', name: 'First Name', process: 'HR System', dataClassification: 'PII', consolidationMethod: 'Most Recent', existsInGoldenRecord: true },
      { id: 'e3', name: 'Last Name', process: 'HR System', dataClassification: 'PII', consolidationMethod: 'Most Recent', existsInGoldenRecord: true },
      { id: 'e4', name: 'SSN', process: 'HR System', dataClassification: 'Highly Confidential', consolidationMethod: 'Exact Match', existsInGoldenRecord: false },
    ]
  },
  {
    id: 'product_item',
    name: 'Product / Item / SKU (Product domain)',
    description: 'Catalog, hierarchy, attributes, packaging, variants.',
    columns: [
      { id: 'p1', name: 'SKU', process: 'PIM System', dataClassification: 'Public', consolidationMethod: 'Exact Match', existsInGoldenRecord: true },
      { id: 'p2', name: 'Product Name', process: 'PIM System', dataClassification: 'Public', consolidationMethod: 'Longest String', existsInGoldenRecord: true },
      { id: 'p3', name: 'Category', process: 'PIM System', dataClassification: 'Public', consolidationMethod: 'Most Frequent', existsInGoldenRecord: true },
      { id: 'p4', name: 'Price', process: 'ERP System', dataClassification: 'Internal', consolidationMethod: 'Most Recent', existsInGoldenRecord: true },
    ]
  },
  {
    id: 'location_address',
    name: 'Location / Address / Site',
    description: 'Stores, facilities, geocoded addresses, regions.',
    columns: [
      { id: 'l1', name: 'Location ID', process: 'System Generated', dataClassification: 'Internal', consolidationMethod: 'Exact Match', existsInGoldenRecord: true },
      { id: 'l2', name: 'Address Line 1', process: 'User Input', dataClassification: 'Public', consolidationMethod: 'Most Complete', existsInGoldenRecord: true },
      { id: 'l3', name: 'City', process: 'User Input', dataClassification: 'Public', consolidationMethod: 'Most Frequent', existsInGoldenRecord: true },
      { id: 'l4', name: 'Coordinates', process: 'Geocoding API', dataClassification: 'Public', consolidationMethod: 'Most Recent', existsInGoldenRecord: true },
    ]
  },
  {
    id: 'asset_equipment',
    name: 'Asset / Equipment',
    description: 'Physical or digital assets you own/maintain.',
    columns: [
      { id: 'a1', name: 'Asset Tag', process: 'System Generated', dataClassification: 'Internal', consolidationMethod: 'Exact Match', existsInGoldenRecord: true },
      { id: 'a2', name: 'Serial Number', process: 'Manufacturer', dataClassification: 'Internal', consolidationMethod: 'Exact Match', existsInGoldenRecord: true },
      { id: 'a3', name: 'Purchase Date', process: 'ERP System', dataClassification: 'Internal', consolidationMethod: 'Most Recent', existsInGoldenRecord: true },
    ]
  },
  {
    id: 'vendor_customer_rel',
    name: 'Vendor/Customer relationship & Account structures',
    description: 'Account master used by CRM/ERP.',
    columns: [
      { id: 'vcr1', name: 'Relationship ID', process: 'System Generated', dataClassification: 'Internal', consolidationMethod: 'Exact Match', existsInGoldenRecord: true },
      { id: 'vcr2', name: 'Parent Account', process: 'CRM System', dataClassification: 'Internal', consolidationMethod: 'Most Recent', existsInGoldenRecord: true },
      { id: 'vcr3', name: 'Credit Limit', process: 'ERP System', dataClassification: 'Confidential', consolidationMethod: 'Most Recent', existsInGoldenRecord: true },
    ]
  },
  {
    id: 'org_cost_center',
    name: 'Organization / Cost Center / Hierarchy',
    description: 'Legal entities, org units, reporting lines.',
    columns: [
      { id: 'o1', name: 'Org Unit ID', process: 'HR System', dataClassification: 'Internal', consolidationMethod: 'Exact Match', existsInGoldenRecord: true },
      { id: 'o2', name: 'Cost Center Code', process: 'ERP System', dataClassification: 'Internal', consolidationMethod: 'Exact Match', existsInGoldenRecord: true },
      { id: 'o3', name: 'Manager ID', process: 'HR System', dataClassification: 'Internal', consolidationMethod: 'Most Recent', existsInGoldenRecord: true },
    ]
  },
  {
    id: 'chart_of_accounts',
    name: 'Chart of Accounts & Financial Dimensions (Account domain)',
    description: 'Master lists that drive posting and reporting.',
    columns: [
      { id: 'coa1', name: 'Account Number', process: 'ERP System', dataClassification: 'Internal', consolidationMethod: 'Exact Match', existsInGoldenRecord: true },
      { id: 'coa2', name: 'Account Type', process: 'ERP System', dataClassification: 'Internal', consolidationMethod: 'Most Frequent', existsInGoldenRecord: true },
      { id: 'coa3', name: 'Active Status', process: 'ERP System', dataClassification: 'Internal', consolidationMethod: 'Most Recent', existsInGoldenRecord: true },
    ]
  },
  {
    id: 'service_offering',
    name: 'Service / Offering',
    description: 'Service catalog and bundles alongside products.',
    columns: [
      { id: 'so1', name: 'Service ID', process: 'System Generated', dataClassification: 'Internal', consolidationMethod: 'Exact Match', existsInGoldenRecord: true },
      { id: 'so2', name: 'Service Name', process: 'Product Team', dataClassification: 'Public', consolidationMethod: 'Longest String', existsInGoldenRecord: true },
      { id: 'so3', name: 'SLA Level', process: 'Support Team', dataClassification: 'Internal', consolidationMethod: 'Most Frequent', existsInGoldenRecord: true },
    ]
  }
];
