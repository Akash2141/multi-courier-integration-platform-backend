export interface UrbaneBoltAuthRequest {
  username: string;
  password: string;
}

export interface UrbaneBoltAuthResponse {
  access_token?: string;
  token?: string;
  access?: string;
  jwt?: string;
  expires_in?: number;
  token_type?: string;
  expires?: string;
  status?: string;
  message?: string;
  [key: string]: unknown;
}

export interface UrbaneBoltManifestItem {
  customerCode: string;
  orderNumber: string;
  declaredValue: number;
  itemDescription: string;
  collectableValue: number;
  height: number;
  length: number;
  breadth: number;
  pieces: number;
  weight: number;
  serviceType: string;
  payMode: 'COD' | 'PPD' | string;
  shprName: string;
  shprAddress: string;
  shprCity: string;
  shprState: string;
  shprPincode: number | string;
  shprCountry: string;
  shprMobile: number | string;
  shprEmail?: string;
  shprAddressType?: string;
  consName: string;
  consAddress: string;
  consCity: string;
  consState: string;
  consPincode: number | string;
  consCountry: string;
  consMobile: number | string;
  consEmail?: string;
  consAddressType?: string;
  rtnName: string;
  rtnAddress: string;
  rtnCity: string;
  rtnState: string;
  rtnPincode: number | string;
  rtnCountry: string;
  rtnMobile: number | string;
  rtnEmail?: string;
  rtnAddressType?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceValue?: number;
  itemQuantity?: number;
}

export interface UrbaneBoltManifestResponseItem {
  awb?: string;
  awbNumber?: string;
  orderNumber?: string;
  order_id?: string;
  status?: string;
  success?: boolean;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export interface UrbaneBoltTrackingEvent {
  status?: string;
  activity?: string;
  action?: string;
  location?: string;
  city?: string;
  timestamp?: string;
  date?: string;
  time?: string;
  [key: string]: unknown;
}

export interface UrbaneBoltTrackingResponse {
  status?: string;
  current_status?: string;
  awb?: string;
  orderNumber?: string;
  events?: UrbaneBoltTrackingEvent[];
  scans?: UrbaneBoltTrackingEvent[];
  history?: UrbaneBoltTrackingEvent[];
  estimated_delivery?: string;
  [key: string]: unknown;
}

export interface UrbaneBoltCancelRequest {
  awbs: string;
}

export interface UrbaneBoltCancelResponse {
  status?: string;
  success?: boolean;
  message?: string;
  awbs?: string;
  [key: string]: unknown;
}
