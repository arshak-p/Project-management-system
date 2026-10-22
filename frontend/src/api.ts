import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_URL } from './config';

export { API_URL };

export type Role = 'admin' | 'project_manager' | 'team_head' | 'specialist' | 'hr' | 'sales_manager' | 'client';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  project_manager: 'Project Manager',
  team_head: 'Team Head',
  specialist: 'Team Member',
  hr: 'HR',
  sales_manager: 'Strategist',
  client: 'Client',
};

export interface Person { id: number; email: string; first_name?: string; last_name?: string; title?: string }
export interface User extends Person {
  role: Role;
  phone?: string;
  is_active?: boolean;
  is_superuser?: boolean;
  date_joined?: string;
  date_of_birth?: string | null;
  department_id?: number | null;
  efficiency?: number;
}
export interface Project { id: number; name: string; slug: string; description?: string; color?: string; total_minutes?: number; is_active: boolean }
export interface State { id: number; name: string; slug: string; color?: string; description?: string; sort_order?: number; is_active: boolean }
export interface Module { id: number; name: string; slug: string; job_title?: number | null; job_title_name?: string | null; is_active: boolean }
export interface Department { id: number; name: string; slug: string }
export interface JobTitle { id: number; name: string; is_active: boolean }
export type Priority = 'urgent' | 'high' | 'medium' | 'low';

export interface Task {
  id: number;
  task_code: string;
  title: string;
  description: string;
  project: number;
  project__slug?: string;
  state: number;
  state_slug: string;
  state__name?: string;
  module: number;
  priority: Priority;
  assignee: Person | null;
  content_writer: Person | null;
  posting_date: string | null;
  due_date: string | null;
  deadline: string | null;
  scheduled_date: string | null;
  reference_link?: string | null;
  strategy?: number | null;
  is_client_approved?: boolean;
  total_minutes?: number;
  board_position: number;
  is_active: boolean;
  updated_at: string;
}
export interface Comment { id: number; work_item: number; author: Person; body: string; created_at: string }
export interface TimeLog { id: number; work_item: number | null; user: Person | null; minutes: number; note: string; logged_at: string }
export interface Attachment { id: number; file: string; file_name: string; size_bytes?: number; uploaded_by: Person; created_at: string }
export interface Cycle { id: number; project: number; name: string; start_date: string; end_date: string; is_active: boolean }
export interface Notice { id: number; title: string; body: string; read: boolean; link: string; created_at: string }
export interface Activity { id: number; entity_type: string; entity_id: string; action: string; user: Person | null; project_name?: string; payload: { title?: string; task_code?: string; name?: string } | null; created_at: string }
export interface Strategy { id: number; project: number; project_name?: string; name: string; is_deployed: boolean; created_at: string }
export interface Backup { id: number; month: string; created_at: string; is_approved: boolean }
export interface Analytics {
  totals: { all: number; completed_or_launched: number; pending: number; total_time_minutes: number };
  by_state: { state__slug: string; state__name: string; c: number }[];
  by_project?: { project_id: number; c: number }[];
}

const client = axios.create({ baseURL: API_URL });

export const tokens = {
  get access() { return localStorage.getItem('access_token'); },
  get refresh() { return localStorage.getItem('refresh_token'); },
  set(access: string, refresh?: string) {
    localStorage.setItem('access_token', access);
    if (refresh) localStorage.setItem('refresh_token', refresh);
  },
  clear() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};

client.interceptors.request.use((config) => {
  if (tokens.access) config.headers.Authorization = `Bearer ${tokens.access}`;
  return config;
});

let refreshing: Promise<string> | null = null;

client.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retry && tokens.refresh) {
      original._retry = true;
      try {
        refreshing ??= axios
          .post(`${API_URL}/auth/refresh/`, { refresh: tokens.refresh })
          .then((r) => {
            tokens.set(r.data.access, r.data.refresh);
            return r.data.access as string;
          })
          .finally(() => { refreshing = null; });
        const access = await refreshing;
        original.headers.Authorization = `Bearer ${access}`;
        return client(original);
      } catch (refreshError) {
        // Only an invalid/expired refresh token ends the session; a network or server error should not.
        const code = (refreshError as AxiosError).response?.status;
        if (code === 400 || code === 401) {
          tokens.clear();
          window.dispatchEvent(new Event('auth:logout'));
        }
      }
    }
    return Promise.reject(error);
  },
);

