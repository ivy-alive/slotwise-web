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
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const getMonday = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toLocaleDateString('en-CA')
}

const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('en-CA')
}

export default function SchedulePage() {
  const [date, setDate] = useState(today)
  const [existingSlots, setExistingSlots] = useState([])
  const [newSlots, setNewSlots] = useState([{ start: '', end: '' }])
  const [editingSlot, setEditingSlot] = useState(null)
  const [scheduleResult, setScheduleResult] = useState(null)
  const [actualInputs, setActualInputs] = useState({})
  const [logOpen, setLogOpen] = useState(null)
  const [loading, setLoading] = useState(false)
  const [weekUpdating, setWeekUpdating] = useState(false)
  const [hasEntry, setHasEntry] = useState(false)
  const [countryCode, setCountryCode] = useState('JP')
  const [holidays, setHolidays] = useState([])
  const [weekStart, setWeekStart] = useState(() => getMonday(today))
  const [weekData, setWeekData] = useState([])

  useEffect(() => {
    const year = new Date().getFullYear()
    getHolidays(year, countryCode).then(setHolidays)
  }, [countryCode])

  const loadWeek = async (monday) => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
    const results = await Promise.all(
      days.map((d) => getSchedule(d).catch(() => null)),
    )
    setWeekData(days.map((d, i) => ({ date: d, data: results[i]?.data ?? null })))
  }

  useEffect(() => {
    loadWeek(weekStart)
  }, [weekStart])

  const loadDay = async (d) => {
    try {
      const res = await getDayEntry(d)
      setExistingSlots(res.data.freeSlots)
      setHasEntry(true)
      try {
        const schedRes = await getSchedule(d)
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
      loadWeek(weekStart)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateWeek = async () => {
    setWeekUpdating(true)
    try {
      const days = weekData.filter(({ data }) => data !== null).map(({ date: d }) => d)
      await Promise.all(days.map((d) => schedule(d)))
      await loadWeek(weekStart)
      if (days.includes(date)) {
        const res = await getSchedule(date)
        setScheduleResult(res.data)
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong')
    } finally {
      setWeekUpdating(false)
    }
  }

  const openLog = (a) => {
    setLogOpen(a.allocationId)
    setActualInputs((prev) => ({
      ...prev,
      [a.allocationId]: {
        done: a.done ?? undefined,
        actualMinutes: a.actualMinutes || '',
        newRemaining: '',
        memo: a.memo || '',
      },
    }))
  }

  const handleUpdateActual = async (allocationId) => {
    const input = actualInputs[allocationId]
    if (input?.done === undefined)
      return toast.error('Please select Completed or Not Done')
    if (input?.actualMinutes === undefined || input?.actualMinutes === '')
      return toast.error('Please enter time used')

    try {
      await updateAllocation(date, allocationId, {
        done: input.done,
        actualMinutes: Number(input.actualMinutes),
        newRemaining: input.newRemaining !== '' ? Number(input.newRemaining) : null,
        memo: input.memo || null,
      })

      setLogOpen(null)
      toast.success('Logged')
      await loadDay(date)
      loadWeek(weekStart)
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
                  setWeekStart(getMonday(str))
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

        {/* Right: Week Overview + Day Detail */}
        <div className="flex-1 space-y-4">
          {/* Weekly Overview */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Week Overview</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setWeekStart(addDays(weekStart, -7))}
                    >
                      ‹
                    </Button>
                    <span className="text-xs text-slate-500 w-28 text-center">
                      {weekStart.slice(5)} – {addDays(weekStart, 6).slice(5)}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setWeekStart(addDays(weekStart, 7))}
                    >
                      ›
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleUpdateWeek}
                    disabled={weekUpdating}
                  >
                    {weekUpdating ? 'Updating...' : 'Update'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {weekData.map(({ date: d, data }, i) => (
                <div
                  key={d}
                  className={`rounded-md px-2 py-1.5 cursor-pointer transition-colors ${
                    d === date ? 'bg-slate-100' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    setDate(d)
                    setNewSlots([{ start: '', end: '' }])
                    setEditingSlot(null)
                    loadDay(d)
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold w-8 text-slate-600">
                      {WEEK_DAYS[i]}
                    </span>
                    <span className="text-xs text-slate-400">{d.slice(5)}</span>
                    {!data && (
                      <span className="text-xs text-slate-300 ml-auto">
                        no entry
                      </span>
                    )}
                  </div>
                  {data && data.allocations.length > 0 && (
                    <div className="mt-0.5 ml-10 space-y-0.5">
                      {data.allocations.map((a) => (
                        <div
                          key={a.allocationId}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span
                            className={
                              a.done ? 'text-green-500' : 'text-slate-300'
                            }
                          >
                            {a.done ? '✓' : '·'}
                          </span>
                          <span
                            className={
                              a.done
                                ? 'line-through text-slate-400'
                                : 'text-slate-700'
                            }
                          >
                            {a.taskTitle}
                          </span>
                          <span className="text-slate-400 ml-auto">
                            {a.plannedMinutes} min
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {data && data.allocations.length === 0 && (
                    <div className="mt-0.5 ml-10 text-xs text-slate-300">
                      no tasks
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Day Detail */}
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
                      {loading ? 'Updating...' : 'Update'}
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
                                a.taskType === 'ONE_TIME'
                                  ? 'secondary'
                                  : 'default'
                              }
                            >
                              {a.taskType === 'ONE_TIME' ? 'One-time' : 'Recurring'}
                            </Badge>
                            {a.ddl && (() => {
                              const days = Math.ceil((new Date(a.ddl + 'T00:00:00') - new Date(date + 'T00:00:00')) / 86400000)
                              const label = days < 0 ? `${-days}d overdue` : days === 0 ? 'Due today' : `${days}d left`
                              const color = days <= 0 ? 'text-red-500' : days <= 3 ? 'text-orange-500' : 'text-slate-400'
                              return <span className={`text-xs font-medium ${color}`}>{label}</span>
                            })()}
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

                        {/* Consumed progress + memo when form is closed */}
                        {logOpen !== a.allocationId && (
                          <div className="space-y-0.5">
                            {a.consumedMinutes > 0 && (
                              <p className="text-xs text-slate-400">
                                {a.consumedMinutes} / {a.totalMinutes} min consumed
                              </p>
                            )}
                            {a.memo && (
                              <p className="text-xs text-slate-400 truncate">
                                {a.memo}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Status button */}
                        {logOpen !== a.allocationId && (
                          a.done === true ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-500 text-green-600 hover:bg-green-50"
                              onClick={() => openLog(a)}
                            >
                              ✓ Done · {a.actualMinutes} min
                            </Button>
                          ) : a.done === false ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-slate-500"
                              onClick={() => openLog(a)}
                            >
                              Not Done · {a.actualMinutes} min
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openLog(a)}
                            >
                              Log
                            </Button>
                          )
                        )}

                        {/* Inline log form */}
                        {logOpen === a.allocationId && (
                          <div className="space-y-3 pt-2 border-t mt-1">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={actualInputs[a.allocationId]?.done === true ? 'default' : 'outline'}
                                onClick={() => setActualInputs((prev) => ({ ...prev, [a.allocationId]: { ...prev[a.allocationId], done: true } }))}
                              >
                                Completed
                              </Button>
                              <Button
                                size="sm"
                                variant={actualInputs[a.allocationId]?.done === false ? 'default' : 'outline'}
                                onClick={() => setActualInputs((prev) => ({ ...prev, [a.allocationId]: { ...prev[a.allocationId], done: false } }))}
                              >
                                Not Done
                              </Button>
                            </div>

                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder="Time used"
                                className="w-36"
                                value={actualInputs[a.allocationId]?.actualMinutes ?? ''}
                                onChange={(e) => setActualInputs((prev) => ({ ...prev, [a.allocationId]: { ...prev[a.allocationId], actualMinutes: e.target.value } }))}
                              />
                              <span className="text-sm text-slate-400">min used</span>
                            </div>

                            {actualInputs[a.allocationId]?.done === false && (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  placeholder="Time remaining"
                                  className="w-36"
                                  value={actualInputs[a.allocationId]?.newRemaining ?? ''}
                                  onChange={(e) => setActualInputs((prev) => ({ ...prev, [a.allocationId]: { ...prev[a.allocationId], newRemaining: e.target.value } }))}
                                />
                                <span className="text-sm text-slate-400">min remaining</span>
                              </div>
                            )}

                            <textarea
                              placeholder="Memo (optional)"
                              rows={2}
                              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                              value={actualInputs[a.allocationId]?.memo ?? ''}
                              onChange={(e) => setActualInputs((prev) => ({ ...prev, [a.allocationId]: { ...prev[a.allocationId], memo: e.target.value } }))}
                            />

                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleUpdateActual(a.allocationId)}>
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setLogOpen(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
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
