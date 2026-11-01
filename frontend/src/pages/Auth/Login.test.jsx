import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../api/authApi", () => ({ iniciarSesion: vi.fn() }));

import { iniciarSesion } from "../../api/authApi";
import Login from "./Login";

async function completarYEntrar(dni, clave) {
  await userEvent.type(screen.getByLabelText("DNI"), dni);
  await userEvent.type(screen.getByLabelText("Contraseña"), clave);
  await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("Inicio de sesión", () => {
  it("guarda la sesión y entra cuando las credenciales son correctas", async () => {
    iniciarSesion.mockResolvedValue({ token: "abc", rol: "paciente", nombre: "Ana Prueba" });
    const onLogin = vi.fn();
    render(<Login onLogin={onLogin} irARegistro={() => {}} volver={() => {}} />);

    await completarYEntrar("12345678", "clave12345");

    expect(iniciarSesion).toHaveBeenCalledWith({ identificador: "12345678", password: "clave12345" });
    expect(localStorage.getItem("token")).toBe("abc");
    expect(JSON.parse(localStorage.getItem("usuario"))).toEqual({ rol: "paciente", nombre: "Ana Prueba" });
    expect(onLogin).toHaveBeenCalled();
  });

  it("muestra el error del servidor y no guarda nada si las credenciales son incorrectas", async () => {
    iniciarSesion.mockRejectedValue({ response: { data: { error: "Credenciales inválidas" } } });
    const onLogin = vi.fn();
    render(<Login onLogin={onLogin} irARegistro={() => {}} volver={() => {}} />);

    await completarYEntrar("12345678", "incorrecta1");

    expect(await screen.findByRole("alert")).toHaveTextContent("Credenciales inválidas");
    expect(localStorage.getItem("token")).toBeNull();
    expect(onLogin).not.toHaveBeenCalled();
  });
});
