package com.blockfoliox.backend.service;

import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.stereotype.Service;

@Service
public class EncryptionService {

    private static final String SECRET_KEY = "1234567890123456"; // 16 chars (change later)

    public String encrypt(String strToEncrypt) {
        try {
            Cipher cipher = Cipher.getInstance("AES");
            SecretKeySpec secretKey = new SecretKeySpec(SECRET_KEY.getBytes(), "AES");
            cipher.init(Cipher.ENCRYPT_MODE, secretKey);
            return Base64.getEncoder()
                    .encodeToString(cipher.doFinal(strToEncrypt.getBytes()));
        } catch (Exception e) {
            throw new RuntimeException("Error encrypting", e);
        }
    }

    public String decrypt(String strToDecrypt) {
        try {
            Cipher cipher = Cipher.getInstance("AES");
            SecretKeySpec secretKey = new SecretKeySpec(SECRET_KEY.getBytes(), "AES");
            cipher.init(Cipher.DECRYPT_MODE, secretKey);
            return new String(cipher.doFinal(Base64.getDecoder()
                    .decode(strToDecrypt)));
        } catch (Exception e) {
            throw new RuntimeException("Error decrypting", e);
        }
    }
}
