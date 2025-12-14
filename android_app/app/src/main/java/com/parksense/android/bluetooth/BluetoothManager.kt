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
    
    fun disconnect() {
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
    
    fun sendData(data: String): Boolean {
        return try {
            outputStream?.write(data.toByteArray())
            outputStream?.flush()
            true
        } catch (e: IOException) {
            Log.e(TAG, "Error sending data", e)
            false
        }
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
