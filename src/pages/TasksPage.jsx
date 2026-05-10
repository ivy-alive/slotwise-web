import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  addDependency,
  removeDependency,
  getDependencies,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from '../api/tasks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]
const DAY_LABELS = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
}
const PRIORITY_COLORS = { HIGH: 'destructive', LOW: 'secondary' }
const PRIORITY_LABELS = { HIGH: 'Must', LOW: 'Normal' }
const PRIORITY_ORDER = { HIGH: 0, LOW: 1 }

const getThisWeekRange = () => {
  const now = new Date()
  const day = now.getDay()
  const start = new Date(now)
  start.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start, end }
}

const getVisibleDoneSessions = (task) => {
  if (!task.doneSessions || task.doneSessions.length === 0) return []
  if (task.type === 'RECURRING' && task.cycleType) {
    const now = new Date()
    let start, end
    if (task.cycleType === 'WEEKLY') {
      ;({ start, end } = getThisWeekRange())
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }
    return task.doneSessions.filter((s) => {
      const d = new Date(s.date)
      return d >= start && d <= end
    })
  }
  return task.doneSessions
}

const parseMinutes = (input) => {
  if (!input) return ''
  const str = String(input).trim().toLowerCase()
  if (str.endsWith('h')) {
    const h = parseFloat(str)
    return isNaN(h) ? '' : Math.round(h * 60)
  }
  if (str.endsWith('min')) {
    const m = parseFloat(str)
    return isNaN(m) ? '' : Math.round(m)
  }
  const n = parseFloat(str)
  return isNaN(n) ? '' : Math.round(n)
}

function MinutesInput({ value, onChange }) {
  const [raw, setRaw] = useState(value ? String(value) + ' min' : '')

  const handleBlur = () => {
    const parsed = parseMinutes(raw)
    if (parsed !== '') {
      onChange(parsed)
      setRaw(parsed + ' min')
    }
  }

  return (
    <div>
      <input
        list="duration-options"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={handleBlur}
        placeholder="e.g. 1h, 90min"
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <datalist id="duration-options">
        <option value="30 min" />
        <option value="1h" />
        <option value="1.5h" />
        <option value="2h" />
        <option value="3h" />
      </datalist>
    </div>
  )
}

const emptyOneTimeForm = () => ({
  title: '',
  priority: 'LOW',
  totalMinutes: '',
  splittable: true,
  ddl: '',
  dependsOnIds: [],
})

const emptyRecurringForm = () => ({
  title: '',
  priority: 'LOW',
  totalMinutes: '',
  splittable: false,
  cycleType: 'WEEKLY',
  cycleCount: '',
  preferredDays: [],
  dependsOnIds: [],
})

function DayPicker({ selected, onChange }) {
  const toggle = (day) =>
    onChange(
      selected.includes(day)
        ? selected.filter((d) => d !== day)
        : [...selected, day],
    )
  return (
    <div className="flex gap-2 flex-wrap">
      {DAYS.map((day) => (
        <Button
          key={day}
          size="sm"
          variant={selected.includes(day) ? 'default' : 'outline'}
          onClick={() => toggle(day)}
          type="button"
        >
          {DAY_LABELS[day]}
        </Button>
      ))}
    </div>
  )
}

