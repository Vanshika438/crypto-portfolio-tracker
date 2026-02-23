package com.blockfoliox.backend.service;

import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

@Service
public class EncryptionService {

    @Value("${encryption.secret}")
    private String secretKey;

    public String encrypt(String strToEncrypt) {
        try {
            Cipher cipher = Cipher.getInstance("AES");
            SecretKeySpec secretKeySpec =
                    new SecretKeySpec(secretKey.getBytes(), "AES");

            cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec);

            return Base64.getEncoder()
                    .encodeToString(cipher.doFinal(strToEncrypt.getBytes()));

        } catch (Exception e) {
            throw new RuntimeException("Error encrypting", e);
        }
    }

    public String decrypt(String strToDecrypt) {
        try {
            Cipher cipher = Cipher.getInstance("AES");
            SecretKeySpec secretKeySpec =
                    new SecretKeySpec(secretKey.getBytes(), "AES");

            cipher.init(Cipher.DECRYPT_MODE, secretKeySpec);

            return new String(cipher.doFinal(
                    Base64.getDecoder().decode(strToDecrypt)));

        } catch (Exception e) {
            throw new RuntimeException("Error decrypting", e);
        }
    }
}