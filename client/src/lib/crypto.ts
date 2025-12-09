export class CryptoService {
    static async generateKeys() {
        const key = await window.crypto.subtle.generateKey(
            { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
            true, ["encrypt", "decrypt"]
        );
        const pub = await window.crypto.subtle.exportKey("spki", key.publicKey);
        const priv = await window.crypto.subtle.exportKey("pkcs8", key.privateKey);
        return {
            pub: btoa(String.fromCharCode(...new Uint8Array(pub))),
            priv: btoa(String.fromCharCode(...new Uint8Array(priv)))
        };
    }

    static async encrypt(text: string, recipientPubPem: string) {
        try {
            const cleanKey = recipientPubPem
                .replace(/-----BEGIN.*?-----/g, '')
                .replace(/-----END.*?-----/g, '')
                .replace(/\s/g, '');

            const binaryDer = Uint8Array.from(atob(cleanKey), c => c.charCodeAt(0));
            const pubKey = await window.crypto.subtle.importKey("spki", binaryDer, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
            const enc = new TextEncoder();
            const encoded = enc.encode(text);
            const encrypted = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, pubKey, encoded);
            return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
        } catch (e) {
            console.error("Encryption failed", e);
            return null;
        }
    }

    static async decrypt(encryptedBase64: string, myPrivPem: string) {
        try {
            const cleanKey = myPrivPem
                .replace(/-----BEGIN.*?-----/g, '')
                .replace(/-----END.*?-----/g, '')
                .replace(/\s/g, '');

            const binaryDer = Uint8Array.from(atob(cleanKey), c => c.charCodeAt(0));
            const privKey = await window.crypto.subtle.importKey("pkcs8", binaryDer, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);
            const encryptedData = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
            const decrypted = await window.crypto.subtle.decrypt({ name: "RSA-OAEP" }, privKey, encryptedData);
            return new TextDecoder().decode(decrypted);
        } catch (e) {
            console.warn("Decryption failed", e);
            return "🔒 Undecryptable";
        }
    }
    static async symEncrypt(data: string, key: CryptoKey): Promise<string> {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const enc = new TextEncoder();
        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            enc.encode(data)
        );

        // Combine IV + Encrypted Data
        const buffer = new Uint8Array(iv.length + encrypted.byteLength);
        buffer.set(iv);
        buffer.set(new Uint8Array(encrypted), iv.length);

        let binary = '';
        const len = buffer.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(buffer[i]);
        }
        return btoa(binary);
    }

    static async symDecrypt(encryptedBase64: string, key: CryptoKey): Promise<string> {
        const binary = atob(encryptedBase64);
        const data = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            data[i] = binary.charCodeAt(i);
        }
        const iv = data.slice(0, 12);
        const ciphertext = data.slice(12);

        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            ciphertext
        );

        return new TextDecoder().decode(decrypted);
    }
}
