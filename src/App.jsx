import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './ui/Login'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import Fleet from './pages/Fleet'
import Profile from './pages/Profile'
import { getToken } from './api/client'

function ProtectedRoute({ children }) {
  return getToken() ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/hangars/:id" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
      <Route path="/fleet" element={<ProtectedRoute><Fleet /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
