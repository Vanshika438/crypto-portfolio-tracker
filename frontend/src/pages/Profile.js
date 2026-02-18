import { useAuth } from "../context/AuthContext";

const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="profile-container">
      <h2>My Profile</h2>
      <h3>Name:</h3>
      <p>{user.name}</p>
      <h3>Email:</h3>
      <p>{user.email}</p>
    </div>
  );
};

export default Profile;
