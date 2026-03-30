import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import Home from './components/Home'
import Login from './components/login'
import Register from './components/Register'
import Profile from './components/Profile'
import Topup from './components/Topup'
import Cart from './components/cart'
import ProtectedRoute from './ProtectedRoute'
import Favorites from './components/Favorites';
import Admin from './components/Admin';
import History from './components/History'
import SettingProfile from './components/Settingprofile'
import Read from './components/Read'
import MyShelf from './components/myshelf'
import AdminTopup from './components/AdminTopup';

import Transaction from './components/Transaction';
function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/"       element={<Home />} />
          <Route path="/home"   element={<Home />} />
          <Route path="/topup"  element={<Topup />} />
          <Route path="/cart"   element={<Cart />} />
          <Route path="/history"   element={<History />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/read/:id" element={<Read />} />
          <Route path="/settingprofile" element={<SettingProfile />} />
          <Route path="myshelf" element={<MyShelf />} />
          <Route path="/admin-topup" element={<AdminTopup />} />
          <Route path="/transaction" element={<Transaction />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </div>
    </Router>
  )
}

export default App