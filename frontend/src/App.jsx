import { Routes, Route} from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import Fees from './pages/Fees'
import Notifications from './pages/Notifications'
import Photos from './pages/Photos'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminStudents from './pages/admin/AdminStudents'
import AdminAttendance from './pages/admin/AdminAttendance'
import StudentAttendance from './pages/StudentAttendance'
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard'
import SuperAdminStudents from './pages/superadmin/SuperAdminStudents'
import SuperAdminRoute from './components/SuperAdminRoute'
import SuperAdminFees from './pages/superadmin/SuperAdminFees'
import BranchSchedule from './pages/admin/BranchSchedule'
import StudentProfile from './pages/StudentProfile'
import SuperAdminBranches from './pages/superadmin/SuperAdminBranches'
import SuperAdminAdmins from './pages/superadmin/SuperAdminAdmins'
import BranchManagement from './pages/shared/BranchManagement'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/fees" element={<ProtectedRoute><Fees /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/photos" element={<ProtectedRoute><Photos /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><StudentProfile /></ProtectedRoute>} />
<Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute><AdminStudents /></ProtectedRoute>} />
      <Route path="/admin/attendance" element={<ProtectedRoute><AdminAttendance /></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute><StudentAttendance /></ProtectedRoute>} />
      <Route path="/admin/schedule" element={<ProtectedRoute><BranchSchedule /></ProtectedRoute>} />
      <Route path="/superadmin/dashboard" element={
        <SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>
      } />
      <Route path="/superadmin/students" element={
        <SuperAdminRoute><SuperAdminStudents /></SuperAdminRoute>
      } />
      <Route path="/superadmin/fees" element={
        <SuperAdminRoute><SuperAdminFees /></SuperAdminRoute>
      } />
      {/* <Route path="/superadmin/branches" element={<SuperAdminRoute><SuperAdminBranches /></SuperAdminRoute>} /> */}
      <Route path="/superadmin/admins" element={<SuperAdminRoute><SuperAdminAdmins /></SuperAdminRoute>} />
      <Route path="/superadmin/branches" element={<SuperAdminRoute><BranchManagement /></SuperAdminRoute>} />
      <Route path="/admin/branches" element={<ProtectedRoute><BranchManagement /></ProtectedRoute>} />

    </Routes>
  )
}

export default App