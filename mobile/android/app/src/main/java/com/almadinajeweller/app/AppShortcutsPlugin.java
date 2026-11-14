package com.almadinajeweller.app;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * Hands the screen a long-press shortcut asked for to the bundled screens.
 *
 * The shortcuts themselves are res/xml/shortcuts.xml. Each opens MainActivity
 * with the screen's name in the "amj_view" extra, and this is the one place
 * that extra is read:
 *
 * - From a cold start, load() takes it off the launch intent and keeps it
 *   until the page asks with takePending(): the page is not there yet to be
 *   told, and an event fired before it was listening would be lost.
 * - With the app already open, MainActivity is singleTask, so Android brings
 *   it forward and delivers the shortcut's intent to onNewIntent; Capacitor
 *   passes that here, and the page is told through an "open" event.
 *
 * Only the four names the shortcuts use are passed on. Any other app can send
 * this exported activity an intent with whatever extra it likes, and the
 * extra decides nothing but which of the app's own screens to show, but there
 * is still no reason to forward a string nobody here wrote.
 *
 * Taken off the intent once read, so a launch intent that Android keeps and
 * re-delivers when the activity is recreated (after a rotation, or coming
 * back from the recents list) does not drag somebody back to the rate screen
 * long after they left it.
 *
 * Kept by R8 through Capacitor's own consumer rules: it extends Plugin and is
 * annotated, which is what those rules keep, names and methods intact.
 */
@CapacitorPlugin(name = "AppShortcuts")
public class AppShortcutsPlugin extends Plugin {

    static final String EXTRA = "amj_view";

    private static final Set<String> VIEWS = new HashSet<>(
        Arrays.asList("rate", "calculator", "pieces", "saved")
    );

    private String pending;

    @Override
    public void load() {
        if (getActivity() != null) pending = take(getActivity().getIntent());
    }

    /** The screen a cold start was asked for, once. Null when there was none. */
    @PluginMethod
    public void takePending(PluginCall call) {
        JSObject result = new JSObject();
        result.put("view", pending);
        pending = null;
        call.resolve(result);
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        String view = take(intent);
        if (view == null) return;

        JSObject data = new JSObject();
        data.put("view", view);
        notifyListeners("open", data);
    }

    private static String take(Intent intent) {
        if (intent == null) return null;
        String view = intent.getStringExtra(EXTRA);
        if (view == null) return null;
        intent.removeExtra(EXTRA);
        return VIEWS.contains(view) ? view : null;
    }
}
