export interface AdminSession {
  uid: string;
  email: string | null;
  isAdmin: boolean;
  source: 'firebase' | 'demo';
}
