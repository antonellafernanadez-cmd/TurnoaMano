import { describe, expect, it } from "vitest";
import { limpiarDicho, terminaConComando } from "./voz";

describe("palabras de cierre de la voz", () => {
  it("detecta cuando la persona termina diciendo 'listo' o 'siguiente'", () => {
    expect(terminaConComando("quiero un turno con cardiología listo")).toBe(true);
    expect(terminaConComando("quiero un turno con cardiología, siguiente.")).toBe(true);
    expect(terminaConComando("Listo")).toBe(true);
  });

  it("no confunde la palabra en medio de la frase ni una frase sin cierre", () => {
    expect(terminaConComando("quiero un turno con cardiología")).toBe(false);
    expect(terminaConComando("estoy listo para pedir el turno")).toBe(false);
  });

  it("saca la palabra de cierre y deja solo el pedido", () => {
    expect(limpiarDicho("quiero un turno con cardiología listo")).toBe("quiero un turno con cardiología");
    expect(limpiarDicho("quiero cardiología, listo siguiente.")).toBe("quiero cardiología");
    expect(limpiarDicho("  quiero   cardiología ")).toBe("quiero cardiología");
  });
});
