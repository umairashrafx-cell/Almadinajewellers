package com.almadinajeweller.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        /*
         * The app's own plugin, for the long-press shortcuts. Registered before
         * super.onCreate, which is where the bridge is built and the plugins it
         * knows about are loaded; one added afterwards would not exist to the
         * page. The npm plugins are found through capacitor.plugins.json and
         * need no line here.
         */
        registerPlugin(AppShortcutsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
