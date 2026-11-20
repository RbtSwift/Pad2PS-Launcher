package io.github.rbtswift.Pad2PSLauncher;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;

import androidx.documentfile.provider.DocumentFile;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import androidx.activity.result.ActivityResult;

import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.Locale;
import java.text.Normalizer;
import java.util.concurrent.TimeUnit;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

@CapacitorPlugin(name = "SaveSync")
public class SaveSyncPlugin extends Plugin {
    private static final String PREFS = "pad2ps_save_sync";
    private static final String CONFIG = "config_enc";
    private static final String KEY_ALIAS = "pad2ps-save-sync-key";
    private final OkHttpClient http = new OkHttpClient.Builder().callTimeout(30, TimeUnit.SECONDS).build();

    private SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
        if (store.containsAlias(KEY_ALIAS)) return (SecretKey) store.getKey(KEY_ALIAS, null);
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
        return generator.generateKey();
    }
    private JSONObject readConfig() throws Exception {
        String encoded = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(CONFIG, null);
        if (encoded == null) return new JSONObject();
        byte[] payload = android.util.Base64.decode(encoded, android.util.Base64.NO_WRAP);
        if (payload.length <= 12) throw new IllegalStateException("A configuração protegida do Save Sync está inválida.");
        byte[] iv = new byte[12], cipherText = new byte[payload.length - 12];
        System.arraycopy(payload, 0, iv, 0, 12); System.arraycopy(payload, 12, cipherText, 0, cipherText.length);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, iv));
        return new JSONObject(new String(cipher.doFinal(cipherText), StandardCharsets.UTF_8));
    }
    private void writeConfig(JSONObject value) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, key());
        byte[] encrypted = cipher.doFinal(value.toString().getBytes(StandardCharsets.UTF_8)), iv = cipher.getIV(), payload = new byte[iv.length + encrypted.length];
        System.arraycopy(iv, 0, payload, 0, iv.length); System.arraycopy(encrypted, 0, payload, iv.length, encrypted.length);
        getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(CONFIG, android.util.Base64.encodeToString(payload, android.util.Base64.NO_WRAP)).apply();
    }
    @PluginMethod public void config(PluginCall call) {
        try { JSONObject c = readConfig(); JSObject out = new JSObject().put("mode", c.optString("mode", "local")).put("baseFolderUri", c.optString("baseFolderUri", "")).put("webdavUrl", c.optString("webdavUrl", "")).put("username", c.optString("username", "")).put("configured", c.length() > 0); call.resolve(out); }
        catch (Exception e) { call.reject("Não foi possível ler a configuração segura do Save Sync.", e); }
    }
    @PluginMethod public void saveConfig(PluginCall call) {
        try {
            JSONObject c = new JSONObject().put("mode", call.getString("mode", "local")).put("baseFolderUri", call.getString("baseFolderUri", "")).put("webdavUrl", call.getString("webdavUrl", "").trim()).put("username", call.getString("username", "").trim());
            String password = call.getString("password", ""); if (password.isEmpty()) password = readConfig().optString("password", ""); c.put("password", password);
            if ("webdav".equals(c.optString("mode")) && (c.optString("webdavUrl").isEmpty() || password.isEmpty())) throw new IllegalArgumentException("Informe URL WebDAV e senha/token.");
            writeConfig(c); call.resolve(new JSObject().put("ok", true));
        } catch (Exception e) { call.reject(e.getMessage() == null ? "Falha ao proteger as credenciais." : e.getMessage(), e); }
    }
    @PluginMethod public void pickFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, intent, "folderPicked");
    }
    @ActivityCallback private void folderPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != android.app.Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) { call.reject("Seleção de pasta cancelada."); return; }
        Uri uri = result.getData().getData(); int flags = result.getData().getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        if ((flags & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION))
                != (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION)) {
            call.reject("O Android não concedeu permissões de leitura e gravação para a pasta.");
            return;
        }
        try {
            getContext().getContentResolver().takePersistableUriPermission(uri, flags);
            DocumentFile folder = DocumentFile.fromTreeUri(getContext(), uri);
            if (folder == null || !folder.isDirectory()) throw new IllegalStateException("A pasta selecionada não está disponível.");
            call.resolve(new JSObject().put("uri", uri.toString()).put("name", folder.getName()));
        } catch (Exception e) {
            call.reject("Não foi possível manter a permissão da pasta selecionada.", e);
        }
    }
    private Request.Builder request(String url, JSONObject config) {
        Request.Builder b = new Request.Builder().url(url).header("User-Agent", "Pad2PS-Launcher/1.0");
        String user = config.optString("username", ""), pass = config.optString("password", "");
        if (!user.isEmpty() || !pass.isEmpty()) b.header("Authorization", okhttp3.Credentials.basic(user, pass, StandardCharsets.UTF_8));
        return b;
    }
    private String webdavBase(JSONObject config) { return config.optString("webdavUrl", "").replaceAll("/+\\s*$", ""); }
    private void ensureRemoteCollection(JSONObject config) throws Exception {
        String base = webdavBase(config); if (base.isEmpty()) throw new IllegalArgumentException("Configure a URL WebDAV primeiro.");
        int status;
        try (Response response = http.newCall(request(base, config).method("PROPFIND", RequestBody.create(new byte[0], null)).header("Depth", "0").build()).execute()) { status = response.code(); }
        if (status == 404) { try (Response created = http.newCall(request(base, config).method("MKCOL", null).build()).execute()) { if (!(created.code() == 201 || created.code() == 405)) throw new IllegalStateException("Não foi possível criar a pasta WebDAV (HTTP " + created.code() + ")."); } }
        else if (!(status == 200 || status == 207 || status == 405)) throw new IllegalStateException("WebDAV respondeu HTTP " + status + ".");
    }
    @PluginMethod public void testConnection(PluginCall call) {
        try {
            JSONObject c = readConfig(); String base = c.optString("webdavUrl", "").replaceAll("/+\\s*$", "");
            if (base.isEmpty()) throw new IllegalArgumentException("Configure a URL WebDAV primeiro.");
            ensureRemoteCollection(c);
            call.resolve(new JSObject().put("ok", true));
        } catch (Exception e) { call.reject(e.getMessage() == null ? "Falha ao testar conexão WebDAV." : e.getMessage(), e); }
    }
    private File zipTree(Uri treeUri, File target) throws Exception {
        DocumentFile root = DocumentFile.fromTreeUri(getContext(), treeUri); if (root == null || !root.isDirectory()) throw new IllegalArgumentException("URI da pasta de saves inválida.");
        try (ZipOutputStream zip = new ZipOutputStream(new BufferedOutputStream(new FileOutputStream(target)))) { addTree(zip, root, ""); }
        return target;
    }
    private void addTree(ZipOutputStream zip, DocumentFile dir, String prefix) throws Exception {
        for (DocumentFile child : dir.listFiles()) {
            String name = child.getName(); if (name == null || name.equals(".") || name.equals("..")) continue;
            String path = prefix.isEmpty() ? name : prefix + "/" + name;
            if (child.isDirectory()) addTree(zip, child, path);
            else if (child.isFile()) { zip.putNextEntry(new ZipEntry(path)); try (InputStream in = getContext().getContentResolver().openInputStream(child.getUri())) { if (in == null) throw new IllegalStateException("Não foi possível ler arquivo da pasta de saves."); byte[] buffer = new byte[8192]; int n; while ((n = in.read(buffer)) != -1) zip.write(buffer, 0, n); } zip.closeEntry(); }
        }
    }
    private File backup(Uri saveFolderUri, String archiveName) throws Exception {
        File directory = new File(getContext().getFilesDir(), "save-sync-backups");
        if (!directory.exists() && !directory.mkdirs()) throw new IllegalStateException("Não foi possível criar a pasta local de backups.");
        File backup = new File(directory, archiveName + ".bak");
        return zipTree(saveFolderUri, backup);
    }
    private void extract(File archive, Uri treeUri) throws Exception {
        DocumentFile root = DocumentFile.fromTreeUri(getContext(), treeUri); if (root == null) throw new IllegalArgumentException("Pasta de saves indisponível.");
        try (ZipInputStream zip = new ZipInputStream(new BufferedInputStream(new FileInputStream(archive)))) {
            ZipEntry entry; byte[] buffer = new byte[8192];
            while ((entry = zip.getNextEntry()) != null) {
                String name = entry.getName();
                if (name.isEmpty() || name.startsWith("/") || name.contains("\\")) throw new IllegalArgumentException("O arquivo ZIP contém um caminho inválido.");
                String[] parts = name.split("/", -1);
                int partCount = parts.length;
                if (entry.isDirectory() && partCount > 0 && parts[partCount - 1].isEmpty()) partCount--;
                if (partCount == 0) throw new IllegalArgumentException("O arquivo ZIP contém um caminho inválido.");
                for (int i = 0; i < partCount; i++) {
                    if (parts[i].isEmpty() || parts[i].equals(".") || parts[i].equals("..")) throw new IllegalArgumentException("O arquivo ZIP contém um caminho inválido.");
                }
                DocumentFile parent = root;
                int directoryParts = entry.isDirectory() ? partCount : partCount - 1;
                for (int i = 0; i < directoryParts; i++) {
                    DocumentFile next = parent.findFile(parts[i]);
                    if (next == null) next = parent.createDirectory(parts[i]);
                    if (next == null || !next.isDirectory()) throw new IllegalStateException("Não foi possível criar pasta do save.");
                    parent = next;
                }
                if (!entry.isDirectory()) {
                    String fileName = parts[partCount - 1];
                    DocumentFile old = parent.findFile(fileName);
                    if (old != null && (!old.isFile() || !old.delete())) throw new IllegalStateException("Não foi possível substituir arquivo de save.");
                    DocumentFile dest = parent.createFile("application/octet-stream", fileName);
                    if (dest == null) throw new IllegalStateException("Não foi possível gravar arquivo de save.");
                    try (OutputStream out = getContext().getContentResolver().openOutputStream(dest.getUri())) {
                        if (out == null) throw new IllegalStateException("Não foi possível abrir o arquivo de save.");
                        int n; while ((n = zip.read(buffer)) != -1) out.write(buffer, 0, n);
                    }
                }
                zip.closeEntry();
            }
        }
    }
    private File localArchive(Uri baseUri, String name, boolean create) throws Exception {
        DocumentFile base = DocumentFile.fromTreeUri(getContext(), baseUri); if (base == null) throw new IllegalArgumentException("Pasta base Save Sync indisponível.");
        DocumentFile dir = base.findFile("Pad2PS-Saves"); if (dir == null && create) dir = base.createDirectory("Pad2PS-Saves");
        if (dir != null && !dir.isDirectory()) throw new IllegalStateException("O caminho Pad2PS-Saves não é uma pasta.");
        DocumentFile file = dir == null ? null : dir.findFile(name); if (file == null && create && dir != null) file = dir.createFile("application/zip", name);
        if (file == null) {
            if (create) throw new IllegalStateException("Não foi possível criar o arquivo compartilhado de save.");
            return null;
        }
        if (!file.isFile()) throw new IllegalStateException("O destino do arquivo compartilhado de save não é um arquivo.");
        File tmp = new File(getContext().getCacheDir(), name);
        if (!create) {
            try (InputStream in = getContext().getContentResolver().openInputStream(file.getUri()); OutputStream out = new FileOutputStream(tmp)) {
                if (in == null) throw new IllegalStateException("Não foi possível ler o arquivo compartilhado de save.");
                byte[] b = new byte[8192]; int n; while ((n = in.read(b)) != -1) out.write(b, 0, n);
            }
        } else {
            try (InputStream in = new FileInputStream(tmp); OutputStream out = getContext().getContentResolver().openOutputStream(file.getUri(), "wt")) {
                if (out == null) throw new IllegalStateException("Não foi possível abrir o arquivo compartilhado de save.");
                byte[] b = new byte[8192]; int n; while ((n = in.read(b)) != -1) out.write(b, 0, n);
            }
        }
        return tmp;
    }
    private File webdav(Uri saveUri, String name, JSONObject c, String direction) throws Exception {
        ensureRemoteCollection(c); String base = webdavBase(c); String url = base + "/" + URLEncoder.encode(name, "UTF-8").replace("+", "%20");
        if ("push".equals(direction)) {
            File zip = new File(getContext().getCacheDir(), name); zipTree(saveUri, zip);
            try (Response response = http.newCall(request(url, c).put(RequestBody.create(zip, okhttp3.MediaType.parse("application/zip"))).build()).execute()) { if (!response.isSuccessful()) throw new IllegalStateException("WebDAV respondeu HTTP " + response.code() + " ao enviar."); }
            return zip;
        }
        File zip = new File(getContext().getCacheDir(), name);
        try (Response response = http.newCall(request(url, c).get().build()).execute()) { if (response.code() == 404) return null; if (!response.isSuccessful()) throw new IllegalStateException("WebDAV respondeu HTTP " + response.code() + " ao baixar."); if (response.body() == null) throw new IllegalStateException("O WebDAV não retornou o arquivo de save."); try (InputStream in = response.body().byteStream(); OutputStream out = new FileOutputStream(zip)) { byte[] b = new byte[8192]; int n; while ((n = in.read(b)) != -1) out.write(b, 0, n); } }
        return zip;
    }
    @PluginMethod public void sync(PluginCall call) {
        try {
            JSONObject c = readConfig(); String mode = c.optString("mode", "local"), saveUri = call.getString("saveFolderUri", ""), direction = call.getString("direction", "push");
            if (saveUri.isEmpty()) throw new IllegalArgumentException("Escolha a pasta de saves do jogo no seletor Android.");
            String sharedName = call.getString("title", call.getString("gameId", "game"));
            String gameId = Normalizer.normalize(sharedName, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_-]+", "_").replaceAll("^_+|_+$", "");
            if (gameId.isEmpty()) gameId = "game";
            String name = gameId + ".zip"; Uri source = Uri.parse(saveUri); File zip;
            if ("pull".equals(direction)) {
                zip = "webdav".equals(mode) ? webdav(source, name, c, "pull") : localArchive(Uri.parse(c.getString("baseFolderUri")), name, false);
                if (zip != null && zip.exists()) { backup(source, name); extract(zip, source); }
            } else if ("webdav".equals(mode)) {
                webdav(source, name, c, "push");
            } else {
                zip = new File(getContext().getCacheDir(), name);
                zipTree(source, zip);
                localArchive(Uri.parse(c.getString("baseFolderUri")), name, true);
            }
            call.resolve(new JSObject().put("ok", true).put("savedAt", System.currentTimeMillis()));
        } catch (Exception e) { call.reject(e.getMessage() == null ? "Falha ao sincronizar os saves." : e.getMessage(), e); }
    }
}
