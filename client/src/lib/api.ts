export type Profession = 'doctor' | 'nurse' | 'receptionist';
export type Role = 'manager' | 'staff';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  profession: Profession | null;
}

export interface Claim {
  claim_id: number;
  user_id: number;
  full_name: string;
  profession: Profession;
  assigned_by: 'self' | 'manager';
}

export interface Shift {
  id: number;
  external_shift_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  start_dt: string;
  end_dt: string;
  req_doctor: number;
  req_nurse: number;
  req_receptionist: number;
  notes: string | null;
  claims: Claim[];
  counts: Record<Profession, number>;
  missing: Record<Profession, number>;
  status: 'empty' | 'partial' | 'full';
}

export interface StaffMember {
  id: number;
  external_staff_id: string | null;
  full_name: string;
  email: string;
  profession: Profession;
  created_at: string;
}

export interface ImportRun {
  id: number;
  source: string;
  kind: 'staff' | 'shifts';
  run_at: string;
  accepted_count: number;
  rejected_count: number;
  merged_count: number;
  total_rows: number;
}

export interface ImportRow {
  id: number;
  run_id: number;
  row_number: number;
  raw_row: Record<string, string>;
  outcome: 'accepted' | 'rejected' | 'merged';
  reason: string | null;
  action_taken: string | null;
}

const TOKEN_KEY = 'clinic_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData) && options.body) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`/api${path}`, { ...options, headers });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    throw new ApiError(res.status, (data && data.error) || res.statusText);
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request<{ user: User }>('/auth/me'),

  listShifts: (from: string, to: string) =>
    request<{ shifts: Shift[] }>(`/shifts?from=${from}&to=${to}`),
  getShift: (id: number) => request<{ shift: Shift }>(`/shifts/${id}`),
  createShift: (payload: Partial<Shift>) =>
    request<{ shift: Shift }>('/shifts', { method: 'POST', body: JSON.stringify(payload) }),
  updateShift: (id: number, payload: Partial<Shift>) =>
    request<{ shift: Shift }>(`/shifts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteShift: (id: number) => request<{ ok: true }>(`/shifts/${id}`, { method: 'DELETE' }),
  claimShift: (id: number) => request<{ shift: Shift }>(`/shifts/${id}/claim`, { method: 'POST' }),
  assignShift: (id: number, userId: number) =>
    request<{ shift: Shift }>(`/shifts/${id}/assign`, { method: 'POST', body: JSON.stringify({ userId }) }),
  unclaimShift: (id: number, userId: number) =>
    request<{ shift: Shift }>(`/shifts/${id}/claims/${userId}`, { method: 'DELETE' }),

  listStaff: () => request<{ staff: StaffMember[] }>('/staff'),

  listImportRuns: () => request<{ runs: ImportRun[] }>('/imports/runs'),
  getImportRun: (id: number) => request<{ run: ImportRun; rows: ImportRow[] }>(`/imports/runs/${id}`),
  uploadImport: (file: File, kind: 'staff' | 'shifts') => {
    const form = new FormData();
    form.append('file', file);
    form.append('kind', kind);
    return request<{ result: { accepted: number; rejected: number; merged: number; total: number } }>('/imports/upload', {
      method: 'POST',
      body: form,
    });
  },
};

export { ApiError };
