import client from './client'

export const getTasks = () => client.get('/tasks')
export const createTask = (data) => client.post('/tasks', data)
export const updateTask = (id, data) => client.put(`/tasks/${id}`, data)
export const deleteTask = (id) => client.delete(`/tasks/${id}`)
export const addDependency = (taskId, dependsOnId) =>
  client.post(`/tasks/${taskId}/dependencies/${dependsOnId}`)
export const removeDependency = (taskId, dependsOnId) =>
  client.delete(`/tasks/${taskId}/dependencies/${dependsOnId}`)
export const getDependencies = (taskId) =>
  client.get(`/tasks/${taskId}/dependencies`)
export const updateTaskProgress = (id, data) =>
  client.put(`/tasks/${id}/progress`, data)
