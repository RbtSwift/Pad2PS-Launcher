package io.github.rbtswift.Pad2PSLauncher;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "Igdb")
public class IgdbPlugin extends Plugin {
    private static final String ALIAS = "pad2ps-igdb";
    private static final String PREFS = "pad2ps_secure_credentials";
    private static final String CREDENTIAL_KEY = "igdb";
    private SecretKey secretKey() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
        if (store.containsAlias(ALIAS)) return (SecretKey) store.getKey(ALIAS, null);
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
        return generator.generateKey();
    }
    private JSONObject credentials() throws Exception {
        String stored = getContext().getSharedPreferences(PREFS, 0).getString(CREDENTIAL_KEY, null);
        if (stored == null) {
            String clientId = BuildConfig.IGDB_CLIENT_ID;
            String clientSecret = BuildConfig.IGDB_CLIENT_SECRET;
            if (clientId == null || clientId.isEmpty() || clientSecret == null || clientSecret.isEmpty()) return null;
            return new JSONObject().put("clientId", clientId).put("clientSecret", clientSecret);
        }
        byte[] payload = Base64.decode(stored, Base64.NO_WRAP); byte[] iv = new byte[12]; byte[] encrypted = new byte[payload.length - 12];
        System.arraycopy(payload, 0, iv, 0, 12); System.arraycopy(payload, 12, encrypted, 0, encrypted.length);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.DECRYPT_MODE, secretKey(), new GCMParameterSpec(128, iv));
        return new JSONObject(new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8));
    }
    private void save(JSONObject value) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, secretKey()); byte[] encrypted = cipher.doFinal(value.toString().getBytes(StandardCharsets.UTF_8)); byte[] iv = cipher.getIV(); byte[] payload = new byte[iv.length + encrypted.length];
        System.arraycopy(iv, 0, payload, 0, iv.length); System.arraycopy(encrypted, 0, payload, iv.length, encrypted.length);
        getContext().getSharedPreferences(PREFS, 0).edit().putString(CREDENTIAL_KEY, Base64.encodeToString(payload, Base64.NO_WRAP)).apply();
    }
    private static JSONObject request(String url, String method, String contentType, String body, JSONObject headers) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection(); connection.setRequestMethod(method); connection.setConnectTimeout(15000); connection.setReadTimeout(20000);
        if (contentType != null) connection.setRequestProperty("Content-Type", contentType);
        if (headers != null) { java.util.Iterator<String> keys = headers.keys(); while (keys.hasNext()) { String key = keys.next(); connection.setRequestProperty(key, headers.getString(key)); } }
        if (body != null) { connection.setDoOutput(true); try (OutputStream output = connection.getOutputStream()) { output.write(body.getBytes(StandardCharsets.UTF_8)); } }
        int status = connection.getResponseCode(); InputStream input = status >= 200 && status < 300 ? connection.getInputStream() : connection.getErrorStream(); ByteArrayOutputStream output = new ByteArrayOutputStream();
        if (input != null) { byte[] buffer = new byte[4096]; int read; while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read); input.close(); }
        String response = output.toString("UTF-8"); connection.disconnect(); if (status < 200 || status >= 300) throw new Exception("IGDB/Twitch respondeu HTTP " + status + ".");
        return response.startsWith("[") ? new JSONObject().put("rows", new JSONArray(response)) : new JSONObject(response);
    }
    private String token(JSONObject creds) throws Exception {
        long expiry = creds.optLong("tokenExpiresAt", 0); String cached = creds.optString("token", "");
        if (!cached.isEmpty() && expiry > System.currentTimeMillis() + 60000) return cached;
        String body = "client_id=" + URLEncoder.encode(creds.getString("clientId"), "UTF-8") + "&client_secret=" + URLEncoder.encode(creds.getString("clientSecret"), "UTF-8") + "&grant_type=client_credentials";
        JSONObject response = request("https://id.twitch.tv/oauth2/token", "POST", "application/x-www-form-urlencoded", body, null);
        creds.put("token", response.getString("access_token")); creds.put("tokenExpiresAt", System.currentTimeMillis() + response.optLong("expires_in", 0) * 1000L); save(creds); return creds.getString("token");
    }
    private JSONObject steamMetadata(String appId) throws Exception {
        JSONObject response = request("https://store.steampowered.com/api/appdetails?appids=" + appId, "GET", null, null, null);
        JSONObject result = response.optJSONObject(appId);
        if (result == null || !result.optBoolean("success")) return null;
        JSONObject source = result.optJSONObject("data");
        if (source == null) return null;
        String releaseDate = source.optJSONObject("release_date") == null ? "" : source.optJSONObject("release_date").optString("date", "");
        java.util.regex.Matcher yearMatch = java.util.regex.Pattern.compile("\\b(19|20)\\d{2}\\b").matcher(releaseDate);
        JSONObject data = new JSONObject().put("id", Integer.parseInt(appId)).put("name", source.optString("name", "")).put("summary", source.optString("short_description", "")).put("rating", JSONObject.NULL);
        data.put("year", yearMatch.find() ? Integer.parseInt(yearMatch.group()) : JSONObject.NULL);
        JSONArray genresOut = new JSONArray(), genres = source.optJSONArray("genres");
        if (genres != null) for (int i = 0; i < genres.length(); i++) genresOut.put(genres.getJSONObject(i).optString("description"));
        data.put("genres", genresOut);
        JSONArray developersOut = new JSONArray(), developers = source.optJSONArray("developers");
        if (developers != null) for (int i = 0; i < developers.length(); i++) developersOut.put(developers.optString(i));
        data.put("developers", developersOut);
        JSONArray shotsOut = new JSONArray(), shots = source.optJSONArray("screenshots");
        if (shots != null) for (int i = 0; i < Math.min(5, shots.length()); i++) shotsOut.put(shots.getJSONObject(i).optString("path_full"));
        data.put("screenshots", shotsOut);
        return data;
    }
    private static String normalizeTitle(String value) {
        return value == null ? "" : java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(java.util.Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
    }
    private JSONObject toMetadata(JSONObject source, String title) throws Exception {
        JSONObject data = new JSONObject().put("id", source.optInt("id")).put("name", source.optString("name", title)).put("summary", source.optString("summary", "")).put("rating", source.has("rating") ? source.optDouble("rating") : JSONObject.NULL);
        long timestamp = source.optLong("first_release_date", 0); data.put("year", timestamp > 0 ? java.time.Instant.ofEpochSecond(timestamp).atZone(java.time.ZoneOffset.UTC).getYear() : JSONObject.NULL);
        JSONArray genresOut = new JSONArray(); JSONArray genres = source.optJSONArray("genres"); if (genres != null) for (int i = 0; i < genres.length(); i++) genresOut.put(genres.getJSONObject(i).optString("name")); data.put("genres", genresOut);
        JSONArray developersOut = new JSONArray(); JSONArray companies = source.optJSONArray("involved_companies"); if (companies != null) for (int i = 0; i < companies.length(); i++) { JSONObject company = companies.getJSONObject(i); if (company.optBoolean("developer") && company.has("company")) developersOut.put(company.getJSONObject("company").optString("name")); } data.put("developers", developersOut);
        JSONArray shotsOut = new JSONArray(); JSONArray shots = source.optJSONArray("screenshots"); if (shots != null) for (int i = 0; i < Math.min(5, shots.length()); i++) shotsOut.put("https://images.igdb.com/igdb/image/upload/t_screenshot_big/" + shots.getJSONObject(i).optString("image_id") + ".jpg"); data.put("screenshots", shotsOut);
        return data;
    }
    @PluginMethod public void config(PluginCall call) { try { JSONObject creds = credentials(); call.resolve(new JSObject().put("configured", creds != null && creds.has("clientId")).put("clientId", creds == null ? "" : creds.optString("clientId", ""))); } catch (Exception e) { call.reject("Não foi possível acessar o cofre IGDB.", e); } }
    @PluginMethod public void saveCredentials(PluginCall call) {
        try { JSONObject existing = credentials(); String id = call.getString("clientId", "").trim(), secret = call.getString("clientSecret", "").trim(); if (id.isEmpty() && existing != null) id = existing.optString("clientId", ""); if (secret.isEmpty() && existing != null) secret = existing.optString("clientSecret", ""); if (id.isEmpty() || secret.isEmpty()) throw new Exception("Informe Client ID e Client Secret."); JSONObject creds = new JSONObject().put("clientId", id).put("clientSecret", secret); token(creds); call.resolve(new JSObject().put("configured", true)); }
        catch (Exception e) { call.reject(e.getMessage() == null ? "Falha ao validar credenciais IGDB." : e.getMessage(), e); }
    }
    @PluginMethod public void clear(PluginCall call) {
        android.content.SharedPreferences preferences = getContext().getSharedPreferences(PREFS, 0);
        android.content.SharedPreferences.Editor editor = preferences.edit().remove(CREDENTIAL_KEY);
        for (String key : preferences.getAll().keySet()) if (key.startsWith("game:")) editor.remove(key);
        editor.apply(); call.resolve(new JSObject().put("ok", true));
    }
    @PluginMethod public void game(PluginCall call) {
        try {
            String title = call.getString("title", "").replaceAll("\\[[^]]*]|\\([^)]*\\)", " ").replaceAll("(?i)\\b(disc|disk|cd)\\s*\\d+\\b", " ").replaceAll("\\s+", " ").trim();
            if (title.isEmpty()) throw new Exception("Título vazio.");
            String appId = call.getString("appId", "");
            if (!appId.matches("\\d{1,10}")) appId = "";
            boolean refresh = call.getBoolean("refresh", false);
            String cacheKey = appId.isEmpty() ? "game:" + title.toLowerCase(java.util.Locale.ROOT) : "game:steam:" + appId;
            String cached = getContext().getSharedPreferences(PREFS, 0).getString(cacheKey, null);
            if (cached != null && !refresh) { call.resolve(new JSObject().put("available", true).put("data", new JSObject(cached))); return; }
            JSONObject creds = credentials();
            String safeTitle = title.replace("\\", " ").replace("\"", " ");
            JSONObject headers = null;
            String igdbError = "";
            if (creds != null && creds.has("clientId") && creds.has("clientSecret")) {
                try {
                    headers = new JSONObject().put("Client-ID", creds.getString("clientId")).put("Authorization", "Bearer " + token(creds));
                    if (!appId.isEmpty()) {
                        JSONObject externalResult = request("https://api.igdb.com/v4/external_games", "POST", "text/plain",
                                "fields game.id,game.name,game.summary,game.first_release_date,game.genres.name,game.involved_companies.company.name,game.involved_companies.developer,game.screenshots.image_id,game.rating,game.total_rating_count,game.follows; where uid = \"" + appId + "\" & category = 1; limit 1;", headers);
                        JSONArray externalRows = externalResult.optJSONArray("rows");
                        if (externalRows != null && externalRows.length() > 0) {
                            JSONObject exactGame = externalRows.getJSONObject(0).optJSONObject("game");
                            if (exactGame != null) {
                                JSONObject data = toMetadata(exactGame, title);
                                android.content.SharedPreferences.Editor editor = getContext().getSharedPreferences(PREFS, 0).edit();
                                if (!appId.isEmpty()) editor.remove("game:" + title.toLowerCase(java.util.Locale.ROOT));
                                editor.putString(cacheKey, data.toString()).apply();
                                call.resolve(new JSObject().put("available", true).put("data", new JSObject(data.toString()))); return;
                            }
                        }
                    }
                } catch (Exception e) { igdbError = e.getMessage() == null ? "" : e.getMessage(); }
            }
            if (!appId.isEmpty()) {
                try {
                    JSONObject steamData = steamMetadata(appId);
                    if (steamData != null) {
                        android.content.SharedPreferences.Editor editor = getContext().getSharedPreferences(PREFS, 0).edit();
                        editor.remove("game:" + title.toLowerCase(java.util.Locale.ROOT));
                        editor.putString(cacheKey, steamData.toString()).apply();
                        call.resolve(new JSObject().put("available", true).put("data", new JSObject(steamData.toString()))); return;
                    }
                } catch (Exception ignored) { }
            }
            if (creds == null || !creds.has("clientId") || !creds.has("clientSecret")) throw new Exception(igdbError.isEmpty() ? "Configure suas credenciais IGDB nas Configurações." : igdbError);
            if (headers == null) headers = new JSONObject().put("Client-ID", creds.getString("clientId")).put("Authorization", "Bearer " + token(creds));
            String fields = "fields id,name,summary,first_release_date,genres.name,involved_companies.company.name,involved_companies.developer,screenshots.image_id,rating,total_rating_count,follows,category; ";
            JSONArray rows = request("https://api.igdb.com/v4/games", "POST", "text/plain", fields + "where name = \"" + safeTitle + "\" & category = (0, 8, 9); sort total_rating_count desc; limit 20;", headers).getJSONArray("rows");
            if (rows.length() == 0) rows = request("https://api.igdb.com/v4/games", "POST", "text/plain", fields + "search \"" + safeTitle + "\"; where category = (0, 8, 9); sort total_rating_count desc; limit 20;", headers).getJSONArray("rows");
            String exactName = normalizeTitle(title); JSONObject source = null;
            for (int i = 0; i < rows.length(); i++) {
                JSONObject candidate = rows.getJSONObject(i);
                if (!normalizeTitle(candidate.optString("name")).equals(exactName)) continue;
                if (source == null || candidate.optInt("total_rating_count") > source.optInt("total_rating_count")
                        || (candidate.optInt("total_rating_count") == source.optInt("total_rating_count") && candidate.optInt("follows") > source.optInt("follows"))) source = candidate;
            }
            if (source == null) throw new Exception("Nenhum resultado com título exatamente correspondente foi encontrado na IGDB.");
            JSONObject data = toMetadata(source, title);
            android.content.SharedPreferences.Editor editor = getContext().getSharedPreferences(PREFS, 0).edit();
            if (!appId.isEmpty()) editor.remove("game:" + title.toLowerCase(java.util.Locale.ROOT));
            editor.putString(cacheKey, data.toString()).apply(); call.resolve(new JSObject().put("available", true).put("data", new JSObject(data.toString())));
        } catch (Exception e) { call.resolve(new JSObject().put("available", false).put("reason", e.getMessage() == null ? "Metadados indisponíveis." : e.getMessage())); }
    }
}
