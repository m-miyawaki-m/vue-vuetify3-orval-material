package com.example.myapp

import com.example.myapp.db.AppDatabase
import com.example.myapp.db.ScanItemEntity
import com.example.myapp.db.ScanSetEntity
import com.example.myapp.db.ScanSetWithItems
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONObject

@CapacitorPlugin(name = "ScanRecord")
class ScanRecordPlugin : Plugin() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val dao by lazy { AppDatabase.get(context).scanRecordDao() }

    override fun handleOnDestroy() {
        scope.cancel()
    }

    /** DB 操作をコルーチンで実行し、例外は reject に変換する共通ラッパー */
    private fun PluginCall.launchDb(block: suspend () -> JSObject) {
        scope.launch {
            try {
                resolve(block())
            } catch (e: Exception) {
                reject(e.message ?: "DB エラー", e)
            }
        }
    }

    @PluginMethod
    fun createDraftSet(call: PluginCall) {
        val featureId = call.getString("featureId") ?: return call.reject("featureId は必須です")
        call.launchDb {
            val set = ScanSetEntity(
                id = UUID.randomUUID().toString(),
                featureId = featureId,
                status = "draft",
                createdAt = isoNow(),
                confirmedAt = null,
            )
            dao.insertSet(set)
            set.toJs()
        }
    }

    @PluginMethod
    fun addItem(call: PluginCall) {
        val setId = call.getString("setId") ?: return call.reject("setId は必須です")
        val seq = call.getInt("seq") ?: return call.reject("seq は必須です")
        val itemKey = call.getString("itemKey") ?: return call.reject("itemKey は必須です")
        val value = call.getString("value") ?: return call.reject("value は必須です")
        val format = call.getString("format") ?: return call.reject("format は必須です")
        call.launchDb {
            val item = ScanItemEntity(
                id = UUID.randomUUID().toString(),
                setId = setId,
                seq = seq,
                itemKey = itemKey,
                value = value,
                format = format,
                scannedAt = isoNow(),
            )
            dao.insertItem(item)
            item.toJs()
        }
    }

    @PluginMethod
    fun deleteSet(call: PluginCall) {
        val setId = call.getString("setId") ?: return call.reject("setId は必須です")
        call.launchDb {
            dao.deleteSet(setId)
            JSObject()
        }
    }

    @PluginMethod
    fun clearDrafts(call: PluginCall) {
        val featureId = call.getString("featureId") ?: return call.reject("featureId は必須です")
        call.launchDb {
            dao.clearDrafts(featureId)
            JSObject()
        }
    }

    @PluginMethod
    fun confirmCompletedDrafts(call: PluginCall) {
        val featureId = call.getString("featureId") ?: return call.reject("featureId は必須です")
        val requiredCount = call.getInt("requiredCount") ?: return call.reject("requiredCount は必須です")
        call.launchDb {
            val count = dao.confirmCompletedDrafts(featureId, requiredCount, isoNow())
            JSObject().apply { put("count", count) }
        }
    }

    @PluginMethod
    fun findDraftSets(call: PluginCall) {
        val featureId = call.getString("featureId") ?: return call.reject("featureId は必須です")
        call.launchDb {
            val sets = JSArray()
            dao.findDraftSets(featureId).forEach { sets.put(it.toJs()) }
            JSObject().apply { put("sets", sets) }
        }
    }

    @PluginMethod
    fun countDrafts(call: PluginCall) {
        call.launchDb {
            val counts = JSObject()
            dao.countDrafts().forEach { counts.put(it.featureId, it.cnt) }
            JSObject().apply { put("counts", counts) }
        }
    }

    @PluginMethod
    fun findLatestDraft(call: PluginCall) {
        call.launchDb {
            val latest = dao.findLatestDraft()
            JSObject().apply { put("set", latest?.toJs() ?: JSONObject.NULL) }
        }
    }

    /** JS の Date().toISOString() と同一形式（UTC・ミリ秒3桁） */
    private fun isoNow(): String {
        val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        fmt.timeZone = TimeZone.getTimeZone("UTC")
        return fmt.format(Date())
    }

    private fun ScanSetEntity.toJs(): JSObject = JSObject().apply {
        put("id", id)
        put("featureId", featureId)
        put("status", status)
        put("createdAt", createdAt)
        put("confirmedAt", confirmedAt ?: JSONObject.NULL)
    }

    private fun ScanItemEntity.toJs(): JSObject = JSObject().apply {
        put("id", id)
        put("setId", setId)
        put("seq", seq)
        put("itemKey", itemKey)
        put("value", value)
        put("format", format)
        put("scannedAt", scannedAt)
    }

    /** @Relation は並び順を保証しないため、ここで seq 昇順にソートする */
    private fun ScanSetWithItems.toJs(): JSObject = set.toJs().apply {
        val arr = JSArray()
        items.sortedBy { it.seq }.forEach { arr.put(it.toJs()) }
        put("items", arr)
    }
}
