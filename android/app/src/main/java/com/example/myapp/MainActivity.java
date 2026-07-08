package com.example.myapp;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SampleSdkPlugin.class); // アプリ内ローカルプラグインは自動登録されないため super より前に登録
        registerPlugin(ScanRecordPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
