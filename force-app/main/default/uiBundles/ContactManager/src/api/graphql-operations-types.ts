export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Base64: { input: string; output: string; }
  Currency: { input: number | string; output: number; }
  Date: { input: string; output: string; }
  DateTime: { input: string; output: string; }
  Double: { input: number | string; output: number; }
  Email: { input: string; output: string; }
  EncryptedString: { input: string; output: string; }
  /** Can be set to an ID or a Reference to the result of another mutation operation. */
  IdOrRef: { input: string; output: string; }
  JSON: { input: string; output: string; }
  Latitude: { input: number | string; output: number; }
  /** A 64-bit signed integer */
  Long: { input: number; output: number; }
  LongTextArea: { input: string; output: string; }
  Longitude: { input: number | string; output: number; }
  MultiPicklist: { input: string; output: string; }
  Percent: { input: number | string; output: number; }
  PhoneNumber: { input: string; output: string; }
  Picklist: { input: string; output: string; }
  RichTextArea: { input: string; output: string; }
  TextArea: { input: string; output: string; }
  Time: { input: string; output: string; }
  Url: { input: string; output: string; }
};

export type ContactCreateInput = {
  Contact: ContactCreateRepresentation;
};

export type ContactCreateRepresentation = {
  AccountId?: InputMaybe<Scalars['IdOrRef']['input']>;
  AssistantName?: InputMaybe<Scalars['String']['input']>;
  AssistantPhone?: InputMaybe<Scalars['PhoneNumber']['input']>;
  Birthdate?: InputMaybe<Scalars['Date']['input']>;
  CleanStatus?: InputMaybe<Scalars['Picklist']['input']>;
  ContactSource?: InputMaybe<Scalars['Picklist']['input']>;
  Department?: InputMaybe<Scalars['String']['input']>;
  Description?: InputMaybe<Scalars['LongTextArea']['input']>;
  Email?: InputMaybe<Scalars['Email']['input']>;
  EmailBouncedDate?: InputMaybe<Scalars['DateTime']['input']>;
  EmailBouncedReason?: InputMaybe<Scalars['String']['input']>;
  Fax?: InputMaybe<Scalars['PhoneNumber']['input']>;
  FirstName?: InputMaybe<Scalars['String']['input']>;
  HomePhone?: InputMaybe<Scalars['PhoneNumber']['input']>;
  IndividualId?: InputMaybe<Scalars['IdOrRef']['input']>;
  Jigsaw?: InputMaybe<Scalars['String']['input']>;
  Languages__c?: InputMaybe<Scalars['String']['input']>;
  LastName?: InputMaybe<Scalars['String']['input']>;
  LeadSource?: InputMaybe<Scalars['Picklist']['input']>;
  Level__c?: InputMaybe<Scalars['Picklist']['input']>;
  MailingCity?: InputMaybe<Scalars['String']['input']>;
  MailingCountry?: InputMaybe<Scalars['String']['input']>;
  MailingGeocodeAccuracy?: InputMaybe<Scalars['Picklist']['input']>;
  MailingLatitude?: InputMaybe<Scalars['Latitude']['input']>;
  MailingLongitude?: InputMaybe<Scalars['Longitude']['input']>;
  MailingPostalCode?: InputMaybe<Scalars['String']['input']>;
  MailingState?: InputMaybe<Scalars['String']['input']>;
  MailingStreet?: InputMaybe<Scalars['TextArea']['input']>;
  MobilePhone?: InputMaybe<Scalars['PhoneNumber']['input']>;
  OtherCity?: InputMaybe<Scalars['String']['input']>;
  OtherCountry?: InputMaybe<Scalars['String']['input']>;
  OtherGeocodeAccuracy?: InputMaybe<Scalars['Picklist']['input']>;
  OtherLatitude?: InputMaybe<Scalars['Latitude']['input']>;
  OtherLongitude?: InputMaybe<Scalars['Longitude']['input']>;
  OtherPhone?: InputMaybe<Scalars['PhoneNumber']['input']>;
  OtherPostalCode?: InputMaybe<Scalars['String']['input']>;
  OtherState?: InputMaybe<Scalars['String']['input']>;
  OtherStreet?: InputMaybe<Scalars['TextArea']['input']>;
  OwnerId?: InputMaybe<Scalars['IdOrRef']['input']>;
  Phone?: InputMaybe<Scalars['PhoneNumber']['input']>;
  ReportsToId?: InputMaybe<Scalars['IdOrRef']['input']>;
  Salutation?: InputMaybe<Scalars['Picklist']['input']>;
  Title?: InputMaybe<Scalars['String']['input']>;
};

