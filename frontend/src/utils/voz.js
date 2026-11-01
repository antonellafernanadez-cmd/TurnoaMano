// Voz del navegador: hablar (guía para el adulto mayor) y callar. No necesita instalar nada.
export const hayVozSintetica = () => typeof window !== "undefined" && "speechSynthesis" in window;

export function hablar(texto, alTerminar) {
  if (!hayVozSintetica()) {
    alTerminar?.();
    return;
  }
  window.speechSynthesis.cancel();
  const frase = new SpeechSynthesisUtterance(texto);
  frase.lang = "es-AR";
  frase.rate = 0.9; // un poco más lento, para que se entienda bien
  const voz = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("es"));
  if (voz) frase.voice = voz;

  let terminado = false;
  const fin = () => {
    if (!terminado) {
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
  if (hayVozSintetica()) window.speechSynthesis.cancel();
}
