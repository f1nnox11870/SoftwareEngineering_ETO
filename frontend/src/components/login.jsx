import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import registerVideo from '../assets/sakura.mp4';
import '../assets/style.css';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:3001/login', { username, password });
            localStorage.setItem('token', response.data.token); // เก็บ Token
            setMessage(response.data.message);
            navigate('/home'); // ไปหน้า home เมื่อสำเร็จ
        } catch (error) {
            setMessage(error.response?.data?.message || "Login failed");
        }
    };

    return (
        <div className="auth-page">
            {/* Background Video */}
            <video autoPlay muted loop className="bg-video">
                <source src={registerVideo} type="video/mp4" />
            </video>

            {/* Left Title */}
            <div className="left-title">
                <span>E-Book</span>
                <br />
                Library
            </div>

            {/* Login Container */}
            <div className="login-container">
                <form onSubmit={handleSubmit} className="login-form">
                    <h1>Welcome Back</h1>
                    <p className="subtitle">Please enter your details to sign in</p>
                    
                    <div className="input-group">
                        <input 
                            type="text" 
                            placeholder="Username" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required 
                        />
                    </div>
                    
                    <div className="input-group">
                        <input 
                            type="password" 
                            placeholder="Password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required 
                        />
                    </div>

                    <button type="submit" className="login-btn">Log In</button>
                    
                    {message && <p className="status-message">{message}</p>}
                    
                    <div className="form-footer">
                        <p>Don't have an account? <Link to="/register">Register</Link></p>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Login;