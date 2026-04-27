import axios from 'axios';
import { API_URL } from './config';
export { API_URL };

const apiClient = axios.create({
  baseURL: API_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id: number;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  role: string;
  title?: string;
  phone?: string;
  date_joined?: string;
  is_active?: boolean;
  is_superuser?: boolean;
  is_staff?: boolean;
}

export interface Project {
  id: number;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  total_minutes?: number;
  color: string;
}

export interface TaskState {
  id: number;
  name: string;
  slug: string;
  color: string;
  sort_order?: number;
}

export interface WorkModule {
  id: number;
  name: string;
  slug: string;
}

export interface Task {
  id: number;
  task_code: string;
  title: string;
  description: string;
  project: number;
  state: number;
  state_slug?: string;
  module: number;
  priority: string;
  due_date: string | null;
  scheduled_date: string | null;
  reference_link?: string;
  assignee: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
    title?: string;
  } | null;
  assignee_name?: string;
  project__slug?: string;
  state__name?: string;
  module_slug?: string;
  created_at: string;
  updated_at: string;
  created_by?: {
    id: number;
    email: string;
    first_name?: string;
  };
  is_active: boolean;
  is_client_approved?: boolean;
}

export interface Activity {
  id: number;
  entity_type: string;
  entity_id: string;
  action: string;
  user: {
    id: number;
    email: string;
    first_name?: string;
  } | null;
  project: number | null;
  project_name?: string;
  payload: unknown;
  created_at: string;
}

export interface StateDistribution {
  state__slug: string;
  state__name: string;
  c: number;
}

export interface AnalyticsSummary {
  totals: {
    all: number;
    completed_or_launched: number;
    pending: number;
    total_time_minutes: number;
  };
  by_state: StateDistribution[];
  by_module: unknown[];
  by_project: unknown[];
  assignee_workload: unknown[];
  historical_trend: {
    date: string;
    created: number;
    completed: number;
  }[];
}

export interface Notification {
  id: number;
  title: string;
  body: string;
  read: boolean;
  link: string;
  created_at: string;
}

export interface Cycle {
  id: number;
  project: number;
  name: string;
  start_date: string;
  end_date: string;
  is_recurring: boolean;
  is_active: boolean;
}

export interface TimeLog {
  id: number;
  work_item: number | null;
  user: {
    id: number;
    email: string;
    first_name?: string;
  } | null;
  minutes: number;
  note: string;
  logged_at: string;
  created_at: string;
}

export interface TaskComment {
  id: number;
  body: string;
  author: {
    id: number;
    email: string;
    first_name?: string;
  };
  created_at: string;
}

export interface WorkItemAttachment {
  id: number;
  file: string;
  file_name: string;
  size_bytes?: number;
  uploaded_by: {
    id: number;
    email: string;
    first_name?: string;
  };
  created_at: string;
}

export interface JobTitle {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });
          const newToken = response.data.access;
          localStorage.setItem('access_token', newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axios(originalRequest);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.reload();
        }
      }
    }
    return Promise.reject(error);
  }
);

export const api = {
  login: (email: string, password: string) =>
    axios.post(`${API_URL}/auth/login/`, { email, password }),
  getMe: () => apiClient.get('users/me/'),
  getUsers: (params?: object) => apiClient.get('users/', { params }),
  getAssignableUsers: () => apiClient.get('users/assignable/'),
  getProjects: (params?: object) => apiClient.get('projects/', { params }),
  createProject: (data: object) => apiClient.post('projects/', data),
  updateProject: (id: number, data: object) => apiClient.patch(`projects/${id}/`, data),
  deleteProject: (id: number) => apiClient.delete(`projects/${id}/`),
  getTasks: (params?: object) => apiClient.get('work-items/', { params }),
  getTask: (id: number) => apiClient.get(`work-items/${id}/`),
  createTask: (data: object) => apiClient.post('work-items/', data),
  updateTask: (id: number, data: object) => apiClient.patch(`work-items/${id}/`, data),
  deleteTask: (id: number) => apiClient.delete(`work-items/${id}/`),
  recordView: (id: number) => apiClient.post(`work-items/${id}/record-view/`),
  getComments: (taskId: number) => apiClient.get(`comments/?work_item=${taskId}`),
  createComment: (data: object) => apiClient.post('comments/', data),
  getAttachments: (taskId: number) => apiClient.get(`attachments/?work_item=${taskId}`),
  createAttachment: (data: FormData) => apiClient.post('attachments/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getTimeLogs: (taskId: number) => apiClient.get(`time-logs/?work_item=${taskId}`),
  createTimeLog: (data: object) => apiClient.post('time-logs/', data),
  getStates: () => apiClient.get('states/'),
  createState: (data: object) => apiClient.post('states/', data),
  getModules: () => apiClient.get('modules/'),
  createModule: (data: object) => apiClient.post('modules/', data),
  updateModule: (id: number, data: object) => apiClient.patch(`modules/${id}/`, data),
  deleteModule: (id: number) => apiClient.delete(`modules/${id}/`),
  getDepartments: () => apiClient.get('departments/'),
  getCycles: () => apiClient.get('cycles/'),
  createCycle: (data: object) => apiClient.post('cycles/', data),
  getAllTimeLogs: () => apiClient.get('time-logs/'),
  getAnalytics: (params?: object) => apiClient.get('analytics/summary/', { params }),
  getActivity: () => apiClient.get('activity/'),
  getNotifications: () => apiClient.get('notifications/'),
  markNotificationRead: (id: number) => apiClient.post(`notifications/${id}/mark-read/`),
  createUser: (data: object) =>
    apiClient.post('/auth/create-user/', data),
  updateUser: (id: number, data: object) =>
    apiClient.patch(`/users/${id}/`, data),
  deleteUser: (id: number) =>
    apiClient.delete(`/users/${id}/`),
  getJobTitles: () => apiClient.get('/job-titles/'),
  createJobTitle: (data: object) => apiClient.post('/job-titles/', data),
  updateJobTitle: (id: number, data: object) => apiClient.patch(`/job-titles/${id}/`, data),
  deleteJobTitle: (id: number) => apiClient.delete(`/job-titles/${id}/`),
  getBackups: () => apiClient.get('/backups/'),
  approveAndDownloadBackup: (id: number) => apiClient.post(`/backups/${id}/approve-and-download/`, {}, { responseType: 'blob' }),
};
