import CryptoJS from 'crypto-js';

/**
 * SecManager: Réplica exacta del cifrado AES de C# (SecManager.cs)
 * Utiliza: AES-256-CBC, PBKDF2 (50 iteraciones), SHA512 para el pre-hash de la llave.
 */
const MASTER_PASSWORD = "8_Crm68yaEO5";
const SALT = CryptoJS.enc.Hex.parse('0102030405060708'); // Bytes {1,2,3,4,5,6,7,8}

export const decrypt = (encryptedText: string | null): string | null => {
  if (!encryptedText) return null;

  try {
    // 1. Pre-hash de la contraseña maestra con SHA512
    const passwordHash = CryptoJS.SHA512(MASTER_PASSWORD);
    
    // 2. Derivar llave e IV usando PBKDF2 (Rfc2898DeriveBytes en C#)
    // C# usa 50 iteraciones. Generamos 32 bytes para Key + 16 bytes para IV = 48 bytes totales.
    const derivedData = CryptoJS.PBKDF2(passwordHash, SALT, {
      keySize: (256 + 128) / 32, // en palabras (32 bits), total 48 bytes
      iterations: 50,
      hasher: CryptoJS.algo.SHA1 // Rfc2898DeriveBytes usa HMAC-SHA1 por defecto
    });

    const key = CryptoJS.lib.WordArray.create(derivedData.words.slice(0, 8)); // 256 bits
    const iv = CryptoJS.lib.WordArray.create(derivedData.words.slice(8, 12)); // 128 bits

    // 3. Descifrar AES-256-CBC
    const decrypted = CryptoJS.AES.decrypt(encryptedText, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Error al descifrar:", error);
    return null;
  }
};

export const encrypt = (plainText: string | null): string | null => {
    if (!plainText) return null;
  
    try {
      const passwordHash = CryptoJS.SHA512(MASTER_PASSWORD);
      
      const derivedData = CryptoJS.PBKDF2(passwordHash, SALT, {
        keySize: (256 + 128) / 32,
        iterations: 50,
        hasher: CryptoJS.algo.SHA1
      });
  
      const key = CryptoJS.lib.WordArray.create(derivedData.words.slice(0, 8));
      const iv = CryptoJS.lib.WordArray.create(derivedData.words.slice(8, 12));
  
      const encrypted = CryptoJS.AES.encrypt(plainText, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
  
      return encrypted.toString(); // Devuelve Base64 por defecto
    } catch (error) {
      console.error("Error al cifrar:", error);
      return null;
    }
  };
