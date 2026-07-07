package com.example.myapp.sdk;

/** 社内 SDK を想定したダミー。受け取った値をそのまま返す。 */
public class SampleSdk {

    /** SDK からの非同期通知を受けるリスナー（実 SDK のコールバック相当） */
    public interface ResultListener {
        void onResult(String value);
    }

    /** 同期呼び出し: 値をそのまま返す */
    public String echo(String value) {
        return value;
    }

    /** 非同期呼び出し: 別スレッドで少し待ってからリスナーへ通知（デバイス応答を模擬） */
    public void echoAsync(String value, ResultListener listener) {
        new Thread(() -> {
            try {
                Thread.sleep(300);
            } catch (InterruptedException ignored) {
            }
            listener.onResult(value);
        }).start();
    }
}
