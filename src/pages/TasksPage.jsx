import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  addDependency,
  removeDependency,
  getDependencies,
  getTasks,
  createStudyTask,
  createWorkoutTask,
  updateStudyTask,
  updateWorkoutTask,
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
const PRIORITY_COLORS = {
  HIGH: 'destructive',
  MEDIUM: 'default',
  LOW: 'secondary',
}
const PRIORITY_LABELS = { HIGH: 'Important', MEDIUM: 'Normal', LOW: 'Whenever' }

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

export default function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [studyForm, setStudyForm] = useState({
    title: '',
    priority: 'MEDIUM',
    totalMinutes: '',
    cycleType: 'NONE',
    cycleCount: '',
    preferredDay: '',
    preferredTime: '',
    dueDate: null,
    dependsOnIds: [],
  })
  const [workoutForm, setWorkoutForm] = useState({
    title: '',
    priority: 'MEDIUM',
    durationMinutes: '',
    scheduledDays: [],
  })
  const [editingTask, setEditingTask] = useState(null)
  const [editStudyForm, setEditStudyForm] = useState(null)
  const [editWorkoutForm, setEditWorkoutForm] = useState(null)

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    const res = await getTasks()
    setTasks(res.data)
  }

  const handleCreateStudy = async () => {
    if (!studyForm.title) return toast.error('Title is required')
    if (!studyForm.totalMinutes) return toast.error('Duration is required')
    try {
      await createStudyTask({
        ...studyForm,
        totalMinutes: Number(studyForm.totalMinutes),
        cycleCount: studyForm.cycleCount ? Number(studyForm.cycleCount) : null,
        preferredDay: studyForm.preferredDay || null,
        preferredTime: studyForm.preferredTime || null,
        dueDate: studyForm.dueDate || null,
        dependsOnIds: studyForm.dependsOnIds || [],
      })
      toast.success('Study task created')
      setStudyForm({
        title: '',
        priority: 'MEDIUM',
        totalMinutes: '',
        cycleType: 'NONE',
        cycleCount: '',
        preferredDay: '',
        preferredTime: '',
        dueDate: null,
        dependsOnIds: [],
      })
      fetchTasks()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong')
    }
  }

  const handleCreateWorkout = async () => {
    if (!workoutForm.title) return toast.error('Title is required')
    if (!workoutForm.durationMinutes) return toast.error('Duration is required')
    if (workoutForm.scheduledDays.length === 0)
      return toast.error('Select at least one day')
    try {
      await createWorkoutTask({
        ...workoutForm,
        durationMinutes: Number(workoutForm.durationMinutes),
      })
      toast.success('Workout task created')
      setWorkoutForm({
        title: '',
        priority: 'MEDIUM',
        durationMinutes: '',
        scheduledDays: [],
      })
      fetchTasks()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    try {
      await deleteTask(id)
      toast.success('Task deleted')
      fetchTasks()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong')
    }
  }

  const toggleDay = (day) => {
    setWorkoutForm((prev) => ({
      ...prev,
      scheduledDays: prev.scheduledDays.includes(day)
        ? prev.scheduledDays.filter((d) => d !== day)
        : [...prev.scheduledDays, day],
    }))
  }

  const toggleEditDay = (day) => {
    setEditWorkoutForm((prev) => ({
      ...prev,
      scheduledDays: prev.scheduledDays.includes(day)
        ? prev.scheduledDays.filter((d) => d !== day)
        : [...prev.scheduledDays, day],
    }))
  }

  const studyTasks = tasks.filter((t) => t.type === 'STUDY')
  const workoutTasks = tasks.filter((t) => t.type === 'WORKOUT')

  const handleEditStudy = async (task) => {
    setEditingTask(task.id)
    const deps = await getDependencies(task.id)
    setEditStudyForm({
      title: task.title,
      priority: task.priority,
      totalMinutes: task.totalMinutes,
      cycleType: task.cycleType || 'NONE',
      cycleCount: task.cycleCount || '',
      preferredDay: task.preferredDay || '',
      preferredTime: task.preferredTime?.slice(0, 5) || '',
      dueDate: task.dueDate || '',
      dependencies: deps.data,
    })
  }

  const handleEditWorkout = (task) => {
    setEditingTask(task.id)
    setEditWorkoutForm({
      title: task.title,
      priority: task.priority,
      durationMinutes: task.durationMinutes,
      scheduledDays: task.scheduledDays || [],
    })
  }

  const handleUpdateStudy = async (id) => {
    try {
      await updateStudyTask(id, {
        ...editStudyForm,
        totalMinutes: Number(editStudyForm.totalMinutes),
        cycleCount: editStudyForm.cycleCount
          ? Number(editStudyForm.cycleCount)
          : null,
        preferredDay: editStudyForm.preferredDay || null,
        preferredTime: editStudyForm.preferredTime || null,
        dueDate: editStudyForm.dueDate || null,
      })
      toast.success('Task updated')
      setEditingTask(null)
      fetchTasks()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong')
    }
  }

  const handleUpdateWorkout = async (id) => {
    try {
      await updateWorkoutTask(id, {
        ...editWorkoutForm,
        durationMinutes: Number(editWorkoutForm.durationMinutes),
      })
      toast.success('Task updated')
      setEditingTask(null)
      fetchTasks()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong')
    }
  }

  const handleAddDependency = async (taskId, dependsOnId) => {
    try {
      await addDependency(taskId, dependsOnId)
      toast.success('Dependency added')
      const deps = await getDependencies(taskId)
      setEditStudyForm((p) => ({ ...p, dependencies: deps.data }))
      fetchTasks()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong')
    }
  }

  const handleRemoveDependency = async (taskId, dependsOnId) => {
    try {
      await removeDependency(taskId, dependsOnId)
      toast.success('Dependency removed')
      const deps = await getDependencies(taskId)
      setEditStudyForm((p) => ({ ...p, dependencies: deps.data }))
      fetchTasks()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong')
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Tasks</h2>

      <Tabs defaultValue="study">
        <TabsList>
          <TabsTrigger value="study">Study</TabsTrigger>
          <TabsTrigger value="workout">Workout</TabsTrigger>
        </TabsList>

        {/* Study Tasks */}
        <TabsContent value="study" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>New Study Task</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input
                    value={studyForm.title}
                    onChange={(e) =>
                      setStudyForm((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Duration</Label>
                  <MinutesInput
                    value={studyForm.totalMinutes}
                    onChange={(v) =>
                      setStudyForm((p) => ({ ...p, totalMinutes: v }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Priority</Label>
                  <Select
                    value={studyForm.priority}
                    onValueChange={(v) =>
                      setStudyForm((p) => ({ ...p, priority: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HIGH">Important</SelectItem>
                      <SelectItem value="MEDIUM">Normal</SelectItem>
                      <SelectItem value="LOW">Whenever</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Cycle Type</Label>
                  <Select
                    value={studyForm.cycleType}
                    onValueChange={(v) =>
                      setStudyForm((p) => ({ ...p, cycleType: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {studyForm.cycleType !== 'NONE' && (
                  <div className="space-y-1">
                    <Label>Cycle Count</Label>
                    <Input
                      type="number"
                      value={studyForm.cycleCount}
                      onChange={(e) =>
                        setStudyForm((p) => ({
                          ...p,
                          cycleCount: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <Label>Preferred Day</Label>
                  <Select
                    value={studyForm.preferredDay}
                    onValueChange={(v) =>
                      setStudyForm((p) => ({ ...p, preferredDay: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {DAY_LABELS[d]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Preferred Time</Label>
                  <Input
                    type="time"
                    value={studyForm.preferredTime}
                    onChange={(e) =>
                      setStudyForm((p) => ({
                        ...p,
                        preferredTime: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>
                    Due Date{' '}
                    <span className="text-slate-400 text-xs">(optional)</span>
                  </Label>
                  <Input
                    type="date"
                    value={studyForm.dueDate || ''}
                    onChange={(e) =>
                      setStudyForm((p) => ({
                        ...p,
                        dueDate: e.target.value || null,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-1 col-span-2">
                <Label>
                  Depends On{' '}
                  <span className="text-slate-400 text-xs">(optional)</span>
                </Label>
                <div className="space-y-2">
                  {studyForm.dependsOnIds?.map((depId) => {
                    const depTask = studyTasks.find((t) => t.id === depId)
                    return depTask ? (
                      <div key={depId} className="flex items-center gap-2">
                        <span className="text-sm">{depTask.title}</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            setStudyForm((p) => ({
                              ...p,
                              dependsOnIds: p.dependsOnIds.filter(
                                (id) => id !== depId,
                              ),
                            }))
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    ) : null
                  })}
                  <Select
                    onValueChange={(v) => {
                      const id = Number(v)
                      if (!studyForm.dependsOnIds.includes(id)) {
                        setStudyForm((p) => ({
                          ...p,
                          dependsOnIds: [...p.dependsOnIds, id],
                        }))
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Add dependency..." />
                    </SelectTrigger>
                    <SelectContent>
                      {studyTasks
                        .filter((t) => !studyForm.dependsOnIds.includes(t.id))
                        .map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreateStudy}>Create</Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {studyTasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="py-4">
                  {editingTask === task.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Title</Label>
                          <Input
                            value={editStudyForm.title}
                            onChange={(e) =>
                              setEditStudyForm((p) => ({
                                ...p,
                                title: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Duration</Label>
                          <MinutesInput
                            value={editStudyForm.totalMinutes}
                            onChange={(v) =>
                              setEditStudyForm((p) => ({
                                ...p,
                                totalMinutes: v,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Priority</Label>
                          <Select
                            value={editStudyForm.priority}
                            onValueChange={(v) =>
                              setEditStudyForm((p) => ({ ...p, priority: v }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="HIGH">Important</SelectItem>
                              <SelectItem value="MEDIUM">Normal</SelectItem>
                              <SelectItem value="LOW">Whenever</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>Cycle Type</Label>
                          <Select
                            value={editStudyForm.cycleType}
                            onValueChange={(v) =>
                              setEditStudyForm((p) => ({ ...p, cycleType: v }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NONE">None</SelectItem>
                              <SelectItem value="WEEKLY">Weekly</SelectItem>
                              <SelectItem value="MONTHLY">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {editStudyForm.cycleType !== 'NONE' && (
                          <div className="space-y-1">
                            <Label>Cycle Count</Label>
                            <Input
                              type="number"
                              value={editStudyForm.cycleCount}
                              onChange={(e) =>
                                setEditStudyForm((p) => ({
                                  ...p,
                                  cycleCount: e.target.value,
                                }))
                              }
                            />
                          </div>
                        )}
                        <div className="space-y-1">
                          <Label>Preferred Day</Label>
                          <Select
                            value={editStudyForm.preferredDay}
                            onValueChange={(v) =>
                              setEditStudyForm((p) => ({
                                ...p,
                                preferredDay: v,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Optional" />
                            </SelectTrigger>
                            <SelectContent>
                              {DAYS.map((d) => (
                                <SelectItem key={d} value={d}>
                                  {DAY_LABELS[d]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>Preferred Time</Label>
                          <Input
                            type="time"
                            value={editStudyForm.preferredTime}
                            onChange={(e) =>
                              setEditStudyForm((p) => ({
                                ...p,
                                preferredTime: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>
                            Due Date{' '}
                            <span className="text-slate-400 text-xs">
                              (optional)
                            </span>
                          </Label>
                          <Input
                            type="date"
                            value={editStudyForm.dueDate || ''}
                            onChange={(e) =>
                              setEditStudyForm((p) => ({
                                ...p,
                                dueDate: e.target.value || null,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <Label>Depends On</Label>
                          <div className="space-y-2">
                            {editStudyForm.dependencies?.map((dep) => (
                              <div
                                key={dep.id}
                                className="flex items-center gap-2"
                              >
                                <span className="text-sm">{dep.title}</span>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    handleRemoveDependency(task.id, dep.id)
                                  }
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                            <Select
                              onValueChange={(v) =>
                                handleAddDependency(task.id, Number(v))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Add dependency..." />
                              </SelectTrigger>
                              <SelectContent>
                                {studyTasks
                                  .filter((t) => t.id !== task.id)
                                  .filter(
                                    (t) =>
                                      !editStudyForm.dependencies?.some(
                                        (d) => d.id === t.id,
                                      ),
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
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStudy(task.id)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingTask(null)}
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
                          {task.completed && (
                            <Badge variant="outline">Completed</Badge>
                          )}
                        </div>
                        <div className="text-sm text-slate-500">
                          Remaining {task.remainingMinutes} /{' '}
                          {task.totalMinutes} min
                          {task.cycleType !== 'NONE' &&
                            ` · ${task.cycleType === 'WEEKLY' ? 'Weekly' : 'Monthly'} ${task.cycleCount}x`}
                          {task.preferredDay &&
                            ` · Prefers ${DAY_LABELS[task.preferredDay]}`}
                          {task.dueDate && ` · Due ${task.dueDate}`}
                        </div>
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
                          onClick={() => handleEditStudy(task)}
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
            ))}
          </div>
        </TabsContent>

        {/* Workout Tasks */}
        <TabsContent value="workout" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>New Workout Task</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input
                    value={workoutForm.title}
                    onChange={(e) =>
                      setWorkoutForm((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Duration</Label>
                  <MinutesInput
                    value={workoutForm.durationMinutes}
                    onChange={(v) =>
                      setWorkoutForm((p) => ({ ...p, durationMinutes: v }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Priority</Label>
                  <Select
                    value={workoutForm.priority}
                    onValueChange={(v) =>
                      setWorkoutForm((p) => ({ ...p, priority: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HIGH">Important</SelectItem>
                      <SelectItem value="MEDIUM">Normal</SelectItem>
                      <SelectItem value="LOW">Whenever</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Scheduled Days</Label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((day) => (
                    <Button
                      key={day}
                      size="sm"
                      variant={
                        workoutForm.scheduledDays.includes(day)
                          ? 'default'
                          : 'outline'
                      }
                      onClick={() => toggleDay(day)}
                    >
                      {DAY_LABELS[day]}
                    </Button>
                  ))}
                </div>
              </div>
              <Button onClick={handleCreateWorkout}>Create</Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {workoutTasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="py-4">
                  {editingTask === task.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Title</Label>
                          <Input
                            value={editWorkoutForm.title}
                            onChange={(e) =>
                              setEditWorkoutForm((p) => ({
                                ...p,
                                title: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Duration</Label>
                          <MinutesInput
                            value={editWorkoutForm.durationMinutes}
                            onChange={(v) =>
                              setEditWorkoutForm((p) => ({
                                ...p,
                                durationMinutes: v,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Priority</Label>
                          <Select
                            value={editWorkoutForm.priority}
                            onValueChange={(v) =>
                              setEditWorkoutForm((p) => ({ ...p, priority: v }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="HIGH">Important</SelectItem>
                              <SelectItem value="MEDIUM">Normal</SelectItem>
                              <SelectItem value="LOW">Whenever</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label>Scheduled Days</Label>
                        <div className="flex gap-2 flex-wrap">
                          {DAYS.map((day) => (
                            <Button
                              key={day}
                              size="sm"
                              variant={
                                editWorkoutForm.scheduledDays.includes(day)
                                  ? 'default'
                                  : 'outline'
                              }
                              onClick={() => toggleEditDay(day)}
                            >
                              {DAY_LABELS[day]}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateWorkout(task.id)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingTask(null)}
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
                        </div>
                        <div className="text-sm text-slate-500">
                          {task.durationMinutes} min
                          {task.scheduledDays &&
                            ` · ${task.scheduledDays.map((d) => DAY_LABELS[d]).join(', ')}`}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditWorkout(task)}
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
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