/** Human-readable message from a DRF error response. */
export function errorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  const e = err as AxiosError<Record<string, unknown>>;
  if (e?.response?.status === 429) return 'Too many attempts. Please wait a bit and try again.';
  const data = e?.response?.data;
  if (!data || typeof data === 'string') return fallback;
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail)) return data.detail.join(' ');
  const first = Object.entries(data)[0];
  if (!first) return fallback;
  const [key, val] = first;
  const text = Array.isArray(val) ? val.join(' ') : String(val);
  return key === 'non_field_errors' ? text : `${key}: ${text}`;
}

const list = <T,>(url: string, params?: object) => client.get<T[]>(url, { params }).then((r) => r.data);
const save = (url: string, data: object, id?: number) =>
  id ? client.patch(`${url}${id}/`, data) : client.post(url, data);

export const api = {
  login: (email: string, password: string) =>
    axios.post(`${API_URL}/auth/login/`, { email, password }).then((r) => r.data as { access: string; refresh: string }),

  changePassword: (old_password: string, new_password: string) =>
    client.post('/auth/change-password/', { old_password, new_password }),

  me: () => client.get<User>('/users/me/').then((r) => r.data),
  users: (params?: object) => list<User>('/users/', params),
  assignable: () => list<Person>('/users/assignable/'),
  createUser: (data: object) => client.post('/auth/create-user/', data),
  updateUser: (id: number, data: object) => client.patch(`/users/${id}/`, data),
  deactivateUser: (id: number) => client.delete(`/users/${id}/`),
  restoreUser: (id: number) => client.post(`/users/${id}/restore/`),
  sendOtp: (email: string) => client.post('/auth/send-creation-otp/', { email }),
  verifyOtp: (email: string, otp: string) => client.post('/auth/verify-creation-otp/', { email, otp }),

  projects: (params?: object) => list<Project>('/projects/', params),
  saveProject: (data: object, id?: number) => save('/projects/', data, id),
  deleteProject: (id: number) => client.delete(`/projects/${id}/`),
  restoreProject: (id: number) => client.post(`/projects/${id}/restore/`),

  states: (params?: object) => list<State>('/states/', params),
  saveState: (data: object, id?: number) => save('/states/', data, id),
  deleteState: (id: number) => client.delete(`/states/${id}/`),
  restoreState: (id: number) => client.post(`/states/${id}/restore/`),

  modules: (params?: object) => list<Module>('/modules/', params),
  saveModule: (data: object, id?: number) => save('/modules/', data, id),
  deleteModule: (id: number) => client.delete(`/modules/${id}/`),
  restoreModule: (id: number) => client.post(`/modules/${id}/restore/`),

  departments: () => list<Department>('/departments/'),
  jobTitles: () => list<JobTitle>('/job-titles/'),
  addJobTitle: (name: string) => client.post('/job-titles/', { name }),
  deleteJobTitle: (id: number) => client.delete(`/job-titles/${id}/`),

  tasks: (params?: object) => list<Task>('/work-items/', params),
  createTask: (data: object) => client.post<Task>('/work-items/', data).then((r) => r.data),
  bulkCreateTasks: (items: object[]) => client.post('/work-items/bulk-create/', { items }),
  updateTask: (id: number, data: object) => client.patch<Task>(`/work-items/${id}/`, data).then((r) => r.data),
  deleteTask: (id: number) => client.delete(`/work-items/${id}/`),
  recordView: (id: number) => client.post(`/work-items/${id}/record-view/`),
  reorder: (rows: { id: number; state: number; board_position: number }[]) => client.post('/work-items/reorder/', rows),

  comments: (taskId: number) => list<Comment>('/comments/', { work_item: taskId }),
  addComment: (work_item: number, body: string) => client.post('/comments/', { work_item, body }),
  deleteComment: (id: number) => client.delete(`/comments/${id}/`),

  attachments: (taskId: number) => list<Attachment>('/attachments/', { work_item: taskId }),
  addAttachment: (work_item: number, file: File) => {
    const form = new FormData();
    form.append('work_item', String(work_item));
    form.append('file', file);
    return client.post('/attachments/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  deleteAttachment: (id: number) => client.delete(`/attachments/${id}/`),

  timeLogs: (params?: object) => list<TimeLog>('/time-logs/', params),
  timeLogsBetween: (from?: string, to?: string) =>
    list<TimeLog>('/time-logs/', { ...(from ? { logged_at__date__gte: from } : {}), ...(to ? { logged_at__date__lte: to } : {}) }),
  addTimeLog: (work_item: number, minutes: number, note: string) =>
    client.post('/time-logs/', { work_item, minutes, note, logged_at: new Date().toISOString() }),
  deleteTimeLog: (id: number) => client.delete(`/time-logs/${id}/`),

  cycles: () => list<Cycle>('/cycles/'),
  saveCycle: (data: object, id?: number) => save('/cycles/', data, id),
  deleteCycle: (id: number) => client.delete(`/cycles/${id}/`),

  strategies: (params?: object) => list<Strategy>('/strategies/', params),
  saveStrategy: (data: object) => client.post<Strategy>('/strategies/', data).then((r) => r.data),
  deployStrategy: (id: number) => client.post(`/strategies/${id}/deploy/`),
  exportStrategy: (id: number) => client.get(`/strategies/${id}/export-sheet/`, { responseType: 'blob' }).then((r) => r.data as Blob),

  analytics: (params?: object) => client.get<Analytics>('/analytics/summary/', { params }).then((r) => r.data),
  activity: () => list<Activity>('/activity/'),
  notifications: () => list<Notice>('/notifications/'),
  markRead: (id: number) => client.post(`/notifications/${id}/mark-read/`),
  markAllRead: () => client.post('/notifications/mark-all-read/'),

  backups: () => list<Backup>('/backups/'),
  downloadBackup: (b: Backup) =>
    (b.is_approved ? client.get(`/backups/${b.id}/download/`, { responseType: 'blob' }) : client.post(`/backups/${b.id}/approve-and-download/`, {}, { responseType: 'blob' })).then((r) => r.data as Blob),
  runBackup: () => client.post('/backups/trigger-automated/'),
};

export const fullName = (u?: Pick<Person, 'first_name' | 'last_name' | 'email'> | null) =>
  u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email : 'Unassigned';

export const isCopywriterHead = (u?: User | null) =>
  u?.role === 'team_head' && !!u.title?.toLowerCase().includes('content writer');

/** What each role may do - mirrors the backend rules in tms/views.py and tms/access.py. */
export const can = {
  manage: (r?: Role) => r === 'admin' || r === 'project_manager',
  admin: (r?: Role) => r === 'admin',
  createTask: (r?: Role) => r === 'admin' || r === 'project_manager',
  deleteTask: (r?: Role) => r === 'admin' || r === 'project_manager' || r === 'sales_manager',
  moveCard: (r?: Role) => r === 'admin' || r === 'project_manager' || r === 'team_head' || r === 'specialist',
  writeNotes: (r?: Role) => r !== undefined && r !== 'sales_manager' && r !== 'hr',
  planStrategy: (r?: Role) => r === 'admin' || r === 'project_manager' || r === 'sales_manager',
  manageProjects: (r?: Role) => r === 'admin' || r === 'project_manager' || r === 'sales_manager',
  manageWorkflow: (r?: Role) => r === 'admin' || r === 'project_manager' || r === 'sales_manager',
  manageTeam: (r?: Role) => r === 'admin' || r === 'hr',
  seeTeam: (r?: Role) => r === 'admin' || r === 'hr' || r === 'project_manager' || r === 'team_head' || r === 'sales_manager',
};
