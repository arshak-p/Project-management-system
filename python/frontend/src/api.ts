import axios from 'axios';

export const API_URL = 'http://127.0.0.1:8000/api';

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access_token')}`,
});

export const api = {
  // Auth
  login: (email: string, password: string) =>
    axios.post(`${API_URL.replace('/api', '')}/api/auth/login/`, { email, password }),

  // Users
  getMe: () => axios.get(`${API_URL}/users/me/`, { headers: getHeaders() }),
  getUsers: () => axios.get(`${API_URL}/users/`, { headers: getHeaders() }),
  getAssignableUsers: () => axios.get(`${API_URL}/users/assignable/`, { headers: getHeaders() }),

  // Projects
  getProjects: () => axios.get(`${API_URL}/projects/`, { headers: getHeaders() }),
  createProject: (data: object) => axios.post(`${API_URL}/projects/`, data, { headers: getHeaders() }),
  deleteProject: (id: number) => axios.delete(`${API_URL}/projects/${id}/`, { headers: getHeaders() }),

  // Tasks/WorkItems
  getTasks: () => axios.get(`${API_URL}/work-items/`, { headers: getHeaders() }),
  getTask: (id: number) => axios.get(`${API_URL}/work-items/${id}/`, { headers: getHeaders() }),
  createTask: (data: object) => axios.post(`${API_URL}/work-items/`, data, { headers: getHeaders() }),
  updateTask: (id: number, data: object) => axios.patch(`${API_URL}/work-items/${id}/`, data, { headers: getHeaders() }),
  deleteTask: (id: number) => axios.delete(`${API_URL}/work-items/${id}/`, { headers: getHeaders() }),

  // Comments
  getComments: (taskId: number) => axios.get(`${API_URL}/comments/?work_item=${taskId}`, { headers: getHeaders() }),
  createComment: (data: object) => axios.post(`${API_URL}/comments/`, data, { headers: getHeaders() }),

  // Attachments
  getAttachments: (taskId: number) => axios.get(`${API_URL}/attachments/?work_item=${taskId}`, { headers: getHeaders() }),
  createAttachment: (data: FormData) => axios.post(`${API_URL}/attachments/`, data, { headers: { ...getHeaders(), 'Content-Type': 'multipart/form-data' } }),

  // Time Logs
  getTimeLogs: (taskId: number) => axios.get(`${API_URL}/time-logs/?work_item=${taskId}`, { headers: getHeaders() }),
  createTimeLog: (data: object) => axios.post(`${API_URL}/time-logs/`, data, { headers: getHeaders() }),

  // States
  getStates: () => axios.get(`${API_URL}/states/`, { headers: getHeaders() }),
  createState: (data: object) => axios.post(`${API_URL}/states/`, data, { headers: getHeaders() }),

  // Modules
  getModules: () => axios.get(`${API_URL}/modules/`, { headers: getHeaders() }),

  // Departments
  getDepartments: () => axios.get(`${API_URL}/departments/`, { headers: getHeaders() }),

  // Cycles (Sprints)
  getCycles: () => axios.get(`${API_URL}/cycles/`, { headers: getHeaders() }),
  createCycle: (data: object) => axios.post(`${API_URL}/cycles/`, data, { headers: getHeaders() }),

  // Analytics
  getAnalytics: () => axios.get(`${API_URL}/analytics/summary/`, { headers: getHeaders() }),

  // Activity
  getActivity: () => axios.get(`${API_URL}/activity/`, { headers: getHeaders() }),

  // Notifications
  getNotifications: () => axios.get(`${API_URL}/notifications/`, { headers: getHeaders() }),

  // Create user (admin only)
  createUser: (data: object) =>
    axios.post(`${API_URL.replace('/api', '')}/api/auth/create-user/`, data, { headers: getHeaders() }),
  deleteUser: (id: number) =>
    axios.delete(`${API_URL}/users/${id}/`, { headers: getHeaders() }),
};

