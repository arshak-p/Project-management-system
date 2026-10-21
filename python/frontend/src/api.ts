import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

// Same-origin in production; Vite proxies /api to Django in development.
export const API_URL: string = import.meta.env.VITE_API_URL ?? '/api';

export type Role = 'admin' | 'project_manager' | 'team_head' | 'specialist' | 'sales_manager' | 'client';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  project_manager: 'Project Manager',
  team_head: 'Team Head',
  specialist: 'Team Member',
  sales_manager: 'Sales',
  client: 'Client',
};

export interface User {
  id: number;
  username?: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  title: string;
  phone?: string;
  department_id?: number | null;
  is_active?: boolean;
}
export interface Project { id: number; name: string; slug: string; description: string; total_minutes: number; is_active: boolean }
export interface State { id: number; name: string; slug: string; sort_order: number }
export interface Module { id: number; name: string; slug: string }
export interface Department { id: number; name: string; slug: string }
export interface JobTitle { id: number; name: string }
export interface Label { id: number; name: string; key: string }
export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export interface Task {
  id: number;
  project: number;
  task_code: string;
  title: string;
  description: string;
  state: number;
  state_slug: string;
  priority: Priority;
  module: number;
  assignee: User | null;
  due_date: string | null;
  scheduled_date: string | null;
  cycle: number | null;
  department: number | null;
  board_position: number;
  total_minutes: number;
  created_at: string;
  updated_at: string;
}
export interface Comment { id: number; work_item: number; author: User; body: string; created_at: string }
export interface TimeLog { id: number; work_item: number; user: User; minutes: number; note: string; logged_at: string }
export interface Cycle { id: number; project: number; name: string; start_date: string; end_date: string }
export interface Notice { id: number; title: string; body: string; read: boolean; link: string; created_at: string }
export interface Activity { id: number; entity_type: string; entity_id: string; action: string; user: number | null; payload: { title?: string; task_code?: string; name?: string } | null; created_at: string }
export interface Analytics {
  totals: { all: number; completed_or_launched: number; pending: number; total_time_minutes: number };
  by_state: { state__slug: string; state__name: string; c: number }[];
  by_project: { project_id: number; project__name: string; c: number }[];
  assignee_workload: { assignee_id: number; assignee__first_name: string; assignee__last_name: string; open_tasks: number }[];
  historical_trend: { date: string; created: number; completed: number }[];
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
      } catch {
        tokens.clear();
        window.dispatchEvent(new Event('auth:logout'));
      }
    }
    return Promise.reject(error);
  },
);

/** Human-readable message from a DRF error response. */
export function errorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  const data = (err as AxiosError<Record<string, unknown>>)?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return fallback;
  if (typeof data.detail === 'string') return data.detail;
  const first = Object.entries(data)[0];
  if (!first) return fallback;
  const [key, val] = first;
  const text = Array.isArray(val) ? val.join(' ') : String(val);
  return key === 'non_field_errors' ? text : `${key}: ${text}`;
}

const list = <T,>(url: string, params?: object) => client.get<T[]>(url, { params }).then((r) => r.data);

export const api = {
  login: (email: string, password: string) =>
    axios.post(`${API_URL}/auth/login/`, { email, password }).then((r) => r.data as { access: string; refresh: string; user: User }),
  changePassword: (old_password: string, new_password: string) =>
    client.post('/auth/change-password/', { old_password, new_password }),

  me: () => client.get<User>('/users/me/').then((r) => r.data),
  updateMe: (data: Partial<User>) => client.patch<User>('/users/me/', data).then((r) => r.data),
  users: (params?: object) => list<User>('/users/', params),
  assignable: () => list<User>('/users/assignable/'),
  createUser: (data: object) => client.post('/auth/create-user/', data),
  updateUser: (id: number, data: object) => client.patch(`/users/${id}/`, data),
  deactivateUser: (id: number) => client.delete(`/users/${id}/`),

  projects: () => list<Project>('/projects/'),
  saveProject: (data: Partial<Project>, id?: number) =>
    id ? client.patch(`/projects/${id}/`, data) : client.post('/projects/', data),
  deleteProject: (id: number) => client.delete(`/projects/${id}/`),

  states: () => list<State>('/states/'),
  modules: () => list<Module>('/modules/'),
  departments: () => list<Department>('/departments/'),
  labels: () => list<Label>('/labels/'),

  jobTitles: () => list<JobTitle>('/job-titles/'),
  addJobTitle: (name: string) => client.post('/job-titles/', { name }),
  deleteJobTitle: (id: number) => client.delete(`/job-titles/${id}/`),

  tasks: (params?: object) => list<Task>('/work-items/', params),
  createTask: (data: object) => client.post<Task>('/work-items/', data).then((r) => r.data),
  updateTask: (id: number, data: object) => client.patch<Task>(`/work-items/${id}/`, data).then((r) => r.data),
  deleteTask: (id: number) => client.delete(`/work-items/${id}/`),
  reorder: (rows: { id: number; state: number; board_position: number }[]) => client.post('/work-items/reorder/', rows),

  comments: (taskId: number) => list<Comment>('/comments/', { work_item: taskId }),
  addComment: (work_item: number, body: string) => client.post('/comments/', { work_item, body }),
  deleteComment: (id: number) => client.delete(`/comments/${id}/`),

  timeLogs: (params?: object) => list<TimeLog>('/time-logs/', params),
  addTimeLog: (work_item: number, minutes: number, note: string) =>
    client.post('/time-logs/', { work_item, minutes, note, logged_at: new Date().toISOString() }),
  deleteTimeLog: (id: number) => client.delete(`/time-logs/${id}/`),

  cycles: () => list<Cycle>('/cycles/'),
  saveCycle: (data: object) => client.post('/cycles/', data),
  deleteCycle: (id: number) => client.delete(`/cycles/${id}/`),

  analytics: (params?: object) => client.get<Analytics>('/analytics/summary/', { params }).then((r) => r.data),
  activity: () => list<Activity>('/activity/'),
  notifications: () => list<Notice>('/notifications/'),
  markRead: (id: number) => client.post(`/notifications/${id}/mark-read/`),
};

export const fullName = (u?: Pick<User, 'first_name' | 'last_name' | 'email'> | null) =>
  u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email : 'Unassigned';

/** What each role may do - mirrors the backend rules in tms/access.py. */
export const can = {
  manage: (r?: Role) => r === 'admin' || r === 'project_manager',
  admin: (r?: Role) => r === 'admin',
  createTask: (r?: Role) => r === 'admin' || r === 'project_manager' || r === 'team_head',
  editTaskFully: (r?: Role) => r === 'admin' || r === 'project_manager' || r === 'team_head',
  moveTask: (r?: Role) => r !== 'sales_manager' && r !== undefined,
  write: (r?: Role) => r !== 'sales_manager' && r !== undefined,
};
