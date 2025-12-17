package com.parksense.android.bluetooth

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.app.ActivityCompat
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.util.UUID

class BluetoothManager(private val context: Context) {
    
    companion object {
        private const val TAG = "BluetoothManager"
        // Standard SerialPortService ID for HC-05
        private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    }
    
    private val bluetoothAdapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()
    private var bluetoothSocket: BluetoothSocket? = null
    private var inputStream: InputStream? = null
    private var outputStream: OutputStream? = null
    private var connectedDevice: BluetoothDevice? = null
    
    private val discoveredDevices = mutableListOf<BluetoothDeviceInfo>()
    private var deviceDiscoveryCallback: ((List<BluetoothDeviceInfo>) -> Unit)? = null
    private var connectionCallback: ((Boolean, String?) -> Unit)? = null
    
    // Data handler callback for incoming Arduino responses
    private var dataHandler: ((String) -> Unit)? = null
    
    // Slot status callback for SLOT:<name>:<status> messages
    private var slotStatusHandler: ((slotName: String, status: String) -> Unit)? = null
    
    private val mainHandler = Handler(Looper.getMainLooper())
    
    // Reader thread for continuous data reception
    private var readerThread: Thread? = null
    private var isReading = false
    
    private val discoveryReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                BluetoothDevice.ACTION_FOUND -> {
                    val device: BluetoothDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                    }
                    
                    val rssi = intent.getShortExtra(BluetoothDevice.EXTRA_RSSI, Short.MIN_VALUE).toInt()
                    
