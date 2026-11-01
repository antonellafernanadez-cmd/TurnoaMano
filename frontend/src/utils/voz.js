// Voz del navegador: hablar (guía para el adulto mayor), callar y entender las palabras de cierre.
// No necesita instalar nada.
export const hayVozSintetica = () => typeof window !== "undefined" && "speechSynthesis" in window;

// Cada frase nueva invalida a las anteriores: una frase que fue reemplazada o cortada
// nunca avisa que "terminó", así el micrófono no se abre mientras la app todavía habla.
let ultimaFrase = 0;

export function hablar(texto, alTerminar) {
  if (!hayVozSintetica()) {
    alTerminar?.();
    return;
  }
  const mia = ++ultimaFrase;
  window.speechSynthesis.cancel();
  const frase = new SpeechSynthesisUtterance(texto);
  frase.lang = "es-AR";
  frase.rate = 0.9; // un poco más lento, para que se entienda bien
  const voz = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("es"));
  if (voz) frase.voice = voz;

  let terminado = false;
  const fin = () => {
    if (!terminado && mia === ultimaFrase) {
      terminado = true;
      alTerminar?.();
    }
  };
  frase.onend = fin;
  frase.onerror = fin;
  // Algunos navegadores no avisan cuando terminan de hablar: este tiempo es la red de seguridad.
  setTimeout(fin, 2500 + texto.length * 90);
  window.speechSynthesis.speak(frase);
}

export function callar() {
  ultimaFrase += 1;
  if (hayVozSintetica()) window.speechSynthesis.cancel();
}

// Palabras con las que la persona avisa que terminó de hablar: "listo" o "siguiente".
const CIERRE = /(?:[\s,.;:!¡?¿]*\b(?:listo|siguiente)\b)+[\s,.;:!?]*$/i;

// ¿Lo que se dijo termina con una palabra de cierre?
export const terminaConComando = (texto) => CIERRE.test(texto.trim());

// Saca la palabra de cierre y los espacios de más: "quiero cardiología, listo" -> "quiero cardiología"
export const limpiarDicho = (texto) => texto.replace(CIERRE, "").replace(/\s+/g, " ").trim();
