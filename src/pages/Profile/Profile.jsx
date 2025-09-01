// pages/Profile/Profile.jsx
import React from "react";
import RoadMap from "../../components/RoadMap"; 
import "./Profile.css";

export default function Profile() {
  return (
    <main className="Profile">
      <h1>My Roadmap</h1>
      <RoadMap />
    </main>
  );
}