export type ContactUpdateInput = {
  Contact: ContactUpdateRepresentation;
  Id: Scalars['IdOrRef']['input'];
};

export type ContactUpdateRepresentation = {
  AccountId?: InputMaybe<Scalars['IdOrRef']['input']>;
  AssistantName?: InputMaybe<Scalars['String']['input']>;
  AssistantPhone?: InputMaybe<Scalars['PhoneNumber']['input']>;
  Birthdate?: InputMaybe<Scalars['Date']['input']>;
  CleanStatus?: InputMaybe<Scalars['Picklist']['input']>;
  ContactSource?: InputMaybe<Scalars['Picklist']['input']>;
  Department?: InputMaybe<Scalars['String']['input']>;
  Description?: InputMaybe<Scalars['LongTextArea']['input']>;
  Email?: InputMaybe<Scalars['Email']['input']>;
  EmailBouncedDate?: InputMaybe<Scalars['DateTime']['input']>;
  EmailBouncedReason?: InputMaybe<Scalars['String']['input']>;
  Fax?: InputMaybe<Scalars['PhoneNumber']['input']>;
  FirstName?: InputMaybe<Scalars['String']['input']>;
  HomePhone?: InputMaybe<Scalars['PhoneNumber']['input']>;
  IndividualId?: InputMaybe<Scalars['IdOrRef']['input']>;
  Jigsaw?: InputMaybe<Scalars['String']['input']>;
  Languages__c?: InputMaybe<Scalars['String']['input']>;
  LastName?: InputMaybe<Scalars['String']['input']>;
  LeadSource?: InputMaybe<Scalars['Picklist']['input']>;
  Level__c?: InputMaybe<Scalars['Picklist']['input']>;
  MailingCity?: InputMaybe<Scalars['String']['input']>;
  MailingCountry?: InputMaybe<Scalars['String']['input']>;
  MailingGeocodeAccuracy?: InputMaybe<Scalars['Picklist']['input']>;
  MailingLatitude?: InputMaybe<Scalars['Latitude']['input']>;
  MailingLongitude?: InputMaybe<Scalars['Longitude']['input']>;
  MailingPostalCode?: InputMaybe<Scalars['String']['input']>;
  MailingState?: InputMaybe<Scalars['String']['input']>;
  MailingStreet?: InputMaybe<Scalars['TextArea']['input']>;
  MobilePhone?: InputMaybe<Scalars['PhoneNumber']['input']>;
  OtherCity?: InputMaybe<Scalars['String']['input']>;
  OtherCountry?: InputMaybe<Scalars['String']['input']>;
  OtherGeocodeAccuracy?: InputMaybe<Scalars['Picklist']['input']>;
  OtherLatitude?: InputMaybe<Scalars['Latitude']['input']>;
  OtherLongitude?: InputMaybe<Scalars['Longitude']['input']>;
  OtherPhone?: InputMaybe<Scalars['PhoneNumber']['input']>;
  OtherPostalCode?: InputMaybe<Scalars['String']['input']>;
  OtherState?: InputMaybe<Scalars['String']['input']>;
  OtherStreet?: InputMaybe<Scalars['TextArea']['input']>;
  OwnerId?: InputMaybe<Scalars['IdOrRef']['input']>;
  Phone?: InputMaybe<Scalars['PhoneNumber']['input']>;
  ReportsToId?: InputMaybe<Scalars['IdOrRef']['input']>;
  Salutation?: InputMaybe<Scalars['Picklist']['input']>;
  Title?: InputMaybe<Scalars['String']['input']>;
};

