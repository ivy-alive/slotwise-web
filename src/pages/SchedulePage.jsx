import { useState, useEffect } from 'react'
import {
  createDayEntry,
  schedule,
  updateAllocation,
  getDayEntry,
  addFreeSlot,
  updateFreeSlot,
  deleteFreeSlot,
  getSchedule,
} from '../api/dayEntries'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { getHolidays } from '../api/holidays'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const today = new Date().toISOString().split('T')[0]

export default function SchedulePage() {
  const [date, setDate] = useState(today)
  const [existingSlots, setExistingSlots] = useState([])
  const [newSlots, setNewSlots] = useState([{ start: '', end: '' }])
  const [editingSlot, setEditingSlot] = useState(null)
  const [scheduleResult, setScheduleResult] = useState(null)
  const [actualInputs, setActualInputs] = useState({})
  const [loading, setLoading] = useState(false)
  const [hasEntry, setHasEntry] = useState(false)
  const [countryCode, setCountryCode] = useState('JP')
  const [holidays, setHolidays] = useState([])

  useEffect(() => {
    const year = new Date().getFullYear()
    getHolidays(year, countryCode).then(setHolidays)
  }, [countryCode])

  const loadDay = async (d) => {
    try {
      const res = await getDayEntry(d)
      setExistingSlots(res.data.freeSlots)
      setHasEntry(true)
      try {
        const schedRes = await schedule(d)
        setScheduleResult(schedRes.data)
      } catch {
        setScheduleResult(null)
      }
    } catch {
      setExistingSlots([])
      setHasEntry(false)
      setScheduleResult(null)
    }
  }

  const handleDateChange = (e) => {
    setDate(e.target.value)
    setNewSlots([{ start: '', end: '' }])
    setEditingSlot(null)
    loadDay(e.target.value)
  }

  const addNewSlot = () =>
    setNewSlots((prev) => [...prev, { start: '', end: '' }])
  const removeNewSlot = (i) =>
    setNewSlots((prev) => prev.filter((_, idx) => idx !== i))
  const updateNewSlot = (i, field, value) => {
    setNewSlots((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)),
    )
  }

  const handleAddSlot = async () => {
    const slot = newSlots[0]
    if (!slot.start || !slot.end)
      return toast.error('Please fill in the time slot')
    try {
      if (!hasEntry) {
        await createDayEntry({ date, freeSlots: [slot] })
        setNewSlots([{ start: '', end: '' }])
        const res = await schedule(date)
        setScheduleResult(res.data)
        await loadDay(date)
      } else {
        await addFreeSlot(date, slot)
        setNewSlots([{ start: '', end: '' }])
        await loadDay(date)
        if (scheduleResult) {
          const res = await schedule(date)
          setScheduleResult(res.data)
        }
      }
      toast.success('Slot added')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong')
    }
  }

  const handleUpdateSlot = async (slotId) => {
    try {
      await updateFreeSlot(date, slotId, editingSlot)
      setEditingSlot(null)
      await loadDay(date)
      if (scheduleResult) {
        const res = await schedule(date)
        setScheduleResult(res.data)
      }
      toast.success('Slot updated')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong')
    }
  }

  const handleDeleteSlot = async (slotId) => {
    if (!confirm('Delete this slot?')) return
    try {
      await deleteFreeSlot(date, slotId)
      await loadDay(date)
      if (scheduleResult) {
        const res = await schedule(date)
        setScheduleResult(res.data)
      }
      toast.success('Slot deleted')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong')
    }
  }

  const handleSchedule = async () => {
    setLoading(true)
    try {
      const res = await schedule(date)
      setScheduleResult(res.data)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateActual = async (allocationId) => {
    const input = actualInputs[allocationId]
    if (input?.done === undefined)
      return toast.error('Please select Done or Not Done')
    if (input?.actualMinutes === undefined || input?.actualMinutes === '')
      return toast.error('Please enter actual minutes')

    try {
      const res = await updateAllocation(date, allocationId, {
        done: input.done,
        actualMinutes: input.actualMinutes,
        newRemaining: input.newRemaining ?? null,
      })

      if (res.data.shouldReschedule) {
        await schedule(date)
        await loadDay(date)
        toast.success('Logged and rescheduled')
      } else if (res.data.askReschedule) {
        toast.success(
          `Logged — you have ${res.data.minutesFreed} min freed. Click Regenerate to reschedule.`,
        )
      } else {
        toast.success('Logged')
        await loadDay(date)
      }

      setActualInputs((prev) => ({ ...prev, [allocationId]: {} }))
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong')
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Schedule</h2>

      <div className="flex gap-6 items-start">
        {/* Left Menu: Calendar + Free Slots */}
        <div className="space-y-4 w-80 shrink-0">
          <Card>
            <CardHeader>
              <CardTitle>Select Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 mb-2">
                <Label>Region</Label>
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JP">🇯🇵 Japan (UTC+9)</SelectItem>
                    <SelectItem value="US">🇺🇸 United States (UTC-5)</SelectItem>
                    <SelectItem value="GB">
                      🇬🇧 United Kingdom (UTC+0)
                    </SelectItem>
                    <SelectItem value="CN">🇨🇳 China (UTC+8)</SelectItem>
                    <SelectItem value="KR">🇰🇷 South Korea (UTC+9)</SelectItem>
                    <SelectItem value="AU">🇦🇺 Australia (UTC+10)</SelectItem>
                    <SelectItem value="DE">🇩🇪 Germany (UTC+1)</SelectItem>
                    <SelectItem value="FR">🇫🇷 France (UTC+1)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Calendar
                mode="single"
                className="w-full"
                selected={date ? new Date(date + 'T00:00:00') : undefined}
                modifiers={{
                  holiday: holidays,
                  weekend: (day) => day.getDay() === 0 || day.getDay() === 6,
                }}
                modifiersClassNames={{
                  holiday: 'text-red-500 font-semibold',
                  weekend: 'text-red-400',
                }}
                onSelect={(d) => {
                  if (!d) return
                  const str = d.toLocaleDateString('en-CA')
                  setDate(str)
                  setNewSlots([{ start: '', end: '' }])
                  setEditingSlot(null)
                  loadDay(str)
                }}
                formatters={{
                  formatWeekdayName: (day) =>
                    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
                      day.getDay()
                    ],
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Free Slots — {date}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing slots */}
              {existingSlots.length > 0 && (
                <div className="space-y-2">
                  {existingSlots.map((slot) => (
                    <div key={slot.id} className="flex items-center gap-2">
                      {editingSlot?.id === slot.id ? (
                        <>
                          <Input
                            type="time"
                            value={editingSlot.start}
                            onChange={(e) =>
                              setEditingSlot((p) => ({
                                ...p,
                                start: e.target.value,
                              }))
                            }
                          />
                          <span className="text-slate-400">to</span>
                          <Input
                            type="time"
                            value={editingSlot.end}
                            onChange={(e) =>
                              setEditingSlot((p) => ({
                                ...p,
                                end: e.target.value,
                              }))
                            }
                          />
                          <Button
                            size="sm"
                            onClick={() => handleUpdateSlot(slot.id)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingSlot(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-medium w-32">
                            {slot.start.slice(0, 5)} – {slot.end.slice(0, 5)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setEditingSlot({
                                id: slot.id,
                                start: slot.start.slice(0, 5),
                                end: slot.end.slice(0, 5),
                              })
                            }
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteSlot(slot.id)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add new slot */}
              <div className="space-y-2">
                <Label>Add Slot</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={newSlots[0].start}
                    onChange={(e) => updateNewSlot(0, 'start', e.target.value)}
                  />
                  <span className="text-slate-400">to</span>
                  <Input
                    type="time"
                    value={newSlots[0].end}
                    onChange={(e) => updateNewSlot(0, 'end', e.target.value)}
                  />
                  <Button size="sm" onClick={handleAddSlot}>
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Schedule Results */}
        <div className="flex-1 space-y-4">
          {scheduleResult ? (
            <>
              {scheduleResult.conflicts.length > 0 && (
                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-600">Conflicts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {scheduleResult.conflicts.map((c) => (
                      <div
                        key={c.allocationId}
                        className="text-sm text-red-600"
                      >
                        <span className="font-medium">{c.taskTitle}</span> —{' '}
                        {c.reason}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Plan for {date}</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSchedule}
                      disabled={loading}
                    >
                      {loading ? 'Regenerating...' : 'Regenerate'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {scheduleResult.allocations.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      No tasks scheduled for this day.
                    </p>
                  ) : (
                    scheduleResult.allocations.map((a) => (
                      <div
                        key={a.allocationId}
                        className="border rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{a.taskTitle}</span>
                            <Badge
                              variant={
                                a.taskType === 'WORKOUT'
                                  ? 'secondary'
                                  : 'default'
                              }
                            >
                              {a.taskType}
                            </Badge>
                          </div>
                          <span className="text-sm text-slate-500">
                            {a.plannedMinutes} min planned
                          </span>
                        </div>

                        <div className="text-sm text-slate-500 space-y-1">
                          {a.slots.map((s, i) => (
                            <div key={i}>
                              {s.start.slice(0, 5)} – {s.end.slice(0, 5)} (
                              {s.minutes} min)
                            </div>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={
                                actualInputs[a.allocationId]?.done === true
                                  ? 'default'
                                  : 'outline'
                              }
                              onClick={() =>
                                setActualInputs((prev) => ({
                                  ...prev,
                                  [a.allocationId]: {
                                    ...prev[a.allocationId],
                                    done: true,
                                  },
                                }))
                              }
                            >
                              Done
                            </Button>
                            <Button
                              size="sm"
                              variant={
                                actualInputs[a.allocationId]?.done === false
                                  ? 'default'
                                  : 'outline'
                              }
                              onClick={() =>
                                setActualInputs((prev) => ({
                                  ...prev,
                                  [a.allocationId]: {
                                    ...prev[a.allocationId],
                                    done: false,
                                    newRemaining:
                                      a.taskType === 'STUDY'
                                        ? Math.max(
                                            (a.plannedMinutes || 0) -
                                              (prev[a.allocationId]
                                                ?.actualMinutes || 0),
                                            0,
                                          )
                                        : null,
                                  },
                                }))
                              }
                            >
                              Not Done
                            </Button>
                          </div>

                          {actualInputs[a.allocationId]?.done !== undefined && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  placeholder="Actual minutes"
                                  className="w-40"
                                  value={
                                    actualInputs[a.allocationId]
                                      ?.actualMinutes ?? ''
                                  }
                                  onChange={(e) => {
                                    const actual = Number(e.target.value)
                                    setActualInputs((prev) => ({
                                      ...prev,
                                      [a.allocationId]: {
                                        ...prev[a.allocationId],
                                        actualMinutes: actual,
                                        newRemaining:
                                          prev[a.allocationId]?.done === false
                                            ? Math.max(
                                                (a.plannedMinutes || 0) -
                                                  actual,
                                                0,
                                              )
                                            : prev[a.allocationId]
                                                ?.newRemaining,
                                      },
                                    }))
                                  }}
                                />
                                <span className="text-sm text-slate-400">
                                  min used
                                </span>
                              </div>

                              {actualInputs[a.allocationId]?.done === false && (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    placeholder="New remaining"
                                    className="w-40"
                                    value={
                                      actualInputs[a.allocationId]
                                        ?.newRemaining ?? ''
                                    }
                                    onChange={(e) =>
                                      setActualInputs((prev) => ({
                                        ...prev,
                                        [a.allocationId]: {
                                          ...prev[a.allocationId],
                                          newRemaining: Number(e.target.value),
                                        },
                                      }))
                                    }
                                  />
                                  <span className="text-sm text-slate-400">
                                    min remaining
                                  </span>
                                </div>
                              )}

                              <Button
                                size="sm"
                                onClick={() =>
                                  handleUpdateActual(a.allocationId)
                                }
                              >
                                Log
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          ) : hasEntry ? (
            <Card>
              <CardContent className="py-8 text-center text-slate-400">
                <p>No schedule yet for {date}.</p>
                <p className="text-sm mt-1">
                  Your free slots are set. Click Regenerate to generate a
                  schedule.
                </p>
                <Button
                  className="mt-4"
                  onClick={handleSchedule}
                  disabled={loading}
                >
                  {loading ? 'Generating...' : 'Generate Schedule'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-slate-400">
                <p>No entry for {date}.</p>
                <p className="text-sm mt-1">
                  Add your free slots on the left to get started.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
