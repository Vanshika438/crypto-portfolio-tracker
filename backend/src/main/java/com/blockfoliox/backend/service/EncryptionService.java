package com.blockfoliox.backend.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

@Service
public class EncryptionService {

    private static final Logger log = LoggerFactory.getLogger(EncryptionService.class);

    private static final int IV_LENGTH  = 12;
    private static final int TAG_LENGTH = 128;
    private static final int KEY_LENGTH = 32; // AES-256 requires exactly 32 bytes

    @Value("${encryption.secret}")
    private String secretKey;

    private byte[] keyBytes;

    @PostConstruct
    public void init() {
        // Always use UTF-8 to avoid platform charset differences
        byte[] raw = secretKey.getBytes(StandardCharsets.UTF_8);

        if (raw.length < 16) {
            throw new IllegalStateException(
                "encryption.secret must be at least 16 characters. "
                + "32 characters required for AES-256. Current length: " + raw.length);
        }

        if (raw.length != KEY_LENGTH) {
            // Pad with zeros if too short (>= 16 but < 32), or truncate if too long
            // Best practice: always set your secret to exactly 32 chars in .env
            keyBytes = Arrays.copyOf(raw, KEY_LENGTH);
            log.warn("encryption.secret is {} bytes; expected 32 for AES-256. "
                    + "Key has been {}. Set your secret to exactly 32 characters in production.",
                    raw.length,
                    raw.length < KEY_LENGTH ? "zero-padded" : "truncated");
        } else {
            keyBytes = raw;
        }
    }

    public String encrypt(String plaintext) {
        try {
            byte[] iv = new byte[IV_LENGTH];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE,
                    new SecretKeySpec(keyBytes, "AES"),
                    new GCMParameterSpec(TAG_LENGTH, iv));

            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            // Prepend IV to ciphertext: [IV (12 bytes)] + [ciphertext]
            byte[] combined = new byte[IV_LENGTH + ciphertext.length];
            System.arraycopy(iv,         0, combined, 0,         IV_LENGTH);
            System.arraycopy(ciphertext, 0, combined, IV_LENGTH, ciphertext.length);

            return Base64.getEncoder().encodeToString(combined);

        } catch (Exception e) {
            log.error("Encryption failed: {}", e.getMessage());
            throw new RuntimeException("Encryption failed", e);
        }
    }

    public String decrypt(String encrypted) {
        try {
            byte[] combined    = Base64.getDecoder().decode(encrypted);
            byte[] iv          = new byte[IV_LENGTH];
            byte[] ciphertext  = new byte[combined.length - IV_LENGTH];

            System.arraycopy(combined, 0,         iv,         0, IV_LENGTH);
            System.arraycopy(combined, IV_LENGTH, ciphertext, 0, ciphertext.length);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE,
                    new SecretKeySpec(keyBytes, "AES"),
                    new GCMParameterSpec(TAG_LENGTH, iv));

            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);

        } catch (Exception e) {
            log.error("Decryption failed: {}", e.getMessage());
            throw new RuntimeException("Decryption failed", e);
        }
    }
}