export enum DataType {
  Address = 'ADDRESS',
  Anytype = 'ANYTYPE',
  Base64 = 'BASE64',
  Boolean = 'BOOLEAN',
  Combobox = 'COMBOBOX',
  Complexvalue = 'COMPLEXVALUE',
  Currency = 'CURRENCY',
  Date = 'DATE',
  Datetime = 'DATETIME',
  Double = 'DOUBLE',
  Email = 'EMAIL',
  Encryptedstring = 'ENCRYPTEDSTRING',
  Int = 'INT',
  Json = 'JSON',
  Junctionidlist = 'JUNCTIONIDLIST',
  Location = 'LOCATION',
  Long = 'LONG',
  Multipicklist = 'MULTIPICKLIST',
  Percent = 'PERCENT',
  Phone = 'PHONE',
  Picklist = 'PICKLIST',
  Reference = 'REFERENCE',
  String = 'STRING',
  Textarea = 'TEXTAREA',
  Time = 'TIME',
  Url = 'URL'
}

export enum FieldExtraTypeInfo {
  ExternalLookup = 'EXTERNAL_LOOKUP',
  ImageUrl = 'IMAGE_URL',
  IndirectLookup = 'INDIRECT_LOOKUP',
  Personname = 'PERSONNAME',
  Plaintextarea = 'PLAINTEXTAREA',
  Richtextarea = 'RICHTEXTAREA',
  SwitchablePersonname = 'SWITCHABLE_PERSONNAME'
}

export enum FormFactor {
  Large = 'LARGE',
  Medium = 'MEDIUM',
  Small = 'SMALL'
}

export enum LayoutComponentType {
  Canvas = 'CANVAS',
  CustomLink = 'CUSTOM_LINK',
  EmptySpace = 'EMPTY_SPACE',
  Field = 'FIELD',
  ReportChart = 'REPORT_CHART',
  VisualforcePage = 'VISUALFORCE_PAGE'
}

export enum LayoutMode {
  Create = 'CREATE',
  Edit = 'EDIT',
  View = 'VIEW'
}

export enum LayoutType {
  Compact = 'COMPACT',
  Full = 'FULL'
}

/** Input to the mutation to delete a Record */
export type RecordDeleteInput = {
  /** The ID of the Record to delete */
  Id: Scalars['IdOrRef']['input'];
};

export enum ResultOrder {
  Asc = 'ASC',
  Desc = 'DESC'
}

export enum TabOrder {
  LeftRight = 'LEFT_RIGHT',
  TopDown = 'TOP_DOWN'
}

export enum UiBehavior {
  Edit = 'EDIT',
  Readonly = 'READONLY',
  Required = 'REQUIRED'
}

export type SearchContactsQueryVariables = Exact<{
  namePattern: Scalars['String']['input'];
  first: Scalars['Int']['input'];
}>;


export type SearchContactsQuery = { uiapi: { query: { Contact?: { edges?: Array<{ node?: { Id: string, Name?: { value?: string | null } | null, FirstName?: { value?: string | null } | null, LastName?: { value?: string | null } | null, Title?: { value?: string | null } | null, Email?: { value?: string | null } | null, Phone?: { value?: string | null } | null, Account?: { Name?: { value?: string | null } | null } | null } | null } | null> | null } | null } } };

export type CreateContactMutationVariables = Exact<{
  input: ContactCreateInput;
}>;


export type CreateContactMutation = { uiapi: { ContactCreate?: { Record?: { Id: string, Name?: { value?: string | null } | null } | null } | null } };

export type UpdateContactMutationVariables = Exact<{
  input: ContactUpdateInput;
}>;


export type UpdateContactMutation = { uiapi: { ContactUpdate?: { success?: boolean | null, Record?: { Id: string, Name?: { value?: string | null } | null } | null } | null } };

export type DeleteContactMutationVariables = Exact<{
  input: RecordDeleteInput;
}>;


export type DeleteContactMutation = { uiapi: { ContactDelete?: { Id?: string | null } | null } };
