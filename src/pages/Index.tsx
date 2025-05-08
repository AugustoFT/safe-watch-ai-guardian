
import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";

// This is just a redirect component to the login page
const Index = () => {
  useEffect(() => {
    console.log("Index page accessed, redirecting to login...");
  }, []);

  return <Navigate to="/login" replace />;
};

export default Index;
