import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import TasksPage from './pages/TasksPage'
import SchedulePage from './pages/SchedulePage'
import StatsPage from './pages/StatsPage'

function App() {
  return (
    <>
      <BrowserRouter>
        <div className="flex h-screen">
          <nav className="w-48 bg-slate-900 text-white flex flex-col p-4 gap-2">
            <h1 className="text-xl font-bold mb-6">SlotWise</h1>
            <NavLink
              to="/"
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm ${isActive ? 'bg-slate-700' : 'hover:bg-slate-800'}`
              }
            >
              Tasks
            </NavLink>
            <NavLink
              to="/schedule"
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm ${isActive ? 'bg-slate-700' : 'hover:bg-slate-800'}`
              }
            >
              Schedule
            </NavLink>
            <NavLink
              to="/stats"
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm ${isActive ? 'bg-slate-700' : 'hover:bg-slate-800'}`
              }
            >
              Stats
            </NavLink>
          </nav>

          <main className="flex-1 overflow-auto p-8 bg-slate-50">
            <Routes>
              <Route path="/" element={<TasksPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/stats" element={<StatsPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
      <Toaster />
    </>
  )
}

export default App