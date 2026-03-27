import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import Home from './components/Home'
import Login from './components/login'
import Register from './components/Register'
import Profile from './components/Profile'
import Topup from './components/Topup'
import ProtectedRoute from './ProtectedRoute'
<<<<<<< HEAD
import Favorites from './components/Favorites';
=======
import Admin from './components/Admin';
>>>>>>> 640f902c6a7bc8bcc26b2623f0cb7c2837db8899

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/"       element={<Home />} />
          <Route path="/home"   element={<Home />} />
          <Route path="/topup"  element={<Topup />} />
<<<<<<< HEAD
          <Route path="/favorites" element={<Favorites />} />

=======
          <Route path="/admin" element={<Admin />} />
>>>>>>> 640f902c6a7bc8bcc26b2623f0cb7c2837db8899
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </div>
    </Router>
  )
}

export default App