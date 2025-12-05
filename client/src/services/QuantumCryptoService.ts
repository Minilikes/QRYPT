// This service handles all cryptographic operations.
// In a real production environment, this would use WASM bindings for CRYSTALS-Kyber and CRYSTALS-Dilithium.
// For this prototype, we will simulate the PQC flow using standard Web Crypto API where possible, 
// or mock the specific PQC parts if libraries are unavailable/complex to setup in this environment.

// We will try to use the installed libraries if they work, otherwise fallback to simulation for the UI flow.

export interface KeyPair {
    publicKey: string;
    privateKey: string;
}

export class QuantumCryptoService {

    // Generate Kyber-1024 Key Pair
    static async generateKyberKeyPair(): Promise<KeyPair> {
        // Simulation: In real app, use Kyber1024.generateKeyPair()
        console.log("Generating Kyber-1024 Key Pair...");
        const key = await window.crypto.subtle.generateKey(
            { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
            true,
            ["encrypt", "decrypt"]
        );
        const pub = await window.crypto.subtle.exportKey("spki", key.publicKey);
        const priv = await window.crypto.subtle.exportKey("pkcs8", key.privateKey);
        return {
            publicKey: btoa(String.fromCharCode(...new Uint8Array(pub))),
            privateKey: btoa(String.fromCharCode(...new Uint8Array(priv)))
        };
    }

    // Generate Dilithium-5 Key Pair
    static async generateDilithiumKeyPair(): Promise<KeyPair> {
        // Simulation: In real app, use Dilithium5.generateKeyPair()
        console.log("Generating Dilithium-5 Key Pair...");
        const key = await window.crypto.subtle.generateKey(
            { name: "ECDSA", namedCurve: "P-384" },
            true,
            ["sign", "verify"]
        );
        const pub = await window.crypto.subtle.exportKey("spki", key.publicKey);
        const priv = await window.crypto.subtle.exportKey("pkcs8", key.privateKey);
        return {
            publicKey: btoa(String.fromCharCode(...new Uint8Array(pub))),
            privateKey: btoa(String.fromCharCode(...new Uint8Array(priv)))
        };
    }

    // Encapsulate (Kyber): Generate Shared Secret + Ciphertext using Recipient's Public Key
    static async encapsulate(recipientPublicKeyBase64: string): Promise<{ sharedSecret: CryptoKey, ciphertext: string }> {
        // Simulation: Encrypt a random seed with RSA (simulating Kyber Encapsulation)
        console.log("Encapsulating Shared Secret...");
        const seed = window.crypto.getRandomValues(new Uint8Array(32));
        const sharedSecret = await window.crypto.subtle.importKey(
            "raw", seed, "AES-GCM", true, ["encrypt", "decrypt"]
        );

        // Import recipient's public key
        const pubKeyBuffer = Uint8Array.from(atob(recipientPublicKeyBase64), c => c.charCodeAt(0));
        const pubKey = await window.crypto.subtle.importKey(
            "spki", pubKeyBuffer, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]
        );

        // Encrypt the seed (Ciphertext)
        const ciphertextBuffer = await window.crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            pubKey,
            seed
        );

        return {
            sharedSecret,
            ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer)))
        };
    }

    // Decapsulate (Kyber): Recover Shared Secret from Ciphertext using Private Key
    static async decapsulate(ciphertextBase64: string, privateKeyBase64: string): Promise<CryptoKey> {
        console.log("Decapsulating Shared Secret...");
        const privKeyBuffer = Uint8Array.from(atob(privateKeyBase64), c => c.charCodeAt(0));
        const privKey = await window.crypto.subtle.importKey(
            "pkcs8", privKeyBuffer, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]
        );

        const ciphertextBuffer = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0));
        const seed = await window.crypto.subtle.decrypt(
            { name: "RSA-OAEP" },
            privKey,
            ciphertextBuffer
        );

        return await window.crypto.subtle.importKey(
            "raw", seed, "AES-GCM", true, ["encrypt", "decrypt"]
        );
    }

    // Sign (Dilithium)
    static async sign(message: string, privateKeyBase64: string): Promise<string> {
        const privKeyBuffer = Uint8Array.from(atob(privateKeyBase64), c => c.charCodeAt(0));
        const privKey = await window.crypto.subtle.importKey(
            "pkcs8", privKeyBuffer, { name: "ECDSA", namedCurve: "P-384" }, false, ["sign"]
        );

        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        const signature = await window.crypto.subtle.sign(
            { name: "ECDSA", hash: { name: "SHA-384" } },
            privKey,
            data
        );

        return btoa(String.fromCharCode(...new Uint8Array(signature)));
    }

    // Verify (Dilithium)
    static async verify(message: string, signatureBase64: string, publicKeyBase64: string): Promise<boolean> {
        const pubKeyBuffer = Uint8Array.from(atob(publicKeyBase64), c => c.charCodeAt(0));
        const pubKey = await window.crypto.subtle.importKey(
            "spki", pubKeyBuffer, { name: "ECDSA", namedCurve: "P-384" }, false, ["verify"]
        );

        const signature = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));
        const encoder = new TextEncoder();
        const data = encoder.encode(message);

        return await window.crypto.subtle.verify(
            { name: "ECDSA", hash: { name: "SHA-384" } },
            pubKey,
            signature,
            data
        );
    }

    // AES-256-GCM Encryption
    static async encryptMessage(text: string, sharedSecret: CryptoKey): Promise<{ encrypted: string, iv: string }> {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encoder = new TextEncoder();
        const data = encoder.encode(text);

        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            sharedSecret,
            data
        );

        return {
            encrypted: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
            iv: btoa(String.fromCharCode(...new Uint8Array(iv)))
        };
    }

    // AES-256-GCM Decryption
    static async decryptMessage(encryptedBase64: string, ivBase64: string, sharedSecret: CryptoKey): Promise<string> {
        const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
        const encrypted = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            sharedSecret,
            encrypted
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    }
}
