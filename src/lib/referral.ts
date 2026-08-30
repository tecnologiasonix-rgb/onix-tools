import { createHash } from "crypto";

/**
 * Genera el código de referido de un vendedor a partir de su uid de Firebase.
 *
 * Es DETERMINISTA (mismo uid → mismo código siempre) y no depende de un
 * contador central en Firestore, así que no hay riesgo de colisión entre
 * registros simultáneos de muchos usuarios nuevos — una preocupación real
 * en una plataforma pública donde el registro no está limitado en volumen.
 *
 * 8 caracteres en base32 (sin 0/O/1/I para evitar confusión visual) es
 * suficiente entropía para miles de vendedores sin colisión práctica, y es
 * lo bastante corto para que quepa cómodo en una URL de referido.
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // sin 0,O,1,I

export function generateReferralCode(uid: string): string {
  const hash = createHash("sha256").update(uid).digest();
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += ALPHABET[hash[i] % ALPHABET.length];
  }
  return code;
}
