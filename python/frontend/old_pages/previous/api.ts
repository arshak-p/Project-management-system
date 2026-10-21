import axios from 'axios';

export const API_URL = 'http://127.0.0.1:8000/api';

// Configure base axios instance with interceptors
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
        } catch (refreshError) {
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
  // Auth
  login: (email: string, password: string) =>
    axios.post(`${API_URL}/auth/login/`, { email, password }),

  // Users
  getMe: () => apiClient.get('/users/me/'),
  getUsers: (params?: object) => apiClient.get('/users/', { params }),
  getAssignableUsers: () => apiClient.get('/users/assignable/'),

  // Projects
  getProjects: (params?: object) => apiClient.get('/projects/', { params }),
  createProject: (data: object) => apiClient.post('/projects/', data),
  updateProject: (id: number, data: object) => apiClient.patch(`/projects/${id}/`, data),
  deleteProject: (id: number) => apiClient.delete(`/projects/${id}/`),

  // Tasks/WorkItems
  getTasks: (params?: object) => apiClient.get('/work-items/', { params }),
  getTask: (id: number) => apiClient.get(`/work-items/${id}/`),
  createTask: (data: object) => apiClient.post('/work-items/', data),
  updateTask: (id: number, data: object) => apiClient.patch(`/work-items/${id}/`, data),
  deleteTask: (id: number) => apiClient.delete(`/work-items/${id}/`),
  recordView: (id: number) => apiClient.post(`/work-items/${id}/record-view/`),

  // Comments
  getComments: (taskId: number) => apiClient.get(`/comments/?work_item=${taskId}`),
  createComment: (data: object) => apiClient.post('/comments/', data),

  // Attachments
  getAttachments: (taskId: number) => apiClient.get(`/attachments/?work_item=${taskId}`),
  createAttachment: (data: FormData) => apiClient.post('/attachments/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),

  // Time Logs
  getTimeLogs: (taskId: number) => apiClient.get(`/time-logs/?work_item=${taskId}`),
  createTimeLog: (data: object) => apiClient.post('/time-logs/', data),

  // States
  getStates: () => apiClient.get('/states/'),
  createState: (data: object) => apiClient.post('/states/', data),

  // Modules
  getModules: () => apiClient.get('/modules/'),

  // Departments
  getDepartments: () => apiClient.get('/departments/'),

  // Cycles (Sprints)
  getCycles: () => apiClient.get('/cycles/'),
  createCycle: (data: object) => apiClient.post('/cycles/', data),

  // Time Logs (All logs for reporting)
  getAllTimeLogs: () => apiClient.get('/time-logs/'),

  // Analytics
  getAnalytics: (params?: object) => apiClient.get('/analytics/summary/', { params }),

  // Activity
  getActivity: () => apiClient.get('/activity/'),

  // Notifications
  getNotifications: () => apiClient.get('/notifications/'),

  // Create user (admin only)
  createUser: (data: object) =>
    apiClient.post('/auth/create-user/', data),
  deleteUser: (id: number) =>
    apiClient.delete(`/users/${id}/`),
};