function TaskForm({ form, setForm, allTasks, onSubmit, submitLabel }) {
  const otherTasks = allTasks.filter(
    (t) => t.id !== form._editId && !form.dependsOnIds?.includes(t.id),
  )

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>
            Title <span className="text-red-500">*</span>
          </Label>
          <Input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label>
            Duration <span className="text-red-500">*</span>
          </Label>
          <MinutesInput
            value={form.totalMinutes}
            onChange={(v) => setForm((p) => ({ ...p, totalMinutes: v }))}
          />
        </div>
        <div className="space-y-1">
          <Label>Priority</Label>
          <Select
            value={form.priority}
            onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HIGH">Must</SelectItem>
              <SelectItem value="LOW">Normal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Splittable</Label>
          <Select
            value={String(form.splittable)}
            onValueChange={(v) =>
              setForm((p) => ({ ...p, splittable: v === 'true' }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes — can split across days</SelectItem>
              <SelectItem value="false">No — must fit in one block</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ONE_TIME only: DDL */}
        {form.type === 'ONE_TIME' && (
          <div className="space-y-1">
            <Label>
              Deadline{' '}
              <span className="text-slate-400 text-xs">(optional)</span>
            </Label>
            <Input
              type="date"
              value={form.ddl || ''}
              onChange={(e) =>
                setForm((p) => ({ ...p, ddl: e.target.value || null }))
              }
            />
          </div>
        )}

        {/* RECURRING only */}
        {form.type === 'RECURRING' && (
          <>
            <div className="space-y-1">
              <Label>Cycle</Label>
              <Select
                value={form.cycleType}
                onValueChange={(v) => setForm((p) => ({ ...p, cycleType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>
                Times per cycle <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="1"
                value={form.cycleCount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, cycleCount: e.target.value }))
                }
              />
            </div>
          </>
        )}
      </div>

      {/* RECURRING preferred days */}
      {form.type === 'RECURRING' && (
        <div className="space-y-1">
          <Label>
            Preferred Days{' '}
            <span className="text-slate-400 text-xs">(optional)</span>
          </Label>
          <DayPicker
            selected={form.preferredDays || []}
            onChange={(days) => setForm((p) => ({ ...p, preferredDays: days }))}
          />
        </div>
      )}

      {/* Dependencies */}
      <div className="space-y-1">
        <Label>
          Depends On <span className="text-slate-400 text-xs">(optional)</span>
        </Label>
        <div className="space-y-2">
          {form.dependsOnIds?.map((depId) => {
            const dep = allTasks.find((t) => t.id === depId)
            return dep ? (
              <div key={depId} className="flex items-center gap-2">
                <span className="text-sm">{dep.title}</span>
                <Button
                  size="sm"
                  variant="destructive"
                  type="button"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      dependsOnIds: p.dependsOnIds.filter((id) => id !== depId),
                    }))
                  }
                >
                  Remove
                </Button>
              </div>
            ) : null
          })}
          {otherTasks.length > 0 && (
            <Select
              onValueChange={(v) => {
                const id = Number(v)
                if (!form.dependsOnIds?.includes(id)) {
                  setForm((p) => ({
                    ...p,
                    dependsOnIds: [...(p.dependsOnIds || []), id],
                  }))
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add dependency..." />
              </SelectTrigger>
              <SelectContent>
                {otherTasks.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <Button onClick={onSubmit}>{submitLabel}</Button>
    </div>
  )
}

function SortBar({ sort, onSortClick }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-500">Sort by:</span>
      {[
        { field: 'name', label: 'Name' },
        { field: 'priority', label: 'Priority' },
        { field: 'status', label: 'Status' },
      ].map(({ field, label }) => (
        <Button
          key={field}
          size="sm"
          variant={sort.field === field ? 'default' : 'outline'}
          onClick={() => onSortClick(field)}
        >
          {label}
          {sort.field === field && (sort.dir === 'asc' ? ' ↑' : ' ↓')}
        </Button>
      ))}
    </div>
  )
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [oneTimeForm, setOneTimeForm] = useState({
    ...emptyOneTimeForm(),
    type: 'ONE_TIME',
  })
  const [recurringForm, setRecurringForm] = useState({
    ...emptyRecurringForm(),
    type: 'RECURRING',
  })
  const [editingTask, setEditingTask] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [sort, setSort] = useState({ field: 'name', dir: 'asc' })

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    const res = await getTasks()
    setTasks(res.data)
  }

  const handleCreate = async (form, resetFn) => {
    if (!form.title) return toast.error('Title is required')
    if (!form.totalMinutes) return toast.error('Duration is required')
    if (form.type === 'RECURRING' && !form.cycleCount)
      return toast.error('Times per cycle is required')
    try {
      await createTask({
        ...form,
        totalMinutes: Number(form.totalMinutes),
        cycleCount: form.cycleCount ? Number(form.cycleCount) : null,
        ddl: form.ddl || null,
        preferredDays: form.preferredDays || [],
        dependsOnIds: form.dependsOnIds || [],
      })
      toast.success('Task created')
      resetFn()
      fetchTasks()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong')
    }
  }

  const handleEdit = async (task) => {
    const deps = await getDependencies(task.id)
    setEditForm({
      _editId: task.id,
      type: task.type,
      title: task.title,
      priority: task.priority,
      totalMinutes: task.totalMinutes,
      splittable: task.splittable ?? (task.type === 'RECURRING' ? false : true),
      ddl: task.ddl || '',
      cycleType: task.cycleType || 'WEEKLY',
      cycleCount: task.cycleCount || '',
      preferredDays: task.preferredDays || [],
      dependsOnIds: deps.data.map((d) => d.id),
      _dependencies: deps.data,
    })
    setEditingTask(task.id)
  }

  const handleUpdate = async (id) => {
    try {
      await updateTask(id, {
        type: editForm.type,
        title: editForm.title,
        priority: editForm.priority,
        totalMinutes: Number(editForm.totalMinutes),
        splittable: editForm.splittable,
        ddl: editForm.ddl || null,
        cycleType: editForm.cycleType || null,
        cycleCount: editForm.cycleCount ? Number(editForm.cycleCount) : null,
        preferredDays: editForm.preferredDays || [],
        dependsOnIds: editForm.dependsOnIds || [],
      })
      toast.success('Task updated')
      setEditingTask(null)
      setEditForm(null)
      fetchTasks()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong')
    }
  }

  const handleAddDep = async (taskId, dependsOnId) => {
    try {
      await addDependency(taskId, dependsOnId)
      const deps = await getDependencies(taskId)
      setEditForm((p) => ({
        ...p,
        dependsOnIds: deps.data.map((d) => d.id),
        _dependencies: deps.data,
      }))
      fetchTasks()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong')
    }
  }

  const handleRemoveDep = async (taskId, dependsOnId) => {
    try {
      await removeDependency(taskId, dependsOnId)
      const deps = await getDependencies(taskId)
      setEditForm((p) => ({
        ...p,
        dependsOnIds: deps.data.map((d) => d.id),
        _dependencies: deps.data,
      }))
      fetchTasks()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return
    try {
      await deleteTask(id)
      toast.success('Task deleted')
      fetchTasks()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong')
    }
  }

  const handleSortClick = (field) =>
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'asc' },
    )

  const sortTasks = (list) =>
    [...list].sort((a, b) => {
      const d = sort.dir === 'asc' ? 1 : -1
      if (sort.field === 'name') return a.title.localeCompare(b.title) * d
      if (sort.field === 'priority') {
        const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        return (pd !== 0 ? pd : a.title.localeCompare(b.title)) * d
      }
      if (sort.field === 'status') {
        const sd = (a.completed ? 1 : 0) - (b.completed ? 1 : 0)
        if (sd !== 0) return sd * d
        const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        return pd !== 0 ? pd : a.title.localeCompare(b.title)
      }
      return 0
    })

  const oneTimeTasks = sortTasks(tasks.filter((t) => t.type === 'ONE_TIME'))
  const recurringTasks = sortTasks(tasks.filter((t) => t.type === 'RECURRING'))

  const renderTaskCard = (task) => {
    const sessions = getVisibleDoneSessions(task)
    const isEditing = editingTask === task.id

    return (
      <Card key={task.id}>
        <CardContent className="py-4">
          {isEditing && editForm ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>
                    Duration <span className="text-red-500">*</span>
                  </Label>
                  <MinutesInput
                    value={editForm.totalMinutes}
                    onChange={(v) =>
                      setEditForm((p) => ({ ...p, totalMinutes: v }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Priority</Label>
                  <Select
                    value={editForm.priority}
                    onValueChange={(v) =>
                      setEditForm((p) => ({ ...p, priority: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HIGH">Must</SelectItem>
                      <SelectItem value="LOW">Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Splittable</Label>
                  <Select
                    value={String(editForm.splittable)}
                    onValueChange={(v) =>
                      setEditForm((p) => ({ ...p, splittable: v === 'true' }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">
                        Yes — can split across days
                      </SelectItem>
                      <SelectItem value="false">
                        No — must fit in one block
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editForm.type === 'ONE_TIME' && (
                  <div className="space-y-1">
                    <Label>
                      Deadline{' '}
                      <span className="text-slate-400 text-xs">(optional)</span>
                    </Label>
                    <Input
                      type="date"
                      value={editForm.ddl || ''}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          ddl: e.target.value || null,
                        }))
                      }
                    />
                  </div>
                )}
                {editForm.type === 'RECURRING' && (
                  <>
                    <div className="space-y-1">
                      <Label>Cycle</Label>
                      <Select
                        value={editForm.cycleType}
                        onValueChange={(v) =>
                          setEditForm((p) => ({ ...p, cycleType: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WEEKLY">Weekly</SelectItem>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>
                        Times per cycle <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={editForm.cycleCount}
                        onChange={(e) =>
                          setEditForm((p) => ({
                            ...p,
                            cycleCount: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </>
                )}
              </div>
              {editForm.type === 'RECURRING' && (
                <div className="space-y-1">
                  <Label>
                    Preferred Days{' '}
                    <span className="text-slate-400 text-xs">(optional)</span>
                  </Label>
                  <DayPicker
                    selected={editForm.preferredDays || []}
                    onChange={(days) =>
                      setEditForm((p) => ({ ...p, preferredDays: days }))
                    }
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label>Depends On</Label>
                <div className="space-y-2">
                  {editForm._dependencies?.map((dep) => (
                    <div key={dep.id} className="flex items-center gap-2">
                      <span className="text-sm">{dep.title}</span>
                      <Button
                        size="sm"
                        variant="destructive"
                        type="button"
                        onClick={() => handleRemoveDep(task.id, dep.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Select
                    onValueChange={(v) => handleAddDep(task.id, Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Add dependency..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tasks
                        .filter((t) => t.id !== task.id)
                        .filter(
                          (t) =>
                            !editForm._dependencies?.some((d) => d.id === t.id),
                        )
                        .map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleUpdate(task.id)}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingTask(null)
                    setEditForm(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{task.title}</span>
                  <Badge variant={PRIORITY_COLORS[task.priority]}>
                    {PRIORITY_LABELS[task.priority]}
                  </Badge>
                  {task.completed && <Badge variant="outline">Completed</Badge>}
                </div>
                <div className="text-sm text-slate-500">
                  {task.type === 'ONE_TIME' ? (
                    task.completed ? (
                      <span className="text-green-600">
                        Completed on {task.completedDate}
                      </span>
                    ) : (
                      <>
                        {task.remainingMinutes} / {task.totalMinutes} min
                        remaining
                        {task.ddl && ` · Due ${task.ddl}`}
                        {!task.splittable && ' · must fit in one block'}
                      </>
                    )
                  ) : (
                    <>
                      {task.totalMinutes} min ·{' '}
                      {task.cycleType === 'WEEKLY' ? 'Weekly' : 'Monthly'}{' '}
                      {task.cycleCount}x
                      {task.preferredDays?.length > 0 &&
                        ` · ${task.preferredDays.map((d) => DAY_LABELS[d]).join(', ')}`}
                      {!task.splittable && ' · must fit in one block'}
                    </>
                  )}
                </div>
                {sessions.length > 0 && (
                  <div className="text-xs text-green-600 space-y-0.5 mt-0.5">
                    {sessions.map((s, i) => (
                      <div key={i}>
                        ✓ {s.date} — {s.actualMinutes} min
                      </div>
                    ))}
                  </div>
                )}
                {task.dependencies?.length > 0 && (
                  <div className="text-sm text-slate-400">
                    Depends on:{' '}
                    {task.dependencies.map((d) => d.title).join(', ')}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(task)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(task.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Tasks</h2>

      <Tabs defaultValue="one-time">
        <TabsList>
          <TabsTrigger value="one-time">One-time</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
        </TabsList>

        <TabsContent value="one-time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>New One-time Task</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskForm
                form={oneTimeForm}
                setForm={setOneTimeForm}
                allTasks={tasks}
                onSubmit={() =>
                  handleCreate(oneTimeForm, () =>
                    setOneTimeForm({ ...emptyOneTimeForm(), type: 'ONE_TIME' }),
                  )
                }
                submitLabel="Create"
              />
            </CardContent>
          </Card>
          <SortBar sort={sort} onSortClick={handleSortClick} />
          <div className="space-y-2">{oneTimeTasks.map(renderTaskCard)}</div>
        </TabsContent>

        <TabsContent value="recurring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>New Recurring Task</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskForm
                form={recurringForm}
                setForm={setRecurringForm}
                allTasks={tasks}
                onSubmit={() =>
                  handleCreate(recurringForm, () =>
                    setRecurringForm({
                      ...emptyRecurringForm(),
                      type: 'RECURRING',
                    }),
                  )
                }
                submitLabel="Create"
              />
            </CardContent>
          </Card>
          <SortBar sort={sort} onSortClick={handleSortClick} />
          <div className="space-y-2">{recurringTasks.map(renderTaskCard)}</div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
