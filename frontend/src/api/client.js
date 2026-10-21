import axios from "axios";

// Misma idea que en farmacia: una instancia de Axios con la URL base y el token.
const client = axios.create({ baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api" });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // ajustar a como lo guarde el login de tu compañera
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;
