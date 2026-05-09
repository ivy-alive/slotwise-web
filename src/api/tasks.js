import client from './client'

export const getTasks = () => client.get('/tasks')
export const createStudyTask = (data) => client.post('/tasks/study', data)
export const createWorkoutTask = (data) => client.post('/tasks/workout', data)
export const updateStudyTask = (id, data) =>
  client.put(`/tasks/study/${id}`, data)
export const updateWorkoutTask = (id, data) =>
  client.put(`/tasks/workout/${id}`, data)
export const deleteTask = (id) => client.delete(`/tasks/${id}`)
export const addDependency = (taskId, dependsOnId) =>
  client.post(`/tasks/${taskId}/dependencies/${dependsOnId}`)
export const removeDependency = (taskId, dependsOnId) =>
  client.delete(`/tasks/${taskId}/dependencies/${dependsOnId}`)
export const getDependencies = (taskId) =>
  client.get(`/tasks/${taskId}/dependencies`)
