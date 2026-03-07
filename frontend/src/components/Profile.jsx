import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Profile() {

  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {

    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    axios.get("http://localhost:3001/profile", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .then(res => {
      setUser(res.data);
    })
    .catch(() => {
      localStorage.removeItem("token");
      navigate("/login");
    });

  }, [navigate]);

  if (!user) return <h2>Loading...</h2>;

  return (
    <div style={{padding:"40px"}}>
      <h1>Profile Page</h1>

      <p><b>User ID:</b> {user.id}</p>
      <p><b>Username:</b> {user.username}</p>

      <button onClick={()=>{
        localStorage.removeItem("token")
        navigate("/login")
      }}>
        Logout
      </button>

    </div>
  );
}

export default Profile;