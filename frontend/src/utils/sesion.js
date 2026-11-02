// Solo para mostrar el menú según el rol. La seguridad real está en el backend,
// que valida el token y el rol en cada pedido.
export const obtenerToken = () => localStorage.getItem("token");

export function rolActual() {
  const token = obtenerToken();
  if (!token) return null;
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64)).rol ?? null;
  } catch {
    return null;
  }
}
