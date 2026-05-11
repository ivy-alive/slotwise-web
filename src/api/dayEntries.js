import client from './client'

export const createDayEntry = (data) => client.post('/day-entries', data)
export const getDayEntry = (date) => client.get(`/day-entries/${date}`)
export const schedule = (date) => client.post(`/day-entries/${date}/schedule`)
export const updateAllocation = (date, allocationId, data) =>
  client.put(`/day-entries/${date}/allocations/${allocationId}`, data)
export const addFreeSlot = (date, data) =>
  client.post(`/day-entries/${date}/free-slots`, data)
export const updateFreeSlot = (date, slotId, data) =>
  client.put(`/day-entries/${date}/free-slots/${slotId}`, data)
export const deleteFreeSlot = (date, slotId) =>
  client.delete(`/day-entries/${date}/free-slots/${slotId}`)
export const getSchedule = (date) => client.get(`/day-entries/${date}/schedule`)
export const callItADay = (date) => client.post(`/day-entries/${date}/call-it-a-day`)
export const deleteAllocationLog = (date, allocationId) =>
  client.delete(`/day-entries/${date}/allocations/${allocationId}/log`)
export const reopenDay = (date) => client.post(`/day-entries/${date}/reopen`)
