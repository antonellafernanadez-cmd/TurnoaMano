import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../api/turnosApi", () => ({
  disponibilidadTurnos: vi.fn(),
  especialidadPorVoz: vi.fn(),
  solicitarTurno: vi.fn(),
}));

// En las pruebas no hay voz del navegador: "hablar" avisa enseguida que terminó.
vi.mock("../../utils/voz", async () => {
  const real = await vi.importActual("../../utils/voz");
  return { ...real, hablar: vi.fn((_texto, alTerminar) => alTerminar?.()), callar: vi.fn() };
});

import { disponibilidadTurnos, especialidadPorVoz } from "../../api/turnosApi";
import { hablar } from "../../utils/voz";
import SolicitarTurno from "./SolicitarTurno";

// Micrófono falso: guarda la última instancia para "hablarle" desde la prueba.
let micro;
class MicrofonoFalso {
  constructor() {
    micro = this;
    this.detenido = false;
  }
  start() {}
  stop() { this.detenido = true; this.onend?.(); }
  abort() { this.detenido = true; this.onend?.(); }
  decir(texto) { this.onresult({ results: [[{ transcript: texto }]] }); }
}

const pantalla = () => render(<SolicitarTurno onVerTurnos={() => {}} onInicio={() => {}} />);
const avanzar = (ms) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

async function empezarPorVoz() {
  fireEvent.click(screen.getByRole("button", { name: /pedir por voz/i }));
  await avanzar(300); // se abre el micrófono después de la indicación hablada
}

beforeEach(() => {
  window.SpeechRecognition = MicrofonoFalso;
  disponibilidadTurnos.mockResolvedValue({
    dias: [{ fecha: "2026-11-03", horarios: [{ hora: "09:00", libre: true }] }],
  });
  especialidadPorVoz.mockResolvedValue({ especialidad: "cardiologia" });
});

afterEach(() => {
  vi.useRealTimers();
  delete window.SpeechRecognition;
  vi.clearAllMocks();
});

describe("Pedir turno a mano", () => {
  it("no deja avanzar hasta elegir una especialidad", async () => {
    pantalla();
    const siguiente = screen.getByRole("button", { name: /siguiente/i });
    expect(siguiente).toBeDisabled();

    await userEvent.click(screen.getByRole("radio", { name: /cardiolog/i }));
    expect(siguiente).toBeEnabled();

    await userEvent.click(siguiente);
    expect(disponibilidadTurnos).toHaveBeenCalledWith("cardiologia");
    expect(await screen.findByText(/elegí la fecha/i)).toBeInTheDocument();
  });
});

describe("Pedir turno por voz", () => {
  it("al decir 'listo' interpreta la frase sin la palabra de cierre", async () => {
    vi.useFakeTimers();
    pantalla();
    await empezarPorVoz();

    await act(async () => { micro.decir("quiero un turno con cardiología listo"); });
    await avanzar(0);

    expect(especialidadPorVoz).toHaveBeenCalledWith("quiero un turno con cardiología");
    expect(disponibilidadTurnos).toHaveBeenCalledWith("cardiologia");
  });

  it("una pausa corta no corta la frase: espera el silencio completo", async () => {
    vi.useFakeTimers();
    pantalla();
    await empezarPorVoz();

    await act(async () => { micro.decir("quiero"); });
    await avanzar(1500); // pausa para pensar, como hace una persona mayor
    expect(especialidadPorVoz).not.toHaveBeenCalled();
    expect(micro.detenido).toBe(false);

    await act(async () => { micro.decir("quiero un turno con cardiología"); });
    await avanzar(2500); // silencio: se da por terminada la frase
    expect(especialidadPorVoz).toHaveBeenCalledWith("quiero un turno con cardiología");
  });

  it("si no se dijo nada, no consulta al servidor y avisa", async () => {
    vi.useFakeTimers();
    pantalla();
    await empezarPorVoz();

    await act(async () => {
      micro.onerror({ error: "no-speech" });
      micro.onend();
    });

    expect(especialidadPorVoz).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(/no escuchamos nada/i);
  });

  it("la guía hablada no se lee mientras el micrófono se abre", async () => {
    vi.useFakeTimers();
    pantalla();
    await empezarPorVoz();

    // Solo se habla la indicación de "qué decir"; si se leyera también la guía del paso,
    // el micrófono escucharía a la propia app.
    expect(hablar).toHaveBeenCalledTimes(1);
  });
});