                    device?.let {
                        if (hasBluetoothPermission()) {
                            val deviceInfo = BluetoothDeviceInfo(
                                name = it.name ?: "",
                                address = it.address,
                                isPaired = it.bondState == BluetoothDevice.BOND_BONDED,
                                rssi = if (rssi != Short.MIN_VALUE.toInt()) rssi else null
                            )
                            
                            // Avoid duplicates
                            if (!discoveredDevices.any { d -> d.address == deviceInfo.address }) {
                                discoveredDevices.add(deviceInfo)
                                deviceDiscoveryCallback?.invoke(discoveredDevices.toList())
                            }
                        }
                    }
                }
                BluetoothAdapter.ACTION_DISCOVERY_FINISHED -> {
                    Log.d(TAG, "Discovery finished. Found ${discoveredDevices.size} devices")
                }
            }
        }
    }
    
    init {
        // Register receiver for device discovery
        val filter = IntentFilter().apply {
            addAction(BluetoothDevice.ACTION_FOUND)
            addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED)
        }
        context.registerReceiver(discoveryReceiver, filter)
    }
    
    fun isBluetoothSupported(): Boolean = bluetoothAdapter != null
    
    fun isBluetoothEnabled(): Boolean = bluetoothAdapter?.isEnabled ?: false
    
    fun hasBluetoothPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ActivityCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
        } else {
            ActivityCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    fun hasLocationPermission(): Boolean {
        return ActivityCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
    }
    
    fun getPairedDevices(): List<BluetoothDeviceInfo> {
        if (!hasBluetoothPermission()) return emptyList()
        
        return try {
            bluetoothAdapter?.bondedDevices?.map { device ->
                BluetoothDeviceInfo(
                    name = device.name ?: "",
                    address = device.address,
                    isPaired = true
                )
            } ?: emptyList()
        } catch (e: SecurityException) {
            Log.e(TAG, "Security exception getting paired devices", e)
            emptyList()
        }
    }
    
    fun startDiscovery(callback: (List<BluetoothDeviceInfo>) -> Unit) {
        if (!hasBluetoothPermission() || !hasLocationPermission()) {
            Log.e(TAG, "Missing permissions for device discovery")
            return
        }
        
        discoveredDevices.clear()
        deviceDiscoveryCallback = callback
        
        try {
            // Cancel any ongoing discovery
            bluetoothAdapter?.cancelDiscovery()
            
            // Add paired devices first
            discoveredDevices.addAll(getPairedDevices())
            callback(discoveredDevices.toList())
            
            // Start new discovery
            val started = bluetoothAdapter?.startDiscovery() ?: false
            Log.d(TAG, "Discovery started: $started")
        } catch (e: SecurityException) {
            Log.e(TAG, "Security exception starting discovery", e)
        }
    }
    
    fun stopDiscovery() {
        if (!hasBluetoothPermission()) return
        
        try {
            bluetoothAdapter?.cancelDiscovery()
        } catch (e: SecurityException) {
            Log.e(TAG, "Security exception stopping discovery", e)
        }
    }
    
    fun isDiscovering(): Boolean {
        return try {
            if (hasBluetoothPermission()) {
                bluetoothAdapter?.isDiscovering ?: false
            } else {
                false
            }
        } catch (e: SecurityException) {
            false
        }
    }
    
    /**
     * Set callback for handling incoming data from Arduino
     */
    fun setDataHandler(handler: (String) -> Unit) {
        dataHandler = handler
    }
    
    /**
     * Set callback for handling slot status updates (SLOT:<name>:<status>)
     */
    fun setSlotStatusHandler(handler: (slotName: String, status: String) -> Unit) {
        slotStatusHandler = handler
    }
    
    fun connectToDevice(deviceAddress: String, callback: (Boolean, String?) -> Unit) {
        connectionCallback = callback
        
        if (!hasBluetoothPermission()) {
            callback(false, "Bluetooth permission not granted")
            return
        }
        
        Thread {
            try {
                // Cancel discovery to improve connection reliability
                bluetoothAdapter?.cancelDiscovery()
                
                // Get the device
                val device = bluetoothAdapter?.getRemoteDevice(deviceAddress)
                if (device == null) {
                    callback(false, "Device not found")
                    return@Thread
                }
                
                // Close existing connection if any
                disconnect()
                
                // Create socket and connect
                bluetoothSocket = device.createRfcommSocketToServiceRecord(SPP_UUID)
                bluetoothSocket?.connect()
                
                // Get streams
                inputStream = bluetoothSocket?.inputStream
                outputStream = bluetoothSocket?.outputStream
                
                connectedDevice = device
                
                Log.d(TAG, "Connected to ${device.name ?: device.address}")
                
                // Start the reader loop (from professor's code)
                startReaderLoop()
                
                callback(true, null)
                
            } catch (e: IOException) {
                Log.e(TAG, "Connection failed", e)
                disconnect()
                callback(false, e.message ?: "Connection failed")
            } catch (e: SecurityException) {
                Log.e(TAG, "Security exception during connection", e)
                callback(false, "Bluetooth permission denied")
            }
        }.start()
    }
    
    /**
     * Reader loop from professor's code - continuously reads incoming data
     */
    private fun startReaderLoop() {
        isReading = true
        readerThread = Thread {
            val buffer = ByteArray(1024)
            val sb = StringBuilder()
            try {
                while (isReading && inputStream != null) {
                    val bytesRead = inputStream!!.read(buffer)
                    if (bytesRead > 0) {
                        val s = String(buffer, 0, bytesRead)
                        sb.append(s)
                        
                        // Process complete lines (newline-terminated)
                        var idx = sb.indexOf("\n")
                        while (idx != -1) {
                            val line = sb.substring(0, idx).trim()
                            sb.delete(0, idx + 1)
                            handleLine(line)
                            idx = sb.indexOf("\n")
                        }
                    } else {
                        Thread.sleep(50)
                    }
                }
            } catch (e: IOException) {
                Log.e(TAG, "Reader loop error", e)
                mainHandler.post {
                    dataHandler?.invoke("ERR:Connection lost")
                }
            } catch (e: InterruptedException) {
                Log.d(TAG, "Reader thread interrupted")
            }
        }
        readerThread?.start()
    }
    
    /**
     * Handle incoming data lines from Arduino (adapted from professor's code)
     * Parses SLOT:<name>:<status> messages for real-time updates
     */
    private fun handleLine(line: String) {
        Log.d(TAG, "Received: $line")
        
        // Parse SLOT:<name>:<status> messages
        if (line.startsWith("SLOT:")) {
            val parts = line.split(":")
            if (parts.size >= 3) {
                val slotName = parts[1]
                val status = parts[2].lowercase()
                Log.d(TAG, "Parsed slot update: $slotName -> $status")
                mainHandler.post {
                    slotStatusHandler?.invoke(slotName, status)
                }
            }
        }
        
        // Always pass raw data to general handler
        mainHandler.post {
            dataHandler?.invoke(line)
        }
    }
    
    fun disconnect() {
        isReading = false
        readerThread?.interrupt()
        readerThread = null
        
        try {
            inputStream?.close()
            outputStream?.close()
            bluetoothSocket?.close()
        } catch (e: IOException) {
            Log.e(TAG, "Error closing connection", e)
        } finally {
            inputStream = null
            outputStream = null
            bluetoothSocket = null
            connectedDevice = null
        }
    }
    
    fun isConnected(): Boolean = bluetoothSocket?.isConnected ?: false
    
    fun getConnectedDeviceName(): String? {
        return try {
            if (hasBluetoothPermission()) {
                connectedDevice?.name
            } else {
                null
            }
        } catch (e: SecurityException) {
            null
        }
    }
    
    fun getConnectedDeviceAddress(): String? = connectedDevice?.address
    
    /**
     * Send raw data to Arduino
     */
    fun sendData(data: String): Boolean {
        return try {
            outputStream?.write(data.toByteArray())
            outputStream?.flush()
            Log.d(TAG, "Sent: $data")
            true
        } catch (e: IOException) {
            Log.e(TAG, "Error sending data", e)
            false
        }
    }
    
    /**
     * Send command with newline terminator (standard Arduino protocol)
     */
    fun sendCommand(command: String): Boolean {
        val cmd = if (command.endsWith("\n")) command else "$command\n"
        return sendData(cmd)
    }
    
    // ============================================
    // PARKING-SPECIFIC COMMANDS (matching React Native)
    // ============================================
    
    /**
     * Send PING command to flash LED 5 times on specified slot
     */
    fun pingSlot(slotName: String): Boolean {
        Log.d(TAG, "Sending PING command for: $slotName")
        return sendCommand("PING:$slotName")
    }
    
    /**
     * Send DISABLE command for a parking slot
     */
    fun disableSlot(slotName: String): Boolean {
        Log.d(TAG, "Sending DISABLE command for: $slotName")
        return sendCommand("DISABLE:$slotName")
    }
    
    /**
     * Send ENABLE command for a parking slot
     */
    fun enableSlot(slotName: String): Boolean {
        Log.d(TAG, "Sending ENABLE command for: $slotName")
        return sendCommand("ENABLE:$slotName")
    }
    
    /**
     * Request sensor reading (similar to professor's READ_DIST)
     */
    fun requestSensorReading(slotName: String): Boolean {
        return sendCommand("READ:$slotName")
    }
    
    /**
     * Send servo angle command (from professor's code)
     */
    fun sendServoAngle(angle: Int): Boolean {
        return sendCommand("SERVO:$angle")
    }
    
    /**
     * Send LCD text command (from professor's code)
     */
    fun sendLCDText(text: String): Boolean {
        val truncated = text.take(16) // LCD typically 16 chars
        return sendCommand("LCD:$truncated")
    }
    
    /**
     * Request distance reading (from professor's code)
     */
    fun requestDistance(): Boolean {
        return sendCommand("READ_DIST")
    }
    
    fun readData(buffer: ByteArray): Int {
        return try {
            inputStream?.read(buffer) ?: -1
        } catch (e: IOException) {
            Log.e(TAG, "Error reading data", e)
            -1
        }
    }
    
    fun cleanup() {
        try {
            stopDiscovery()
            disconnect()
            context.unregisterReceiver(discoveryReceiver)
        } catch (e: Exception) {
            Log.e(TAG, "Error during cleanup", e)
        }
    }
}

