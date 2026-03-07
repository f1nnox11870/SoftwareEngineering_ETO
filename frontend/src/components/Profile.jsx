import React, { useEffect, useState } from "react";
import axios from "axios";
import sakura from "../assets/sakura.mp4";   // adjust path if needed

function Profile() {

  const [user, setUser] = useState(null);

  useEffect(() => {

    const token = localStorage.getItem("token");

    axios.get("http://localhost:3001/profile", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .then(res => {
      setUser(res.data);
    });

  }, []);

  if (!user) return <h2>Loading...</h2>;

  return (

    <div style={{
      position:"relative",
      height:"100vh",
      width:"100%",
      overflow:"hidden"
    }}>

      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        style={{
          position:"absolute",
          width:"100%",
          height:"100%",
          objectFit:"cover",
          zIndex:-1
        }}
      >
        <source src={sakura} type="video/mp4" />
      </video>

      {/* Profile Card */}
      <div style={{
        display:"flex",
        justifyContent:"center",
        alignItems:"center",
        height:"100%"
      }}>

        <div style={{
          width:"850px",
          background:"rgba(255,255,255,0.95)",
          padding:"40px",
          borderRadius:"12px",
          boxShadow:"0px 10px 30px rgba(0,0,0,0.3)",
          color:"black"
        }}>

          <h2 style={{marginBottom:"30px"}}>Account Settings</h2>

          <div style={{display:"flex", gap:"50px"}}>

            {/* Avatar */}
            <div style={{textAlign:"center"}}>

              <div style={{
                width:"120px",
                height:"120px",
                background:"#ddd",
                borderRadius:"10px"
              }}></div>

              <p style={{marginTop:"10px"}}>Profile Photo</p>

            </div>

            {/* Info */}
            <div style={{flex:1}}>

              {/* Username */}
              <div style={{
                display:"flex",
                justifyContent:"space-between",
                alignItems:"center",
                padding:"15px 0",
                borderBottom:"1px solid #eee"
              }}>

                <div>
                  <p style={{color:"#888", fontSize:"14px"}}>Username</p>
                  <p>{user.username}</p>
                </div>

                <button style={{
                  padding:"6px 16px",
                  border:"1px solid #ccc",
                  background:"white",
                  borderRadius:"6px",
                  cursor:"pointer"
                }}>
                  Edit
                </button>

              </div>

              {/* Email */}
              <div style={{
                display:"flex",
                justifyContent:"space-between",
                alignItems:"center",
                padding:"15px 0"
              }}>

                <div>
                  <p style={{color:"#888", fontSize:"14px"}}>Email</p>
                  <p>{user.username}@gmail.com</p>
                </div>

                <button style={{
                  padding:"6px 16px",
                  border:"1px solid #ccc",
                  background:"white",
                  borderRadius:"6px",
                  cursor:"pointer"
                }}>
                  Edit
                </button>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>

  );
}

export default Profile;