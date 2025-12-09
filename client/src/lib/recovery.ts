import { wordlist } from './wordlist';

export class RecoveryService {
    /**
     * Generates a 12-word recovery phrase.
     */
    static generateMnemonic(strength: 128 | 256 = 128): string {
        const array = new Uint8Array(strength / 8);
        window.crypto.getRandomValues(array);

        // Naively map bytes to words for simplicity (Not strict BIP39 checksum for this demo)
        // Real BIP39 requires SHA256 checksum bits. Here we just map 11 bits.
        // However, to keep it verifiable, we'll just use the randomness to pick words.
        // 12 words = 12 * 11 bits = 132 bits needed.

        // We will pick 12 random indices from 2048
        const words: string[] = [];
        const randomBuffer = new Uint32Array(12);
        window.crypto.getRandomValues(randomBuffer);

        for (let i = 0; i < 12; i++) {
            const index = randomBuffer[i] % 2048;
            words.push(wordlist[index]);
        }

        return words.join(' ');
    }

    /**
     * Derives a strong 256-bit key from the mnemonic using PBKDF2.
     * This key will be used to encrypt the RSA private key.
     */
    static async deriveKeyFromMnemonic(mnemonic: string, salt: string = 'qrypt-recovery-salt'): Promise<CryptoKey> {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(mnemonic.trim().toLowerCase().replace(/\s+/g, ' ')),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );

        const key = await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: enc.encode(salt),
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );

        return key;
    }
}
