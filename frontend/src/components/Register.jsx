import React, {useState} from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import registerVideo from '../assets/sakura.mp4'
import '../assets/style.css';
function Register() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [message, setMessage] = useState('')
    const navigate = useNavigate()

    const [isSignUpActive, setIsSignUpActive] = useState(true)

    const handleSubmit = async (e) => {
        e.preventDefault()

        try {
            const response = await axios.post('http://localhost:3001/register', { username, password })
            setMessage(response.data.message)
            navigate('/login') // เปลี่ยนเส้นทางไปยังหน้า login หลังจากลงทะเบียนสำเร็จ
        }   catch(error) {
            setMessage(error.response?.data?.message);
        }
    }
  return (
    
    <div className="auth-page">
          <video autoPlay muted loop className="bg-video">
            <source src={registerVideo} type="video/mp4" />
          </video>
    
          <div className="left-title">E-Book Library</div>
    
          <div className={`container ${isSignUpActive ? "right-panel-active" : ""}`} id="container">

      <div className="form-container sign-up">
          <form onSubmit={handleSubmit}>
            <h1>Create Account</h1>
            <div className="social-container">
              <a href="#" className="social"><i className="fab fa-google"></i></a>
              <a href="#" className="social"><i className="fab fa-github"></i></a>
            </div>
            <span>or use your username for registration</span>
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
            <button type="submit">Sign Up</button>
            
          </form>
          {message && <p>{message}</p>}
            <p>Already have an account? <Link to="/login">Sign In</Link></p>
        </div>
        
    </div>
    </div>
    )
};

export default Register
