import axios from "axios";

// Una instancia de Axios con la URL base del backend y el token en cada pedido.
const client = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api" });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // ajustar a como lo guarde el login de tu compañera
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;
