import { useState } from 'react'
import client from '../api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const DAY_LABELS = {
  MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed',
  THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun'
}

export default function StatsPage() {
  const [week, setWeek] = useState('')
  const [month, setMonth] = useState('')
  const [weeklyStats, setWeeklyStats] = useState(null)
  const [monthlyStats, setMonthlyStats] = useState(null)

  const fetchWeekly = async () => {
    const res = await client.get(`/stats/workout/weekly?week=${week}`)
    setWeeklyStats(res.data)
  }

  const fetchMonthly = async () => {
    const res = await client.get(`/stats/workout/monthly?month=${month}`)
    setMonthlyStats(res.data)
  }

  const renderStats = (stats) => (
    <div className="space-y-3">
      {stats.workoutStats.map(task => (
        <Card key={task.taskId}>
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{task.title}</span>
                <div className="flex gap-1">
                  {task.scheduledDays.map(d => (
                    <Badge key={d} variant="outline">{DAY_LABELS[d]}</Badge>
                  ))}
                </div>
              </div>
              <div className="text-sm text-slate-500">
                {task.actualCount} / {task.plannedCount} completed
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {task.allocations.map((a, i) => (
                <div key={i} className={`text-xs px-2 py-1 rounded-full border ${
                  a.done ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  {a.date} {a.done ? '✓' : '–'}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Stats</h2>

      <Tabs defaultValue="weekly">
        <TabsList>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-end gap-3">
                <div className="space-y-1">
                  <Label>Week (e.g. 2026-W18)</Label>
                  <Input value={week} onChange={e => setWeek(e.target.value)} placeholder="2026-W18" />
                </div>
                <Button onClick={fetchWeekly}>View</Button>
              </div>
            </CardContent>
          </Card>
          {weeklyStats && renderStats(weeklyStats)}
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-end gap-3">
                <div className="space-y-1">
                  <Label>Month (e.g. 2026-05)</Label>
                  <Input value={month} onChange={e => setMonth(e.target.value)} placeholder="2026-05" />
                </div>
                <Button onClick={fetchMonthly}>View</Button>
              </div>
            </CardContent>
          </Card>
          {monthlyStats && renderStats(monthlyStats)}
        </TabsContent>
      </Tabs>
    </div>
  )
}