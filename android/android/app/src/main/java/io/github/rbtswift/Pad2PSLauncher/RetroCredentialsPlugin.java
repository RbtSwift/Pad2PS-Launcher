package io.github.rbtswift.Pad2PSLauncher;

import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "RetroCredentials")
public class RetroCredentialsPlugin extends Plugin {
    private static final String ALIAS = "pad2ps-retroachievements";
    private static final String PREFS = "pad2ps_secure_credentials";
    private SecretKey getKey() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
        if (store.containsAlias(ALIAS)) return ((SecretKey) store.getKey(ALIAS, null));
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
          .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
        return generator.generateKey();
    }
    @PluginMethod public void save(PluginCall call) {
        try {
            String value = call.getString("value", ""); Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, getKey()); byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            byte[] iv = cipher.getIV(); byte[] payload = new byte[iv.length + encrypted.length]; System.arraycopy(iv,0,payload,0,iv.length); System.arraycopy(encrypted,0,payload,iv.length,encrypted.length);
            getContext().getSharedPreferences(PREFS,0).edit().putString("retro",Base64.encodeToString(payload,Base64.NO_WRAP)).apply(); call.resolve(new JSObject().put("ok",true));
        } catch (Exception e) { call.reject("Não foi possível proteger as credenciais no Android.",e); }
    }
    @PluginMethod public void load(PluginCall call) {
        try {
            String value = getContext().getSharedPreferences(PREFS,0).getString("retro",null); JSObject result = new JSObject();
            if (value != null) { byte[] payload=Base64.decode(value,Base64.NO_WRAP); byte[] iv=new byte[12]; byte[] encrypted=new byte[payload.length-12]; System.arraycopy(payload,0,iv,0,12); System.arraycopy(payload,12,encrypted,0,encrypted.length); Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.DECRYPT_MODE,getKey(),new GCMParameterSpec(128,iv)); result.put("value",new String(cipher.doFinal(encrypted),StandardCharsets.UTF_8)); }
            call.resolve(result);
        } catch (Exception e) { call.reject("Não foi possível ler as credenciais protegidas.",e); }
    }
    @PluginMethod public void clear(PluginCall call) { getContext().getSharedPreferences(PREFS,0).edit().remove("retro").apply(); call.resolve(new JSObject().put("ok",true)); }
}
