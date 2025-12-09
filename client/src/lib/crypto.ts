// client/src/lib/crypto.ts
import { MlKem1024 } from 'crystals-kyber-js';

// Helper to convert Uint8Array to Base64
const toBase64 = (arr: Uint8Array) => btoa(String.fromCharCode(...arr));
// Helper to convert Base64 to Uint8Array
const fromBase64 = (str: string) => Uint8Array.from(atob(str), c => c.charCodeAt(0));

export class CryptoService {
    // 1. Generate Quantum-Safe Keys (Kyber-1024)
    static async generateKeys() {
        // This generates a PQC Key Pair
        const recipient = new MlKem1024();
        const [pk, sk] = await recipient.generateKeyPair();

        return {
            pub: toBase64(pk),
            priv: toBase64(sk)
        };
    }

    // 2. Quantum-Safe Encryption (Hybrid: Kyber KEM + AES-256)
    static async encrypt(text: string, recipientPubBase64: string) {
        try {
            const recipientPK = fromBase64(recipientPubBase64);
            const sender = new MlKem1024();

            // A. Encapsulate: Generates a shared secret (ss) and its encapsulation (c)
            // This replaces RSA key exchange with Quantum-Safe Key Exchange
            const [ciphertext, sharedSecret] = await sender.encap(recipientPK);

            // B. Use the Quantum-Safe Shared Secret to encrypt the actual message (AES-GCM)
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const enc = new TextEncoder();

            // Import the Kyber shared secret as an AES key
            const aesKey = await window.crypto.subtle.importKey(
                "raw",
                new Uint8Array(sharedSecret) as any,
                { name: "AES-GCM" },
                false,
                ["encrypt"]
            );

            const encryptedMessage = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                aesKey,
                enc.encode(text)
            );

            // C. Package everything: Kyber Ciphertext (Key) + AES Ciphertext (Data) + IV
            const packageData = {
                kem: toBase64(ciphertext), // The quantum key capsule
                msg: toBase64(new Uint8Array(encryptedMessage)), // The message
                iv: toBase64(iv)
            };

            return JSON.stringify(packageData);

        } catch (e) {
            console.error("PQC Encryption failed", e);
            return null;
        }
    }

    // 3. Quantum-Safe Decryption
    static async decrypt(packageJson: string, myPrivBase64: string) {
        try {
            const pkg = JSON.parse(packageJson);
            const mySK = fromBase64(myPrivBase64);
            const recipient = new MlKem1024();

            // A. Decapsulate: Recover the shared secret using private key
            const sharedSecret = await recipient.decap(fromBase64(pkg.kem), mySK);

            // B. Derive the AES key from the recovered secret
            const aesKey = await window.crypto.subtle.importKey(
                "raw",
                new Uint8Array(sharedSecret) as any,
                { name: "AES-GCM" },
                false,
                ["decrypt"]
            );

            // C. Decrypt the message
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: fromBase64(pkg.iv) },
                aesKey,
                fromBase64(pkg.msg)
            );

            return new TextDecoder().decode(decryptedBuffer);
        } catch (e) {
            console.warn("PQC Decryption failed", e);
            return "🔒 Undecryptable (Quantum)";
        }
    }

    // Symmetric Fallback (for local storage/profile encryption) - remains AES
    static async symEncrypt(data: string, key: CryptoKey): Promise<string> {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const enc = new TextEncoder();
        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            enc.encode(data)
        );
        const buffer = new Uint8Array(iv.length + encrypted.byteLength);
        buffer.set(iv);
        buffer.set(new Uint8Array(encrypted), iv.length);
        return toBase64(buffer);
    }

    static async symDecrypt(encryptedBase64: string, key: CryptoKey): Promise<string> {
        const binary = fromBase64(encryptedBase64);
        const iv = binary.slice(0, 12);
        const ciphertext = binary.slice(12);
        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            ciphertext
        );
        return new TextDecoder().decode(decrypted);
    }
}
