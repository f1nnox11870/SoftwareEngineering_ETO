import React, { useEffect, useState } from "react";
import axios from "axios";

function Profile() {

  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [newUsername, setNewUsername] = useState("");

  const token = localStorage.getItem("token");

  // ================= LOAD PROFILE =================
  useEffect(() => {
    axios.get("${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/profile", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .then(res => {
      setUser(res.data);
      setNewUsername(res.data.username);
    });
  }, []);

  // ================= UPDATE USERNAME =================
  const updateUsername = () => {
    axios.put("${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/profile/username",
      { username: newUsername },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    ).then(() => {
      alert("Updated!");
      window.location.reload();
    });
  };

  // ================= IMAGE UPLOAD =================
  const handleImage = (e) => {
    const file = e.target.files[0];

    const reader = new FileReader();
    reader.onloadend = () => {
      uploadImage(reader.result);
    };

    reader.readAsDataURL(file);
  };

  const uploadImage = (img) => {
    axios.put("${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/profile/image",
      { image: img },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    ).then(() => {
      alert("Image updated!");
      window.location.reload();
    });
  };

  // ================= CHANGE PASSWORD =================
  const changePassword = () => {
    const oldPassword = document.getElementById("oldPass").value;
    const newPassword = document.getElementById("newPass").value;

    axios.put("${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/profile/password",
      { oldPassword, newPassword },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
    .then(() => alert("Password updated!"))
    .catch(() => alert("Wrong password"));
  };

  if (!user) return <h2>Loading...</h2>;

  return (
    <div style={{
      minHeight: "100vh",
      background: "white",
      padding: "40px",
      fontFamily: "Arial",
      color: "black"
    }}>

      <div style={{
        maxWidth: "900px",
        margin: "0 auto",
        background: "white"
      }}>

        <h2 style={{marginBottom:"20px"}}>Account Settings</h2>

        <div style={{
          display:"flex",
          borderTop:"1px solid #eee",
          paddingTop:"20px"
        }}>

          {/* LEFT SIDE */}
          <div style={{
            width:"200px",
            borderRight:"1px solid #eee",
            paddingRight:"20px"
          }}>

            <p style={{fontSize:"14px"}}>Profile</p>

            {user.image ? (
              <img 
                src={user.image} 
                style={{
                  width:"120px",
                  height:"120px",
                  borderRadius:"8px",
                  objectFit:"cover",
                  marginBottom:"10px"
                }}
              />
            ) : (
              <div style={{
                width:"120px",
                height:"120px",
                background:"#ddd",
                borderRadius:"8px",
                marginBottom:"10px"
              }}></div>
            )}

            <input type="file" onChange={handleImage} />

          </div>

          {/* RIGHT SIDE */}
          <div style={{flex:1, paddingLeft:"30px"}}>

            {/* USERNAME */}
            <div style={{
              display:"flex",
              justifyContent:"space-between",
              padding:"15px 0",
              borderBottom:"1px solid #eee"
            }}>

              <div>
                <p style={{color:"#888", fontSize:"14px"}}>Username</p>

                {editing ? (
                  <>
                    <input 
                      value={newUsername}
                      onChange={(e)=>setNewUsername(e.target.value)}
                    />
                    <button onClick={updateUsername}>Save</button>
                  </>
                ) : (
                  <p>{user.username}</p>
                )}

              </div>

              <button onClick={()=>setEditing(!editing)}>
                {editing ? "Cancel" : "Edit"}
              </button>

            </div>

            {/* EMAIL */}
            <div style={{
              display:"flex",
              justifyContent:"space-between",
              padding:"15px 0",
              borderBottom:"1px solid #eee"
            }}>
              <div>
                <p style={{color:"#888", fontSize:"14px"}}>Email</p>
                <p>{user.username}@gmail.com</p>
              </div>
            </div>

            {/* PASSWORD */}
            <div style={{marginTop:"30px"}}>

              <h3>Change Password</h3>

              <input 
                id="oldPass"
                placeholder="Old password"
                type="password"
                style={{display:"block", marginBottom:"10px"}}
              />

              <input 
                id="newPass"
                placeholder="New password"
                type="password"
                style={{display:"block", marginBottom:"10px"}}
              />

              <button onClick={changePassword}>
                Update Password
              </button>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Profile;

