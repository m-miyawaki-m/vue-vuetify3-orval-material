package com.example.myapp;

import com.example.myapp.sdk.SampleSdk;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SampleSdk")
public class SampleSdkPlugin extends Plugin {

    private final SampleSdk sdk = new SampleSdk();

    /** パターン①: 同期呼び出し。結果を Promise（call.resolve）で返す */
    @PluginMethod
    public void echo(PluginCall call) {
        String value = call.getString("value");
        if (value == null) {
            call.reject("value は必須です");
            return;
        }
        String result = sdk.echo(value);
        JSObject ret = new JSObject();
        ret.put("value", result);
        call.resolve(ret);
    }

    /** パターン②: イベント受信。SDK のコールバックを notifyListeners で JS へ流す */
    @PluginMethod
    public void echoAsync(PluginCall call) {
        String value = call.getString("value");
        if (value == null) {
            call.reject("value は必須です");
            return;
        }
        sdk.echoAsync(value, result -> {
            JSObject data = new JSObject();
            data.put("value", result);
            notifyListeners("echoResult", data);
        });
        call.resolve(); // 呼び出し自体は即完了。結果は echoResult イベントで届く
    }
}
