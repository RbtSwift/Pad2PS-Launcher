package io.github.rbtswift.Pad2PSLauncher;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.provider.DocumentsContract;
import android.provider.Settings;
import android.util.Base64;
import android.webkit.MimeTypeMap;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@CapacitorPlugin(name = "GameScanner")
public class GameScannerPlugin extends Plugin {

    @PluginMethod
    public void steamGridDbRequest(PluginCall call) {
        String kind = call.getString("kind", "");
        String query = call.getString("query", "");
        int gameId = call.getInt("gameId", 0);
        String dimensions = call.getString("dimensions", "");
        String apiPath;
        if ("search".equals(kind) && query != null && !query.trim().isEmpty()) {
            try { apiPath = "/search/autocomplete/" + java.net.URLEncoder.encode(query.trim(), "UTF-8"); }
            catch (Exception error) { call.reject("Consulta inválida.", error); return; }
        } else if ("grids".equals(kind) && gameId > 0) {
            apiPath = "/grids/game/" + gameId + (dimensions != null && !dimensions.isEmpty() ? "?dimensions=" + dimensions + "&nsfw=false&humor=false" : "?nsfw=false&humor=false");
        } else if ("heroes".equals(kind) && gameId > 0) {
            apiPath = "/heroes/game/" + gameId + "?nsfw=false&humor=false";
        } else { call.reject("Consulta SteamGridDB inválida."); return; }

        final String requestPath = apiPath;
        getActivity().runOnUiThread(() -> new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                String key = BuildConfig.STEAMGRIDDB_API_KEY;
                if (key == null || key.trim().isEmpty()) throw new IllegalStateException("SteamGridDB não configurado neste build.");
                connection = (HttpURLConnection) new URL("https://www.steamgriddb.com/api/v2" + requestPath).openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(15000);
                connection.setRequestProperty("Authorization", "Bearer " + key);
                connection.setRequestProperty("Accept", "application/json");
                int status = connection.getResponseCode();
                InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
                StringBuilder body = new StringBuilder();
                if (stream != null) {
                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, java.nio.charset.StandardCharsets.UTF_8))) {
                        String line; while ((line = reader.readLine()) != null) body.append(line);
                    }
                }
                JSObject result = new JSObject(body.length() > 0 ? body.toString() : "{}");
                result.put("httpStatus", status);
                call.resolve(result);
            } catch (Exception error) { call.reject(error.getMessage() == null ? "Falha ao consultar SteamGridDB." : error.getMessage(), error); }
            finally { if (connection != null) connection.disconnect(); }
        }).start());
    }

    @PluginMethod
    public void openHomeSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_HOME_SETTINGS);
            if (intent.resolveActivity(getContext().getPackageManager()) == null) {
                intent = new Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve(new JSObject().put("ok", true));
        } catch (Exception error) {
            call.reject("Não foi possível abrir a configuração de aplicativo de início padrão.", error);
        }
    }

    private static final String PREFS_NAME = "pad2ps_launcher_android_prefs";
    private static final String KEY_ROM_TREE_URI = "rom_tree_uri";

    private static boolean isExcludedApplication(String packageName, String title) {
        String pkg = packageName == null ? "" : packageName.toLowerCase(Locale.ROOT);
        String name = title == null ? "" : title.trim().toLowerCase(Locale.ROOT);
        String combined = pkg + " " + name;
        String[] exactNames = {"steam", "epic games", "epic games store", "epic games launcher", "ubisoft connect", "ea app", "origin", "gog galaxy", "battle.net", "rockstar games launcher", "heroic", "lutris", "play store", "google play store", "aurora store", "f-droid"};
        for (String blocked : exactNames) if (name.equals(blocked)) return true;
        String[] utilityTerms = {"steamworks common redistributables", "vcredist", "visual c++ redistributable", "directx setup", "directx runtime", "proton easyanticheat", "proton experimental"};
        for (String blocked : utilityTerms) if (combined.contains(blocked)) return true;
        return pkg.contains("epicgameslauncher") || pkg.contains("ubisoftconnect") || pkg.contains("eadesktop") || pkg.contains("goggalaxy") || pkg.contains("battlenet") || pkg.contains("rockstar") || pkg.contains("com.valvesoftware.android.steam") || pkg.contains("org.fdroid.fdroid") || pkg.contains("com.android.vending");
    }

    private static final Set<String> EMULATOR_PACKAGES = new HashSet<>(Arrays.asList(
            "org.ppsspp.ppsspp",
            "org.ppsspp.ppssppgold",
            "com.github.stenzek.duckstation",
            "xyz.aethersx2.android",
            "com.retroarch",
            "com.retroarch.aarch64",
            "org.dolphinemu.dolphinemu",
            "org.dolphinemu.mmjr",
            "org.citra.citra_emu",
            "io.github.lime3ds.android",
            "com.dsemu.drastic",
            "com.swordfish.lemuroid",
            "org.yuzu.yuzu_emu",
            "dev.sudachi.sudachi_emu",
            "org.suyu.suyu_emu",
            "org.vita3k.emulator",
            "org.mupen64plusae.v3.fzurita"
    ));

    private static final List<String> EMULATOR_KEYWORDS = Arrays.asList(
            "ppsspp", "duckstation", "aethersx2", "nethersx2", "retroarch",
            "dolphinemu", "citra", "lime3ds", "drastic", "lemuroid",
            "yuzu", "sudachi", "suyu", "vita3k", "mupen64plus"
    );

    private static final Set<String> ROM_EXTENSIONS = new HashSet<>(Arrays.asList(
            "iso", "chd", "cso", "bin", "cue", "pbp", "nds", "3ds",
            "nsp", "xci", "gba", "sfc", "z64", "nes", "smc", "n64", "v64"
    ));

    @PluginMethod
    public void getInstalledGames(PluginCall call) {
        Context ctx = getContext();
        PackageManager pm = ctx.getPackageManager();
        String selfPkg = ctx.getPackageName();

        List<ApplicationInfo> apps = pm.getInstalledApplications(PackageManager.GET_META_DATA);
        JSArray gamesArray = new JSArray();
        Map<String, String> installedEmulators = new HashMap<>();

        for (ApplicationInfo app : apps) {
            String pkg = app.packageName;
            if (pkg.equals(selfPkg)) continue;

            boolean isGame = false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (app.category == ApplicationInfo.CATEGORY_GAME) {
                    isGame = true;
                }
            }
            if ((app.flags & ApplicationInfo.FLAG_IS_GAME) != 0) {
                isGame = true;
            }

            boolean isEmulator = isEmulatorPackage(pkg);
            if (!isGame && !isEmulator) continue;

            // Precisa ter intent de lancamento
            if (pm.getLaunchIntentForPackage(pkg) == null) continue;

            String title = pm.getApplicationLabel(app).toString();
            if (isExcludedApplication(pkg, title)) continue;
            if (isEmulator) {
                installedEmulators.put(pkg.toLowerCase(Locale.ROOT), pkg);
            }

            String iconDataUrl = drawableToBase64(pm.getApplicationIcon(app));

            JSObject gameObj = new JSObject();
            gameObj.put("id", "android-pkg:" + pkg);
            gameObj.put("title", title);
            gameObj.put("packageName", pkg);
            gameObj.put("command", pkg);
            gameObj.put("platform", isEmulator ? "Emulador" : "Android");
            gameObj.put("genre", isEmulator ? "Emulador" : "Jogo Android");
            gameObj.put("isEmulator", isEmulator);
            gameObj.put("cover", iconDataUrl);
            gameObj.put("iconBase64", iconDataUrl);
            gameObj.put("source", "android");
            gamesArray.put(gameObj);
        }

        // Tambem inclui ROMs da pasta configurada, se houver
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String savedTreeUri = prefs.getString(KEY_ROM_TREE_URI, null);
        if (savedTreeUri != null && !savedTreeUri.isEmpty()) {
            try {
                List<JSObject> roms = scanTreeUri(ctx, Uri.parse(savedTreeUri), installedEmulators);
                for (JSObject rom : roms) {
                    gamesArray.put(rom);
                }
            } catch (Exception ignored) {
            }
        }

        JSObject result = new JSObject();
        result.put("games", gamesArray);
        result.put("romFolderUri", savedTreeUri != null ? savedTreeUri : "");
        call.resolve(result);
    }

    @PluginMethod
    public void getLaunchableApps(PluginCall call) {
        Context ctx = getContext();
        PackageManager pm = ctx.getPackageManager();
        String selfPkg = ctx.getPackageName();
        List<JSObject> apps = new ArrayList<>();

        for (ApplicationInfo app : pm.getInstalledApplications(PackageManager.GET_META_DATA)) {
            String pkg = app.packageName;
            if (pkg.equals(selfPkg) || pm.getLaunchIntentForPackage(pkg) == null) continue;

            JSObject item = new JSObject();
            item.put("title", pm.getApplicationLabel(app).toString());
            item.put("packageName", pkg);
            apps.add(item);
        }

        Collections.sort(apps, (left, right) -> {
            String leftTitle = left.optString("title", "");
            String rightTitle = right.optString("title", "");
            return leftTitle.compareToIgnoreCase(rightTitle);
        });

        JSArray resultApps = new JSArray();
        for (JSObject app : apps) resultApps.put(app);

        JSObject result = new JSObject();
        result.put("apps", resultApps);
        call.resolve(result);
    }

    @PluginMethod
    public void getAppIcon(PluginCall call) {
        String packageName = call.getString("packageName", "");
        if (packageName == null || packageName.trim().isEmpty()) {
            call.reject("Pacote do aplicativo inválido.");
            return;
        }

        try {
            PackageManager pm = getContext().getPackageManager();
            String icon = drawableToBase64(pm.getApplicationIcon(packageName));
            call.resolve(new JSObject().put("iconBase64", icon));
        } catch (Exception e) {
            call.reject("Não foi possível carregar o ícone do aplicativo.", e);
        }
    }

    @PluginMethod
    public void pickRomFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, intent, "handleRomFolderPicked");
    }

    @ActivityCallback
    private void handleRomFolderPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("Selecao de pasta cancelada.");
            return;
        }

        Uri treeUri = result.getData().getData();
        if (treeUri == null) {
            call.reject("URI da pasta invalida.");
            return;
        }

        Context ctx = getContext();
        try {
            final int takeFlags = result.getData().getFlags() & Intent.FLAG_GRANT_READ_URI_PERMISSION;
            ctx.getContentResolver().takePersistableUriPermission(
                    treeUri,
                    takeFlags != 0 ? takeFlags : Intent.FLAG_GRANT_READ_URI_PERMISSION
            );
        } catch (Exception ignored) {
        }

        SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_ROM_TREE_URI, treeUri.toString()).apply();

        Map<String, String> installedEmulators = getInstalledEmulatorsMap(ctx);
        List<JSObject> roms = scanTreeUri(ctx, treeUri, installedEmulators);

        JSArray romsArray = new JSArray();
        for (JSObject rom : roms) {
            romsArray.put(rom);
        }

        JSObject res = new JSObject();
        res.put("uri", treeUri.toString());
        res.put("roms", romsArray);
        res.put("count", roms.size());
        call.resolve(res);
    }

    @PluginMethod
    public void scanRomFolder(PluginCall call) {
        Context ctx = getContext();
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String savedTreeUri = prefs.getString(KEY_ROM_TREE_URI, null);

        if (savedTreeUri == null || savedTreeUri.isEmpty()) {
            JSObject res = new JSObject();
            res.put("uri", "");
            res.put("roms", new JSArray());
            res.put("count", 0);
            call.resolve(res);
            return;
        }

        Map<String, String> installedEmulators = getInstalledEmulatorsMap(ctx);
        List<JSObject> roms = scanTreeUri(ctx, Uri.parse(savedTreeUri), installedEmulators);

        JSArray romsArray = new JSArray();
        for (JSObject rom : roms) {
            romsArray.put(rom);
        }

        JSObject res = new JSObject();
        res.put("uri", savedTreeUri);
        res.put("roms", romsArray);
        res.put("count", roms.size());
        call.resolve(res);
    }

    @PluginMethod
    public void clearRomFolder(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().remove(KEY_ROM_TREE_URI).apply();
        JSObject res = new JSObject();
        res.put("ok", true);
        call.resolve(res);
    }

    @PluginMethod
    public void launchGame(PluginCall call) {
        String packageName = call.getString("packageName", "");
        String uriStr = call.getString("uri", "");
        String command = call.getString("command", "");

        Context ctx = getContext();
        PackageManager pm = ctx.getPackageManager();

        try {
            if (uriStr != null && !uriStr.isEmpty()) {
                Uri fileUri = Uri.parse(uriStr);
                String mime = ctx.getContentResolver().getType(fileUri);
                if (mime == null || mime.isEmpty()) {
                    mime = "application/octet-stream";
                }

                Intent viewIntent = new Intent(Intent.ACTION_VIEW);
                viewIntent.setDataAndType(fileUri, mime);
                viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);

                if (packageName != null && !packageName.isEmpty()) {
                    viewIntent.setPackage(packageName);
                    if (viewIntent.resolveActivity(pm) != null) {
                        ctx.startActivity(viewIntent);
                        call.resolve(new JSObject().put("ok", true));
                        return;
                    }
                    // Fallback: se o emulador nao responder com package direto, tenta sem setPackage
                    viewIntent.setPackage(null);
                }

                Intent chooser = Intent.createChooser(viewIntent, "Abrir ROM com emulador");
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(chooser);
                call.resolve(new JSObject().put("ok", true));
                return;
            }

            String targetPkg = (packageName != null && !packageName.isEmpty()) ? packageName : command;
            if (targetPkg != null && !targetPkg.isEmpty()) {
                Intent launchIntent = pm.getLaunchIntentForPackage(targetPkg);
                if (launchIntent != null) {
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(launchIntent);
                    call.resolve(new JSObject().put("ok", true));
                    return;
                }
            }

            call.reject("Nao foi possivel iniciar o aplicativo ou ROM.");
        } catch (Exception e) {
            call.reject("Erro ao iniciar jogo: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getDeviceStatus(PluginCall call) {
        Context ctx = getContext();
        JSArray devices = new JSArray();

        try {
            BatteryManager bm = (BatteryManager) ctx.getSystemService(Context.BATTERY_SERVICE);
            if (bm != null) {
                int level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);
                boolean charging = bm.isCharging();
                if (level >= 0 && level <= 100) {
                    JSObject dev = new JSObject();
                    dev.put("name", Build.MODEL != null ? Build.MODEL : "Dispositivo Android");
                    dev.put("type", "gamepad");
                    dev.put("percentage", level);
                    dev.put("charging", charging);
                    devices.put(dev);
                }
            }
        } catch (Exception ignored) {
        }

        JSObject res = new JSObject();
        res.put("devices", devices);
        call.resolve(res);
    }

    private boolean isEmulatorPackage(String pkg) {
        String lower = pkg.toLowerCase(Locale.ROOT);
        if (EMULATOR_PACKAGES.contains(lower)) return true;
        for (String kw : EMULATOR_KEYWORDS) {
            if (lower.contains(kw)) return true;
        }
        return false;
    }

    private Map<String, String> getInstalledEmulatorsMap(Context ctx) {
        Map<String, String> map = new HashMap<>();
        PackageManager pm = ctx.getPackageManager();
        for (ApplicationInfo app : pm.getInstalledApplications(0)) {
            if (isEmulatorPackage(app.packageName)) {
                map.put(app.packageName.toLowerCase(Locale.ROOT), app.packageName);
            }
        }
        return map;
    }

    private List<JSObject> scanTreeUri(Context ctx, Uri treeUri, Map<String, String> installedEmulators) {
        List<JSObject> results = new ArrayList<>();
        ContentResolver resolver = ctx.getContentResolver();
        String rootDocId = DocumentsContract.getTreeDocumentId(treeUri);
        scanDirectoryRecursive(resolver, treeUri, rootDocId, 0, installedEmulators, results);
        return results;
    }

    private void scanDirectoryRecursive(
            ContentResolver resolver,
            Uri treeUri,
            String docId,
            int depth,
            Map<String, String> installedEmulators,
            List<JSObject> out
    ) {
        if (depth > 3 || out.size() >= 300) return;

        Uri childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, docId);
        String[] projection = new String[]{
                DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                DocumentsContract.Document.COLUMN_MIME_TYPE
        };

        try (Cursor cursor = resolver.query(childrenUri, projection, null, null, null)) {
            if (cursor == null) return;
            while (cursor.moveToNext() && out.size() < 300) {
                String childDocId = cursor.getString(0);
                String name = cursor.getString(1);
                String mime = cursor.getString(2);

                if (name == null) continue;
                if (DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)) {
                    scanDirectoryRecursive(resolver, treeUri, childDocId, depth + 1, installedEmulators, out);
                    continue;
                }

                int dotIdx = name.lastIndexOf('.');
                if (dotIdx <= 0 || dotIdx == name.length() - 1) continue;
                String ext = name.substring(dotIdx + 1).toLowerCase(Locale.ROOT);
                if (!ROM_EXTENSIONS.contains(ext)) continue;

                Uri fileUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, childDocId);
                String cleanTitle = name.substring(0, dotIdx).replace('_', ' ').trim();
                String emuPkg = resolveEmulatorForExtension(ext, installedEmulators);
                String platformLabel = resolvePlatformLabel(ext);

                JSObject romObj = new JSObject();
                romObj.put("id", "android-rom:" + childDocId);
                romObj.put("title", cleanTitle);
                romObj.put("uri", fileUri.toString());
                romObj.put("packageName", emuPkg != null ? emuPkg : "");
                romObj.put("command", fileUri.toString());
                romObj.put("platform", platformLabel);
                romObj.put("genre", "ROM (" + ext.toUpperCase(Locale.ROOT) + ")");
                romObj.put("isRom", true);
                romObj.put("source", "android-rom");
                out.add(romObj);
            }
        } catch (Exception ignored) {
        }
    }

    private String resolvePlatformLabel(String ext) {
        switch (ext) {
            case "cso":
            case "pbp":
                return "PSP";
            case "nds":
                return "Nintendo DS";
            case "3ds":
                return "Nintendo 3DS";
            case "nsp":
            case "xci":
                return "Switch";
            case "gba":
                return "GBA";
            case "sfc":
            case "smc":
                return "SNES";
            case "nes":
                return "NES";
            case "z64":
            case "n64":
            case "v64":
                return "Nintendo 64";
            case "chd":
            case "bin":
            case "cue":
            case "iso":
            default:
                return "Console";
        }
    }

    private String resolveEmulatorForExtension(String ext, Map<String, String> emus) {
        List<String> candidates;
        switch (ext) {
            case "cso":
            case "pbp":
                candidates = Arrays.asList("org.ppsspp.ppssppgold", "org.ppsspp.ppsspp", "com.swordfish.lemuroid", "com.retroarch.aarch64", "com.retroarch");
                break;
            case "nds":
                candidates = Arrays.asList("com.dsemu.drastic", "com.swordfish.lemuroid", "com.retroarch.aarch64", "com.retroarch");
                break;
            case "3ds":
                candidates = Arrays.asList("io.github.lime3ds.android", "org.citra.citra_emu", "com.swordfish.lemuroid");
                break;
            case "nsp":
            case "xci":
                candidates = Arrays.asList("dev.sudachi.sudachi_emu", "org.suyu.suyu_emu", "org.yuzu.yuzu_emu");
                break;
            case "z64":
            case "n64":
            case "v64":
                candidates = Arrays.asList("org.mupen64plusae.v3.fzurita", "com.swordfish.lemuroid", "com.retroarch.aarch64", "com.retroarch");
                break;
            case "gba":
            case "sfc":
            case "smc":
            case "nes":
                candidates = Arrays.asList("com.swordfish.lemuroid", "com.retroarch.aarch64", "com.retroarch");
                break;
            case "iso":
            case "chd":
            case "bin":
            case "cue":
            default:
                candidates = Arrays.asList(
                        "com.github.stenzek.duckstation",
                        "xyz.aethersx2.android",
                        "org.ppsspp.ppssppgold",
                        "org.ppsspp.ppsspp",
                        "org.dolphinemu.dolphinemu",
                        "com.retroarch.aarch64",
                        "com.retroarch"
                );
                break;
        }
        for (String c : candidates) {
            if (emus.containsKey(c)) return emus.get(c);
        }
        return null;
    }

    private String drawableToBase64(Drawable drawable) {
        if (drawable == null) return "";
        try {
            Bitmap bitmap;
            if (drawable instanceof BitmapDrawable) {
                bitmap = ((BitmapDrawable) drawable).getBitmap();
            } else {
                int w = Math.max(1, Math.min(192, drawable.getIntrinsicWidth()));
                int h = Math.max(1, Math.min(192, drawable.getIntrinsicHeight()));
                bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
                Canvas canvas = new Canvas(bitmap);
                drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
                drawable.draw(canvas);
            }
            if (bitmap.getWidth() > 192 || bitmap.getHeight() > 192) {
                bitmap = Bitmap.createScaledBitmap(bitmap, 192, 192, true);
            }
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.PNG, 90, baos);
            String encoded = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
            return "data:image/png;base64," + encoded;
        } catch (Exception e) {
            return "";
        }
    }
}
