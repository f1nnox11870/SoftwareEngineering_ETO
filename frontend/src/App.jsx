import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import Home from './components/Home'
import Login from './components/login'
import Register from './components/Register'
import Profile from './components/Profile'
import Topup from './components/Topup'
import ProtectedRoute from './ProtectedRoute'
import Admin from './components/Admin';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/"       element={<Home />} />
          <Route path="/home"   element={<Home />} />
          <Route path="/topup"  element={<Topup />} />
          <Route path="/admin" element={<Admin />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </div>
    </Router>
  )
}

export default App