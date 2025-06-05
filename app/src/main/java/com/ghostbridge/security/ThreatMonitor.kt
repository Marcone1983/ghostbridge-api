package com.ghostbridge.security

import android.app.ActivityManager
import android.content.Context
import android.os.Process
import kotlinx.coroutines.*
import java.io.File
import java.io.FileWriter
import java.text.SimpleDateFormat
import java.util.*

class ThreatMonitor(private val context: Context) {

    private val suspiciousProcesses = listOf("frida-server", "magisk", "xposed")
    private val quarantineDir = File(context.filesDir, "quarantine")
    private val logFile = File(context.filesDir, "security_log.txt")

    init {
        quarantineDir.mkdirs()
    }

    fun startMonitoring() {
        CoroutineScope(Dispatchers.IO).launch {
            while (true) {
                delay(3000)
                checkProcesses()
            }
        }
    }

    private fun checkProcesses() {
        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val runningAppProcesses = am.runningAppProcesses ?: return
        for (process in runningAppProcesses) {
            for (suspect in suspiciousProcesses) {
                if (process.processName.contains(suspect, ignoreCase = true)) {
                    logThreat(process.processName)
                    quarantineApp(process.processName)
                    triggerShutdown()
                }
            }
        }
    }

    private fun logThreat(processName: String) {
        val timeStamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date())
        FileWriter(logFile, true).use {
            it.appendLine("[$timeStamp] Suspicious process detected: $processName")
        }
    }

    private fun quarantineApp(processName: String) {
        val quarantineNote = File(quarantineDir, "quarantine_report.txt")
        FileWriter(quarantineNote, true).use {
            it.appendLine("Quarantined: $processName")
        }
    }

    private fun triggerShutdown() {
        android.os.Process.killProcess(Process.myPid())
        System.exit(1)
    }
}