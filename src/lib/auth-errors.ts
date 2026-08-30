import { FirebaseError } from "firebase/app";

/**
 * Traduce códigos de error de Firebase Auth a mensajes en español claros.
 * Sin esto, el usuario vería literalmente "Firebase: Error
 * (auth/user-not-found)." — inaceptable para una plataforma pensada para
 * personas sin conocimientos técnicos (requisito explícito del documento
 * de negocio).
 */
export function translateAuthError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/email-already-in-use":
        return "Ya existe una cuenta con este correo. Prueba a iniciar sesión.";
      case "auth/invalid-email":
        return "El correo electrónico no es válido.";
      case "auth/weak-password":
        return "La contraseña es demasiado débil. Usa al menos 6 caracteres.";
      case "auth/user-not-found":
      case "auth/invalid-credential":
      case "auth/wrong-password":
        return "Correo o contraseña incorrectos.";
      case "auth/too-many-requests":
        return "Demasiados intentos. Espera unos minutos y vuelve a probar.";
      case "auth/network-request-failed":
        return "Error de conexión. Comprueba tu internet e inténtalo de nuevo.";
      case "auth/popup-closed-by-user":
        return "Has cerrado la ventana antes de completar el inicio de sesión.";
      default:
        return "Ha ocurrido un error. Inténtalo de nuevo.";
    }
  }
  return err instanceof Error ? err.message : "Ha ocurrido un error. Inténtalo de nuevo.";
}
